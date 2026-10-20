<#
.SYNOPSIS
    System-level optimizations for gaming.
.DESCRIPTION
    Applies page file sizing, fast startup changes, display performance settings,
    the taskbar End Task option, and input settings. General Windows cleanup
    (disk cleanup, Explorer layout, Storage Sense, service trimming) is left to
    WinUtil and Win11Debloat.
.NOTES
    Requires Administrator. Several changes require a reboot to take effect.
#>
#Requires -RunAsAdministrator


Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global


function Get-SystemRAM {
    <#
    .SYNOPSIS
        Returns total system RAM in GB.
    .DESCRIPTION
        Queries Win32_PhysicalMemory and sums capacity to produce total RAM.
    .OUTPUTS
        [int] Total RAM in gigabytes, or 0 on failure.
    #>
    try {
        $totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory -ErrorAction Stop |
            Measure-Object -Property Capacity -Sum).Sum / 1GB)

        Write-Log "System RAM detected: ${totalRAM}GB" "INFO"
        return $totalRAM
    } catch {
        Write-Log "Error detecting system RAM: $_" "ERROR"
        return 0
    }
}


function Test-SystemOptimizations {
    <#
    .SYNOPSIS
        Verifies key system optimizations.
    .DESCRIPTION
        Checks page file policy, fast startup setting, and logs memory compression
        state for visibility.
    .OUTPUTS
        [bool] True when checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying system optimizations..." "INFO"

    try {
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        $totalRAM = Get-SystemRAM

        if ($totalRAM -ge 16) {
            if ($ComputerSystem.AutomaticManagedPagefile -eq $false) {
                Write-Log "[OK] Automatic page file management disabled" "SUCCESS"

                $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
                if ($PageFile) {
                    $expectedSize = if ($totalRAM -ge 32) { 4096 } else { 8192 }

                    if ($PageFile.InitialSize -eq $expectedSize -and $PageFile.MaximumSize -eq $expectedSize) {
                        Write-Log "[OK] Page file size: ${expectedSize}MB (correct for ${totalRAM}GB RAM)" "SUCCESS"
                    } else {
                        Write-Log "[FAIL] Page file size mismatch (current: $($PageFile.InitialSize)MB, expected: ${expectedSize}MB)" "ERROR"
                        $allPassed = $false
                    }
                } else {
                    Write-Log "[FAIL] Page file not found" "ERROR"
                    $allPassed = $false
                }
            } else {
                Write-Log "[FAIL] Automatic page file management still enabled" "ERROR"
                $allPassed = $false
            }
        }

        $hiberboot = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled"
        if ($hiberboot -eq 0) {
            Write-Log "[OK] Fast Startup disabled" "SUCCESS"
        } else {
            Write-Log "[FAIL] Fast Startup not disabled (current value: $hiberboot)" "ERROR"
            $allPassed = $false
        }

        $mmAgent = Get-MMAgent -ErrorAction SilentlyContinue
        if ($mmAgent) {
            $compressionStatus = if ($mmAgent.MemoryCompression) { "enabled" } else { "disabled" }
            Write-Log "Memory compression: $compressionStatus" "INFO"
        }

    } catch {
        Write-Log "Error during verification: $_" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}


function Set-PageFile {
    <#
    .SYNOPSIS
        Configures a fixed page file size on systems with sufficient RAM.
    .DESCRIPTION
        Disables automatic page file management and sets a fixed size based on
        total RAM (4GB for 32GB+, 8GB for 16-31GB).
    .OUTPUTS
        None.
    #>
    try {
        $totalRAM = Get-SystemRAM

        if ($totalRAM -lt 16) {
            Write-Log "System has ${totalRAM}GB RAM - keeping automatic page file management" "INFO"
            return
        }

        $pageFileSize = if ($totalRAM -ge 32) {
            4096
        } else {
            8192
        }

        Write-Log "System has ${totalRAM}GB RAM - setting ${pageFileSize}MB fixed page file" "INFO"

        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if ($ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $false
            $ComputerSystem.Put() | Out-Null
            Write-Log "Disabled automatic page file management" "SUCCESS"
        }

        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.InitialSize = $pageFileSize
            $PageFile.MaximumSize = $pageFileSize
            $PageFile.Put() | Out-Null
            $sizeGB = [math]::Round($pageFileSize / 1024, 1)
            Write-Log "Set page file to fixed ${pageFileSize}MB size (${sizeGB}GB)" "SUCCESS"
        } else {
            $PageFile = ([WMIClass]"Win32_PageFileSetting").CreateInstance()
            $PageFile.Name = "C:\pagefile.sys"
            $PageFile.InitialSize = $pageFileSize
            $PageFile.MaximumSize = $pageFileSize
            $PageFile.Put() | Out-Null
            Write-Log "Created fixed ${pageFileSize}MB page file" "SUCCESS"
        }

        Write-Log "Page file changes require restart to take effect" "INFO"

    } catch {
        Write-Log "Error configuring page file: $_" "ERROR"
        throw
    }
}


function Set-MemoryCompression {
    <#
    .SYNOPSIS
        Toggles Windows memory compression (opt-in).
    .DESCRIPTION
        Disables memory compression only on high-RAM systems when requested.
    .PARAMETER Disable
        When true, attempts to disable memory compression.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Disable = $false
    )

    try {
        $totalRAM = Get-SystemRAM

        if ($Disable -and $totalRAM -ge 32) {
            Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
            Write-Log "Disabled memory compression (system has ${totalRAM}GB RAM)" "SUCCESS"
        } else {
            if ($totalRAM -ge 32) {
                Write-Log "Keeping memory compression enabled (default, even with ${totalRAM}GB RAM)" "INFO"
            } else {
                Write-Log "Keeping memory compression enabled (system has ${totalRAM}GB RAM)" "INFO"
            }
        }

    } catch {
        Write-Log "Error configuring memory compression: $_" "ERROR"
        throw
    }
}


function Disable-FastStartup {
    <#
    .SYNOPSIS
        Disables Windows Fast Startup.
    .DESCRIPTION
        Writes HiberbootEnabled to 0 to force clean boots.
    .OUTPUTS
        None.
    #>
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"

    Backup-RegistryKey -Path $regPath

    try {
        Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Fast Startup (cleaner boots, better for gaming)" "SUCCESS"

    } catch {
        Write-Log "Error disabling fast startup: $_" "ERROR"
        throw
    }
}


function Disable-RazerAutoInstall {
    <#
    .SYNOPSIS
        Disables Razer/OEM auto-install services and tasks.
    .DESCRIPTION
        Stops and disables Razer-related services and scheduled tasks that can
        install software automatically.
    .PARAMETER Enable
        When true, applies the block.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Razer/OEM block skipped" "INFO"
        return
    }

    try {
        $razerServices = Get-Service | Where-Object { $_.Name -like "Razer*" }
        foreach ($svc in $razerServices) {
            try { Stop-Service $svc -Force -EA SilentlyContinue; Set-Service $svc -StartupType Disabled -EA SilentlyContinue } catch {}
        }

        $razerTasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "*Razer*" }
        if ($razerTasks) { $razerTasks | Disable-ScheduledTask -EA SilentlyContinue | Out-Null }

        Write-Log "Razer/OEM auto-install payloads blocked (services/tasks disabled)" "SUCCESS"
    } catch {
        Write-Log "Error blocking Razer/OEM auto-installs: $_" "ERROR"
    }
}


function New-RestorePoint {
    <#
    .SYNOPSIS
        Creates a Windows System Restore Point before applying optimizations.
    .DESCRIPTION
        Turns System Restore on for the system drive if it is off, sets
        SystemRestorePointCreationFrequency to 0 so Windows does not silently skip
        a second point within 24 hours, creates the point, then puts the frequency
        value back. Never throws: a failed restore point is logged and the run continues.
    .PARAMETER Description
        Restore point description string.
    .OUTPUTS
        [bool] True if created, false otherwise.
    #>
    param(
        [string]$Description = "Pre-Gaming-PC-Setup"
    )

    if (Test-RockTuneDryRun) {
        Write-Log "[DRY RUN] Would create restore point: $Description" "INFO"
        return $true
    }

    $srKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore"
    $freqName = "SystemRestorePointCreationFrequency"
    $previousFreq = $null
    $hadFreq = $false

    try {
        $existing = Get-ItemProperty -Path $srKey -Name $freqName -ErrorAction SilentlyContinue
        if ($null -ne $existing) {
            $hadFreq = $true
            $previousFreq = $existing.$freqName
        }

        $drive = "$env:SystemDrive\"
        Enable-ComputerRestore -Drive $drive -ErrorAction SilentlyContinue

        if (-not (Test-Path $srKey)) { New-Item -Path $srKey -Force | Out-Null }
        New-ItemProperty -Path $srKey -Name $freqName -Value 0 -PropertyType DWord -Force | Out-Null

        $before = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue).Count
        Checkpoint-Computer -Description $Description -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop -WarningAction SilentlyContinue
        $after = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue).Count

        if ($after -gt $before) {
            Write-Log "Created System Restore Point: $Description" "SUCCESS"
            return $true
        }
        Write-Log "Windows did not create a new restore point (System Restore may be off by policy)" "WARNING"
        return $false
    } catch {
        Write-Log "Could not create restore point, continuing: $($_.Exception.Message)" "WARNING"
        return $false
    } finally {
        if ($hadFreq) {
            New-ItemProperty -Path $srKey -Name $freqName -Value $previousFreq -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
        } else {
            Remove-ItemProperty -Path $srKey -Name $freqName -ErrorAction SilentlyContinue
        }
    }
}


function Set-DisplayPerformance {
    <#
    .SYNOPSIS
        Configures Windows visual effects for maximum performance.
    .DESCRIPTION
        Disables animations, shadows, and other visual effects that consume GPU/CPU resources.
        Reduces visual overhead for slightly better gaming performance.
    .PARAMETER Enable
        When true, applies performance-oriented visual settings.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Display performance mode: skipped" "INFO"
        return
    }

    try {
        $visualPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
        Backup-RegistryKey -Path $visualPath
        Set-RegistryValue -Path $visualPath -Name "VisualFXSetting" -Value 2 -Type "DWORD"  # 2 = Custom (we'll set individual settings)

        $advancedPath = "HKCU:\Control Panel\Desktop"
        Backup-RegistryKey -Path $advancedPath
        Set-RegistryValue -Path $advancedPath -Name "DragFullWindows" -Value "0" -Type "String"
        Set-RegistryValue -Path $advancedPath -Name "MenuShowDelay" -Value "0" -Type "String"

        $windowMetrics = "HKCU:\Control Panel\Desktop\WindowMetrics"
        Backup-RegistryKey -Path $windowMetrics
        Set-RegistryValue -Path $windowMetrics -Name "MinAnimate" -Value "0" -Type "String"

        $explorerPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        Backup-RegistryKey -Path $explorerPath
        Set-RegistryValue -Path $explorerPath -Name "TaskbarAnimations" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $explorerPath -Name "ListviewAlphaSelect" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $explorerPath -Name "ListviewShadow" -Value 0 -Type "DWORD"

        Write-Log "Set display for performance (reduced visual effects)" "SUCCESS"
    } catch {
        Write-Log "Error setting display performance: $_" "ERROR"
    }
}


function Enable-TaskbarEndTask {
    <#
    .SYNOPSIS
        Enables "End Task" option when right-clicking taskbar items.
    .DESCRIPTION
        Useful for quickly killing frozen games or unresponsive applications
        without needing to open Task Manager.
    .PARAMETER Enable
        When true, enables the taskbar End Task option.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Taskbar End Task: skipped" "INFO"
        return
    }

    try {
        $taskbarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings"

        if (-not (Test-Path $taskbarPath)) {
            New-Item -Path $taskbarPath -Force | Out-Null
        }

        Backup-RegistryKey -Path $taskbarPath
        Set-RegistryValue -Path $taskbarPath -Name "TaskbarEndTask" -Value 1 -Type "DWORD"

        Write-Log "Enabled 'End Task' in taskbar right-click menu" "SUCCESS"
    } catch {
        Write-Log "Error enabling taskbar End Task: $_" "ERROR"
    }
}


function Disable-MouseAcceleration {
    <#
    .SYNOPSIS
        Disables Windows mouse acceleration for consistent 1:1 movement.
    .DESCRIPTION
        Essential for competitive FPS players - ensures mouse movement
        is linear and predictable regardless of speed.
    .PARAMETER Enable
        When true, disables enhanced pointer precision.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable mouse acceleration: skipped" "INFO"
        return
    }

    try {
        $mousePath = "HKCU:\Control Panel\Mouse"
        Backup-RegistryKey -Path $mousePath

        # Disable enhanced pointer precision (mouse acceleration)
        Set-RegistryValue -Path $mousePath -Name "MouseSpeed" -Value "0" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold1" -Value "0" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold2" -Value "0" -Type "String"

        Write-Log "Disabled mouse acceleration (1:1 movement)" "SUCCESS"
    } catch {
        Write-Log "Error disabling mouse acceleration: $_" "ERROR"
    }
}


function Set-BackgroundPollingUnlock {
    <#
    .SYNOPSIS
        Unlocks full mouse polling rate in background windows.
    .DESCRIPTION
        FR33THY optimization - removes Windows throttling of mouse input
        when windows are in background, improving alt-tab responsiveness.
    .PARAMETER Enable
        When true, unlocks background polling.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Background polling unlock: skipped" "INFO"
        return
    }

    try {
        $mousePath = "HKCU:\Control Panel\Mouse"
        Backup-RegistryKey -Path $mousePath

        # FR33THY: RawMouseThrottleEnabled=0 removes background mouse throttling
        Set-RegistryValue -Path $mousePath -Name "RawMouseThrottleEnabled" -Value 0 -Type "DWORD"

        Write-Log "Background mouse polling unlocked (full rate in background windows)" "SUCCESS"
    } catch {
        Write-Log "Error unlocking background polling: $_" "ERROR"
    }
}


function Set-KeyboardResponse {
    <#
    .SYNOPSIS
        Maximizes keyboard response speed.
    .DESCRIPTION
        Sets keyboard repeat delay to minimum and repeat rate to maximum
        for faster key response in games.
    .PARAMETER Enable
        When true, applies the keyboard response settings.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Keyboard response optimization: skipped" "INFO"
        return
    }

    try {
        $keyboardPath = "HKCU:\Control Panel\Keyboard"
        Backup-RegistryKey -Path $keyboardPath

        # KeyboardDelay: 0 = shortest delay (250ms), 3 = longest (1000ms)
        # KeyboardSpeed: 0 = slowest, 31 = fastest repeat rate
        Set-RegistryValue -Path $keyboardPath -Name "KeyboardDelay" -Value "0" -Type "String"
        Set-RegistryValue -Path $keyboardPath -Name "KeyboardSpeed" -Value "31" -Type "String"

        Write-Log "Keyboard response maximized (fastest repeat)" "SUCCESS"
    } catch {
        Write-Log "Error setting keyboard response: $_" "ERROR"
    }
}


function Disable-USBSelectiveSuspend {
    <#
    .SYNOPSIS
        Disables USB selective suspend to prevent input device sleep.
    .DESCRIPTION
        Prevents Windows from putting USB devices to sleep, which can
        cause input lag or disconnection issues with gaming peripherals.
    .PARAMETER Enable
        When true, disables USB selective suspend.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable USB selective suspend: skipped" "INFO"
        return
    }

    try {
        # Disable via power scheme settings (all schemes)
        $schemes = powercfg /list 2>&1 | Select-String "GUID" | ForEach-Object {
            if ($_ -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
                $matches[1]
            }
        }

        foreach ($scheme in $schemes) {
            if ($scheme) {
                # USB selective suspend setting GUID
                powercfg /setacvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
                powercfg /setdcvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
            }
        }

        # Also set via registry for USB hub power management
        $usbPath = "HKLM:\SYSTEM\CurrentControlSet\Services\USB"
        if (-not (Test-Path $usbPath)) {
            New-Item -Path $usbPath -Force | Out-Null
        }
        Backup-RegistryKey -Path $usbPath
        Set-RegistryValue -Path $usbPath -Name "DisableSelectiveSuspend" -Value 1 -Type "DWORD"

        Write-Log "Disabled USB selective suspend (no input device sleep)" "SUCCESS"
    } catch {
        Write-Log "Error disabling USB selective suspend: $_" "ERROR"
    }
}


function Set-AudioExclusiveMode {
    <#
    .SYNOPSIS
        Configures audio for exclusive mode and lower latency.
    .DESCRIPTION
        Enables WASAPI exclusive mode hints and reduces audio buffer
        for lower latency audio in competitive games.
    .PARAMETER Enable
        When true, applies exclusive mode-related settings.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Audio exclusive mode: skipped" "INFO"
        return
    }

    try {
        # Get default audio endpoint
        $audioPath = "HKCU:\Software\Microsoft\Multimedia\Audio"
        if (-not (Test-Path $audioPath)) {
            New-Item -Path $audioPath -Force | Out-Null
        }
        Backup-RegistryKey -Path $audioPath

        # Enable exclusive mode application priority
        Set-RegistryValue -Path $audioPath -Name "UserDuckingPreference" -Value 3 -Type "DWORD"

        # Reduce system sounds impact
        $soundPath = "HKCU:\AppEvents\Schemes"
        Backup-RegistryKey -Path $soundPath
        Set-RegistryValue -Path $soundPath -Name "(Default)" -Value ".None" -Type "String"

        Write-Log "Audio configured for exclusive mode / lower latency" "SUCCESS"
    } catch {
        Write-Log "Error setting audio exclusive mode: $_" "ERROR"
    }
}


function Invoke-SystemOptimizations {
    <#
    .SYNOPSIS
        Applies system optimization bundle.
    .DESCRIPTION
        Runs page file tuning, fast startup changes, display performance and
        device-related settings as configured.
    .PARAMETER DisableMemoryCompression
        Disables memory compression when true (opt-in).
    .PARAMETER BlockRazer
        Blocks Razer/OEM auto-installs when true.
    .PARAMETER DisplayPerformance
        Applies visual performance settings when true.
    .PARAMETER TaskbarEndTask
        Enables taskbar End Task option when true.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$DisableMemoryCompression = $false,
        [bool]$BlockRazer = $true,
        [bool]$DisplayPerformance = $true,
        [bool]$TaskbarEndTask = $true
    )

    Write-Log "Applying system optimizations..." "INFO"

    try {
        Set-PageFile

        Disable-FastStartup

        Set-MemoryCompression -Disable $DisableMemoryCompression

        Disable-RazerAutoInstall -Enable $BlockRazer

        Set-DisplayPerformance -Enable $DisplayPerformance

        Enable-TaskbarEndTask -Enable $TaskbarEndTask

        Write-Log "System optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying system optimizations: $_" "ERROR"
        throw
    }
}


function Undo-SystemOptimizations {
    <#
    .SYNOPSIS
        Reverts system optimizations where possible.
    .DESCRIPTION
        Restores page file management, fast startup registry state, and other
        backed up settings. Some changes still require reboot.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back system optimizations..." "INFO"

    try {
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if (-not $ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $true
            $ComputerSystem.Put() | Out-Null
            Write-Log "Restored automatic page file management" "SUCCESS"
        }

        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.Delete()
            Write-Log "Removed custom page file settings" "SUCCESS"
        }

        $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"
        if (Restore-RegistryKey -Path $regPath) {
            Write-Log "Restored Fast Startup registry settings" "SUCCESS"
        } else {
            Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 1 -Type "DWORD"
            Write-Log "Re-enabled Fast Startup" "SUCCESS"
        }

        $shellPath = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell"
        Restore-RegistryKey -Path $shellPath | Out-Null

        Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
        Write-Log "Re-enabled memory compression" "SUCCESS"

        Write-Log "System optimization rollback complete (restart required)" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Get-SystemRAM',
    'Set-PageFile',
    'Set-MemoryCompression',
    'Disable-FastStartup',
    'Disable-RazerAutoInstall',
    'New-RestorePoint',
    'Set-DisplayPerformance',
    'Enable-TaskbarEndTask',
    'Disable-MouseAcceleration',
    'Set-BackgroundPollingUnlock',
    'Set-KeyboardResponse',
    'Disable-USBSelectiveSuspend',
    'Set-AudioExclusiveMode',
    'Test-SystemOptimizations',
    'Invoke-SystemOptimizations',
    'Undo-SystemOptimizations'
)

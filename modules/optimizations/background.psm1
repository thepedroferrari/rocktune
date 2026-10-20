<#
.SYNOPSIS
    Turns off Windows features that run in the background while you play.
.DESCRIPTION
    Background Store apps, Copilot, notifications, Widgets, Recall and the other
    Windows AI services, and forced update reboots. Each one either uses CPU, disk
    or RAM during a game or interrupts it.
    General Windows cleanup (telemetry, app removal, ads, Edge, OneDrive, Bing) is
    not in RockTune. Use WinUtil (https://github.com/ChrisTitusTech/winutil) or
    Win11Debloat (https://github.com/Raphire/Win11Debloat) for that.
.NOTES
    Requires Administrator. Every registry value goes into the undo journal.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global


function Remove-AppxEverywhere {
    <#
    .SYNOPSIS
        Removes an appx package for all users and its provisioned copy. Honors dry-run.
    .OUTPUTS
        [bool] True if anything was removed (or would be, in dry-run).
    #>
    param([Parameter(Mandatory=$true)][string]$Name)

    $installed = @(Get-AppxPackage -AllUsers -Name $Name -ErrorAction SilentlyContinue)
    $provisioned = @(Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like $Name })
    if ($installed.Count -eq 0 -and $provisioned.Count -eq 0) {
        return $false
    }
    if (Test-RockTuneDryRun) {
        Write-Log "[DRY RUN] Would remove app: $Name" "INFO"
        return $true
    }
    foreach ($pkg in $installed) {
        try {
            Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction Stop
        } catch {
            Remove-AppxPackage -Package $pkg.PackageFullName -ErrorAction SilentlyContinue
        }
    }
    foreach ($prov in $provisioned) {
        Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -ErrorAction SilentlyContinue | Out-Null
    }
    try {
        $listPath = Join-Path (Split-Path (Get-UndoJournalPath) -Parent) "removed-apps.txt"
        Add-Content -Path $listPath -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $Name  (reinstall: winget search `"$Name`" or Microsoft Store)" -ErrorAction SilentlyContinue
    } catch {
        Write-Verbose "Could not append to removed-apps list"
    }
    return $true
}


function Set-BackgroundAppsOff {
    <#
    .SYNOPSIS
        Disables background UWP app activity.
    .DESCRIPTION
        Turns off background app access and related search toggles.
    .OUTPUTS
        None.
    #>
    try {
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        Backup-RegistryKey -Path $path
        Set-RegistryValue -Path $path -Name "GlobalUserDisabled" -Value 1 -Type "DWORD"

        $searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
        Backup-RegistryKey -Path $searchPath
        Set-RegistryValue -Path $searchPath -Name "BackgroundAppGlobalToggle" -Value 0 -Type "DWORD"

        Write-Log "Background Store apps disabled" "SUCCESS"
    } catch {
        Write-Log "Error disabling background apps: $_" "ERROR"
        throw
    }
}


function Disable-Copilot {
    <#
    .SYNOPSIS
        Disables Windows Copilot completely.
    .DESCRIPTION
        Applies 8 registry keys and removes Copilot AppX packages.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Disabling Copilot..." "INFO"

        # Policy keys (HKLM and HKCU) - most authoritative
        $policyCopilotLM = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        Backup-RegistryKey -Path $policyCopilotLM
        Set-RegistryValue -Path $policyCopilotLM -Name "TurnOffWindowsCopilot" -Value 1 -Type "DWORD"

        $policyCopilotCU = "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot"
        Backup-RegistryKey -Path $policyCopilotCU
        Set-RegistryValue -Path $policyCopilotCU -Name "TurnOffWindowsCopilot" -Value 1 -Type "DWORD"

        # UI visibility - hide button from taskbar
        $explorerAdvanced = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        Backup-RegistryKey -Path $explorerAdvanced
        Set-RegistryValue -Path $explorerAdvanced -Name "ShowCopilotButton" -Value 0 -Type "DWORD"

        # Availability flags
        $shellCopilot = "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot"
        Backup-RegistryKey -Path $shellCopilot
        Set-RegistryValue -Path $shellCopilot -Name "IsCopilotAvailable" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $shellCopilot -Name "CopilotDisabledReason" -Value "IsEnabledForGeographicRegionFailed" -Type "String"

        $windowsCopilot = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsCopilot"
        Backup-RegistryKey -Path $windowsCopilot
        Set-RegistryValue -Path $windowsCopilot -Name "AllowCopilotRuntime" -Value 0 -Type "DWORD"

        # Block shell extension
        $blockedExtensions = "HKLM:\SOFTWARE\Microsoft\Windows\Shell Extensions\Blocked"
        Backup-RegistryKey -Path $blockedExtensions
        Set-RegistryValue -Path $blockedExtensions -Name "{CB3B0003-8088-4EDE-8769-8B354AB2FF8C}" -Value "" -Type "String"

        # BingChat eligibility
        $bingChat = "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot\BingChat"
        Backup-RegistryKey -Path $bingChat
        Set-RegistryValue -Path $bingChat -Name "IsUserEligible" -Value 0 -Type "DWORD"

        # Remove Copilot AppX packages
        Write-Log "Removing Copilot packages..." "INFO"
        foreach ($copilotApp in @("Microsoft.Copilot", "Microsoft.Windows.Ai.Copilot.Provider", "Microsoft.MicrosoftOfficeHub")) {
            [void](Remove-AppxEverywhere -Name $copilotApp)
        }

        Write-Log "Copilot disabled and packages removed" "SUCCESS"
    } catch {
        Write-Log "Error disabling Copilot: $_" "ERROR"
        throw
    }
}


function Disable-Notifications {
    <#
    .SYNOPSIS
        Disables Windows notification center and toast notifications.
    .DESCRIPTION
        Prevents popup distractions during gaming sessions.
        Disables both the notification center and individual toast popups.
    .PARAMETER Enable
        When true, disables notifications.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable notifications: skipped" "INFO"
        return
    }

    try {
        # Disable Notification Center
        $notifPath = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
        Backup-RegistryKey -Path $notifPath
        Set-RegistryValue -Path $notifPath -Name "DisableNotificationCenter" -Value 1 -Type "DWORD"

        # Disable toast notifications
        $toastPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
        Backup-RegistryKey -Path $toastPath
        Set-RegistryValue -Path $toastPath -Name "ToastEnabled" -Value 0 -Type "DWORD"

        # Disable lock screen notifications
        $lockPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
        Backup-RegistryKey -Path $lockPath
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_CRITICAL_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"

        Write-Log "Disabled notifications (no popups during gaming)" "SUCCESS"
    } catch {
        Write-Log "Error disabling notifications: $_" "ERROR"
    }
}


function Disable-WindowsAI {
    <#
    .SYNOPSIS
        Turns off Recall, Click to Do, the AI Fabric service, and Notepad/Paint AI.
    .DESCRIPTION
        Uses the WindowsAI policy CSP values documented on MS Learn. The
        TurnOffWindowsCopilot policy in Disable-Copilot is deprecated for the new
        Copilot app, so this covers the 24H2/25H2 AI features. Undo: the journal
        deletes each value, and Enable-WindowsOptionalFeature -FeatureName Recall.
    #>
    try {
        $aiLM = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
        $aiCU = "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
        [void](Set-RegistryValue -Path $aiLM -Name "AllowRecallEnablement" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableAIDataAnalysis" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiCU -Name "DisableAIDataAnalysis" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "TurnOffSavingSnapshots" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableClickToDo" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiCU -Name "DisableClickToDo" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableSettingsAgent" -Value 1 -Type "DWORD" -SkipBackup $true)

        # AI Fabric service: manual start instead of auto (Win11Debloat approach)
        [void](Set-ServiceStartTracked -Name "WSAIFabricSvc" -StartupType Manual)

        # Notepad and Paint AI
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\WindowsNotepad" -Name "DisableAIFeatures" -Value 1 -Type "DWORD" -SkipBackup $true)
        $paint = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Paint"
        foreach ($name in @("DisableCocreator", "DisableGenerativeFill", "DisableImageCreator", "DisableGenerativeErase", "DisableRemoveBackground")) {
            [void](Set-RegistryValue -Path $paint -Name $name -Value 1 -Type "DWORD" -SkipBackup $true)
        }

        # Recall optional feature (24H2+). Not journaled: undo with Enable-WindowsOptionalFeature.
        if (-not (Test-RockTuneDryRun)) {
            $recall = Get-WindowsOptionalFeature -Online -FeatureName "Recall" -ErrorAction SilentlyContinue
            if ($recall -and $recall.State -eq 'Enabled') {
                Disable-WindowsOptionalFeature -Online -FeatureName "Recall" -NoRestart -ErrorAction SilentlyContinue | Out-Null
                Write-Log "Recall optional feature disabled (undo: Enable-WindowsOptionalFeature -Online -FeatureName Recall)" "SUCCESS"
            }
        }

        Write-Log "Windows AI features off (Recall, Click to Do, AI Fabric, Notepad/Paint AI)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Windows AI features: $_" "ERROR"
    }
}


function Disable-SurpriseReboots {
    <#
    .SYNOPSIS
        Stops Windows Update from rebooting while you are signed in.
    .DESCRIPTION
        Updates still download and install. Only the forced reboot with a signed-in
        user and the "get the latest updates as soon as they're available" opt-in change.
    #>
    try {
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "IsContinuousInnovationOptedIn" -Value 0 -Type "DWORD" -SkipBackup $true)
        Write-Log "No surprise reboots while signed in (updates stay on)" "SUCCESS"
    } catch {
        Write-Log "Error setting reboot policy: $_" "ERROR"
    }
}


function Disable-Widgets {
    <#
    .SYNOPSIS
        Turns off the Widgets board and its taskbar button.
    .DESCRIPTION
        The Widgets board keeps a WebView2 process running in the background.
        The policy value goes into the undo journal.
    #>
    try {
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" -Name "AllowNewsAndInterests" -Value 0 -Type "DWORD" -SkipBackup $true)
        Write-Log "Widgets turned off" "SUCCESS"
    } catch {
        Write-Log "Error turning off Widgets: $_" "ERROR"
    }
}


function Test-BackgroundOptimizations {
    <#
    .SYNOPSIS
        Checks that background apps and Copilot are off.
    .OUTPUTS
        [bool] True when the checks pass.
    #>
    $allPassed = $true

    $bg = Get-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled"
    if ($bg -eq 1) {
        Write-Log "[OK] Background Store apps off" "SUCCESS"
    } else {
        Write-Log "[FAIL] Background Store apps still on" "ERROR"
        $allPassed = $false
    }

    $copilot = Get-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot"
    if ($copilot -eq 1) {
        Write-Log "[OK] Copilot off" "SUCCESS"
    } else {
        Write-Log "[FAIL] Copilot policy not set" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}


function Invoke-BackgroundOptimizations {
    <#
    .SYNOPSIS
        Turns off background apps, Copilot, notifications, Widgets, Windows AI and forced reboots.
    .PARAMETER BackgroundAppsOff
        Stops Store apps from running in the background when true.
    .PARAMETER DisableCopilot
        Turns off Copilot and removes its packages when true.
    .PARAMETER DisableNotifications
        Turns off notification popups when true.
    .PARAMETER DisableWidgets
        Turns off the Widgets board when true.
    .PARAMETER DisableWindowsAI
        Turns off Recall, Click to Do, the AI Fabric service and Notepad/Paint AI when true.
    .PARAMETER NoSurpriseReboots
        Stops Windows Update from rebooting while you are signed in when true.
    #>
    param(
        [bool]$BackgroundAppsOff = $true,
        [bool]$DisableCopilot = $true,
        [bool]$DisableNotifications = $true,
        [bool]$DisableWidgets = $true,
        [bool]$DisableWindowsAI = $true,
        [bool]$NoSurpriseReboots = $true
    )

    Write-Log "Turning off background load..." "INFO"

    if ($BackgroundAppsOff) {
        Set-BackgroundAppsOff
    }

    if ($DisableCopilot) {
        Disable-Copilot
    }

    Disable-Notifications -Enable $DisableNotifications

    if ($DisableWidgets) {
        Disable-Widgets
    }

    if ($DisableWindowsAI) {
        Disable-WindowsAI
    }

    if ($NoSurpriseReboots) {
        Disable-SurpriseReboots
    }

    Write-Log "Background load section complete" "SUCCESS"
}


function Undo-BackgroundOptimizations {
    <#
    .SYNOPSIS
        Restores background, Copilot and older privacy settings from registry backups.
    .DESCRIPTION
        The exact restore of every recorded change is gaming-pc-setup.ps1 -Undo.
        This fallback also covers keys that older RockTune versions changed
        (telemetry, ads, Edge, Xbox services), so a PC set up with an older
        version can still go back.
    #>
    Write-Log "Restoring background and older privacy settings..." "INFO"

    $serviceDefaults = @{ "DiagTrack" = "Automatic"; "dmwappushservice" = "Manual"; "SysMain" = "Automatic"; "XblAuthManager" = "Manual"; "XblGameSave" = "Manual"; "XboxGipSvc" = "Manual"; "XboxNetApiSvc" = "Manual" }
    foreach ($serviceName in @($serviceDefaults.Keys)) {
        try {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service -and $service.StartType -eq 'Disabled') {
                Set-Service -Name $serviceName -StartupType $serviceDefaults[$serviceName] -ErrorAction Stop
                Start-Service -Name $serviceName -ErrorAction SilentlyContinue
                Write-Log "Re-enabled service: $serviceName" "SUCCESS"
            }
        } catch {
            Write-Log "Error re-enabling service $serviceName : $_" "ERROR"
        }
    }

    $paths = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo",
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo",
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System",
        "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config",
        "HKCU:\Software\Microsoft\Siuf\Rules",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager",
        "HKCU:\Software\Microsoft\Clipboard",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection",
        "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search",
        "HKLM:\SOFTWARE\Policies\Microsoft\Edge",
        "HKCU:\SOFTWARE\Microsoft\Windows\Shell\CopilotAI",
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
    )
    foreach ($path in $paths) {
        if (Restore-RegistryKey -Path $path) {
            Write-Log "Restored registry: $path" "SUCCESS"
        }
    }

    Write-Log "Background and older privacy settings restored" "SUCCESS"
}


function Undo-LegacyPrivacyJournal {
    <#
    .SYNOPSIS
        Restores what the retired extreme-privacy.ps1 changed.
    .DESCRIPTION
        Reads %ProgramData%\RockTune\extreme-privacy-undo.json, written by
        extreme-privacy.ps1 in RockTune versions before 2026-10-21, and puts back
        each registry value, service start type, scheduled task, hosts file and
        firewall rule group in reverse order. Honors dry-run.
    .OUTPUTS
        [hashtable] Restored and Failed counts. Both are 0 when no journal exists.
    #>
    $result = @{ Restored = 0; Failed = 0 }
    $journalPath = Join-Path $env:ProgramData "RockTune\extreme-privacy-undo.json"
    if (-not (Test-Path $journalPath)) {
        return $result
    }

    $entries = @()
    try {
        $raw = Get-Content $journalPath -Raw
        if ($raw) { $entries = @($raw | ConvertFrom-Json) }
    } catch {
        Write-Log "extreme-privacy undo journal unreadable: $_" "ERROR"
        $result.Failed = 1
        return $result
    }

    $startTypes = @{ 2 = 'Automatic'; 3 = 'Manual'; 4 = 'Disabled' }
    $dryRun = Test-RockTuneDryRun
    for ($i = $entries.Count - 1; $i -ge 0; $i--) {
        $e = $entries[$i]
        if ($dryRun) {
            Write-Log "[DRY RUN] Would restore $($e.Kind) $($e.Target) $($e.Name)" "INFO"
            continue
        }
        try {
            switch ($e.Kind) {
                "Registry" {
                    if ($e.Existed) {
                        if (-not (Test-Path $e.Target)) { New-Item -Path $e.Target -Force | Out-Null }
                        $value = $e.Value
                        if ($e.ValueKind -eq 'Binary') { $value = [byte[]]@($e.Value) }
                        elseif ($e.ValueKind -eq 'MultiString') { $value = [string[]]@($e.Value) }
                        New-ItemProperty -Path $e.Target -Name $e.Name -Value $value -PropertyType $e.ValueKind -Force | Out-Null
                    } elseif (Test-Path $e.Target) {
                        Remove-ItemProperty -Path $e.Target -Name $e.Name -ErrorAction SilentlyContinue
                    }
                }
                "Service" {
                    if ($null -ne $e.Value -and $startTypes.ContainsKey([int]$e.Value)) {
                        Set-Service -Name $e.Target -StartupType $startTypes[[int]$e.Value] -ErrorAction Stop
                    }
                }
                "Task" {
                    if ($e.Value -ne 'Disabled') {
                        Enable-ScheduledTask -TaskPath $e.Target -TaskName $e.Name -ErrorAction Stop | Out-Null
                    }
                }
                "Hosts" {
                    if (Test-Path $e.Value) {
                        Copy-Item -Path $e.Value -Destination $e.Target -Force
                        [void](& ipconfig /flushdns 2>&1)
                    }
                }
                "Firewall" {
                    Get-NetFirewallRule -Group "RockTune Extreme Privacy" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
                }
            }
            $result.Restored++
        } catch {
            $result.Failed++
            Write-Log "Could not restore $($e.Kind) $($e.Target) $($e.Name): $_" "ERROR"
        }
    }

    if (-not $dryRun -and $result.Failed -eq 0) {
        Rename-Item -Path $journalPath -NewName "extreme-privacy-undo.restored-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ErrorAction SilentlyContinue
    }
    Write-Log "extreme-privacy undo: $($result.Restored) restored, $($result.Failed) failed" "INFO"
    return $result
}


Export-ModuleMember -Function @(
    'Remove-AppxEverywhere',
    'Set-BackgroundAppsOff',
    'Disable-Copilot',
    'Disable-Notifications',
    'Disable-Widgets',
    'Disable-WindowsAI',
    'Disable-SurpriseReboots',
    'Test-BackgroundOptimizations',
    'Invoke-BackgroundOptimizations',
    'Undo-BackgroundOptimizations',
    'Undo-LegacyPrivacyJournal'
)

<#
.SYNOPSIS
    Browser optimizations for gaming (Chrome, Edge, Firefox).
.DESCRIPTION
    Disables browser background apps, hardware acceleration, and startup boost
    via Group Policy registry keys (machine-wide settings).
.NOTES
    Requires Administrator. Uses machine-level Group Policy registry paths.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Disable-ChromeBackgroundApps {
    <#
    .SYNOPSIS
        Disables Chrome background apps via Group Policy.
    .DESCRIPTION
        Sets Chrome policy to prevent background apps from running when
        Chrome is closed. Uses machine-level Group Policy registry.
    .PARAMETER Enable
        When true, disables Chrome background apps.
    .OUTPUTS
        None.
    .NOTES
        Uses Group Policy registry (HKLM) for reliable, persistent settings.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Chrome background apps disable: skipped" "INFO"
        return
    }

    try {
        Write-Log "Disabling Chrome background apps..." "INFO"

        $chromePolicyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"

        # Create policy path if it doesn't exist
        if (-not (Test-Path $chromePolicyPath)) {
            New-Item -Path $chromePolicyPath -Force | Out-Null
        }

        Backup-RegistryKey -Path $chromePolicyPath

        # BackgroundModeEnabled = 0: Disable background apps
        Set-RegistryValue -Path $chromePolicyPath -Name "BackgroundModeEnabled" -Value 0 -Type "DWORD"

        Write-Log "Chrome background apps disabled via Group Policy" "SUCCESS"
        Write-Log "Chrome will no longer run in background when closed" "INFO"

    } catch {
        Write-Log "Error disabling Chrome background apps: $_" "ERROR"
        throw
    }
}


function Disable-EdgeBackgroundApps {
    <#
    .SYNOPSIS
        Disables Edge background apps and startup boost via Group Policy.
    .DESCRIPTION
        Sets Edge policies to prevent background apps, startup boost, and
        background extensions. Uses machine-level Group Policy registry.
    .PARAMETER Enable
        When true, disables Edge background features.
    .OUTPUTS
        None.
    .NOTES
        Uses Group Policy registry (HKLM) for reliable, persistent settings.
        Targets Edge background bloat: startup boost, background apps, extensions.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Edge background apps disable: skipped" "INFO"
        return
    }

    try {
        Write-Log "Disabling Edge background features..." "INFO"

        $edgePolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"

        # Create policy path if it doesn't exist
        if (-not (Test-Path $edgePolicyPath)) {
            New-Item -Path $edgePolicyPath -Force | Out-Null
        }

        Backup-RegistryKey -Path $edgePolicyPath

        # StartupBoostEnabled = 0: Disable startup boost (preloading)
        Set-RegistryValue -Path $edgePolicyPath -Name "StartupBoostEnabled" -Value 0 -Type "DWORD"
        Write-Log "Edge startup boost disabled" "SUCCESS"

        # BackgroundModeEnabled = 0: Disable background apps
        Set-RegistryValue -Path $edgePolicyPath -Name "BackgroundModeEnabled" -Value 0 -Type "DWORD"
        Write-Log "Edge background apps disabled" "SUCCESS"

        # BackgroundExtensionsEnabled = 0: Disable background extensions
        Set-RegistryValue -Path $edgePolicyPath -Name "BackgroundExtensionsEnabled" -Value 0 -Type "DWORD"
        Write-Log "Edge background extensions disabled" "SUCCESS"

        Write-Log "Edge background features disabled via Group Policy" "SUCCESS"
        Write-Log "Edge will no longer run in background or preload at startup" "INFO"

    } catch {
        Write-Log "Error disabling Edge background apps: $_" "ERROR"
        throw
    }
}


function Test-BrowserBackgroundApps {
    <#
    .SYNOPSIS
        Verifies that browser background apps are disabled.
    .DESCRIPTION
        Checks Chrome and Edge Group Policy registry values.
    .OUTPUTS
        [bool] True when checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying browser background settings..." "INFO"

    try {
        # Chrome
        $chromePolicyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
        if (Test-Path $chromePolicyPath) {
            $chromeBgMode = Get-RegistryValue -Path $chromePolicyPath -Name "BackgroundModeEnabled"
            if ($chromeBgMode -eq 0) {
                Write-Log "✓ Chrome background apps disabled" "SUCCESS"
            } else {
                Write-Log "✗ Chrome background apps not disabled" "ERROR"
                $allPassed = $false
            }
        } else {
            Write-Log "○ Chrome policy path not found (Chrome may not be installed)" "INFO"
        }

        # Edge
        $edgePolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        if (Test-Path $edgePolicyPath) {
            $edgeStartupBoost = Get-RegistryValue -Path $edgePolicyPath -Name "StartupBoostEnabled"
            $edgeBgMode = Get-RegistryValue -Path $edgePolicyPath -Name "BackgroundModeEnabled"
            $edgeBgExt = Get-RegistryValue -Path $edgePolicyPath -Name "BackgroundExtensionsEnabled"

            if ($edgeStartupBoost -eq 0) {
                Write-Log "✓ Edge startup boost disabled" "SUCCESS"
            } else {
                Write-Log "✗ Edge startup boost not disabled" "ERROR"
                $allPassed = $false
            }

            if ($edgeBgMode -eq 0) {
                Write-Log "✓ Edge background apps disabled" "SUCCESS"
            } else {
                Write-Log "✗ Edge background apps not disabled" "ERROR"
                $allPassed = $false
            }

            if ($edgeBgExt -eq 0) {
                Write-Log "✓ Edge background extensions disabled" "SUCCESS"
            } else {
                Write-Log "✗ Edge background extensions not disabled" "ERROR"
                $allPassed = $false
            }
        } else {
            Write-Log "○ Edge policy path not found (Edge may not be installed)" "INFO"
        }

    } catch {
        Write-Log "Error verifying browser settings: $_" "ERROR"
        return $false
    }

    return $allPassed
}


function Invoke-BrowserOptimizations {
    <#
    .SYNOPSIS
        Applies all browser optimizations.
    .DESCRIPTION
        Disables background apps for Chrome and Edge via Group Policy.
    .PARAMETER DisableChromeBackground
        When true, disables Chrome background apps.
    .PARAMETER DisableEdgeBackground
        When true, disables Edge background apps and startup boost.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$DisableChromeBackground = $true,
        [bool]$DisableEdgeBackground = $true
    )

    Write-Log "Applying browser optimizations..." "INFO"

    try {
        if ($DisableChromeBackground) {
            Disable-ChromeBackgroundApps -Enable $true
        }

        if ($DisableEdgeBackground) {
            Disable-EdgeBackgroundApps -Enable $true
        }

        Write-Log "Browser optimizations complete" "SUCCESS"
        Write-Log "Note: Restart browsers for changes to take effect" "INFO"

    } catch {
        Write-Log "Error applying browser optimizations: $_" "ERROR"
        throw
    }
}


function Undo-BrowserOptimizations {
    <#
    .SYNOPSIS
        Reverts browser-related changes.
    .DESCRIPTION
        Restores default browser background app settings by removing Group Policy keys.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back browser optimizations..." "INFO"

    try {
        # Chrome
        $chromePolicyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
        if (Restore-RegistryKey -Path $chromePolicyPath) {
            Write-Log "Restored Chrome policy settings" "SUCCESS"
        }

        # Edge
        $edgePolicyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        if (Restore-RegistryKey -Path $edgePolicyPath) {
            Write-Log "Restored Edge policy settings" "SUCCESS"
        }

        Write-Log "Browser optimization rollback complete" "SUCCESS"
        Write-Log "Note: Restart browsers for changes to take effect" "INFO"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Disable-ChromeBackgroundApps',
    'Disable-EdgeBackgroundApps',
    'Test-BrowserBackgroundApps',
    'Invoke-BrowserOptimizations',
    'Undo-BrowserOptimizations'
)

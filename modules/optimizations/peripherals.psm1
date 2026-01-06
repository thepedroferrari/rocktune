<#
.SYNOPSIS
    Peripheral device optimizations (mouse, keyboard).
.DESCRIPTION
    Configures mouse acceleration, keyboard settings, and other peripheral
    optimizations for gaming.
.NOTES
    Requires Administrator for some operations.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Disable-MouseAcceleration {
    <#
    .SYNOPSIS
        Disables Windows mouse acceleration (Enhance pointer precision).
    .DESCRIPTION
        Sets registry values to disable mouse acceleration and apply 1:1 linear
        mouse movement. This is the "Enhance pointer precision" setting in
        Mouse Properties > Pointer Options.
    .PARAMETER Enable
        When true, applies mouse acceleration settings.
    .OUTPUTS
        None.
    .NOTES
        Mouse acceleration makes cursor speed inconsistent, breaking muscle memory.
        Pro gamers always disable this.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Mouse acceleration disable: skipped" "INFO"
        return
    }

    try {
        Write-Log "Disabling mouse acceleration..." "INFO"

        $mousePath = "HKCU:\Control Panel\Mouse"
        Backup-RegistryKey -Path $mousePath

        # MouseSpeed = 0: Disable acceleration
        # MouseThreshold1/2 = 0: Disable threshold-based acceleration
        Set-RegistryValue -Path $mousePath -Name "MouseSpeed" -Value "0" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold1" -Value "0" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold2" -Value "0" -Type "String"

        Write-Log "Mouse acceleration disabled (1:1 linear movement)" "SUCCESS"
        Write-Log "This is the 'Enhance pointer precision' setting in Mouse Properties" "INFO"
        Write-Log "Note: May require logout/login to take full effect" "INFO"

        # Also set SmoothMouseXCurve and SmoothMouseYCurve for true 1:1
        try {
            # Linear curve: 00 00 00 00 00 00 00 00 | C0 CC 0C 00 00 00 00 00 | 80 99 19 00 00 00 00 00 | 40 66 26 00 00 00 00 00 | 00 33 33 00 00 00 00 00
            $linearCurve = [byte[]](0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                    0xC0, 0xCC, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00,
                                    0x80, 0x99, 0x19, 0x00, 0x00, 0x00, 0x00, 0x00,
                                    0x40, 0x66, 0x26, 0x00, 0x00, 0x00, 0x00, 0x00,
                                    0x00, 0x33, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00)

            Set-RegistryValue -Path $mousePath -Name "SmoothMouseXCurve" -Value $linearCurve -Type "Binary"
            Set-RegistryValue -Path $mousePath -Name "SmoothMouseYCurve" -Value $linearCurve -Type "Binary"

            Write-Log "Applied 1:1 linear mouse curve" "SUCCESS"
        } catch {
            Write-Log "Could not set linear mouse curve (optional, not critical)" "INFO"
        }

    } catch {
        Write-Log "Error disabling mouse acceleration: $_" "ERROR"
        throw
    }
}


function Enable-MouseAcceleration {
    <#
    .SYNOPSIS
        Re-enables Windows mouse acceleration.
    .DESCRIPTION
        Restores default Windows mouse acceleration settings.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Re-enabling mouse acceleration..." "INFO"

        $mousePath = "HKCU:\Control Panel\Mouse"
        Backup-RegistryKey -Path $mousePath

        # Windows defaults
        Set-RegistryValue -Path $mousePath -Name "MouseSpeed" -Value "1" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold1" -Value "6" -Type "String"
        Set-RegistryValue -Path $mousePath -Name "MouseThreshold2" -Value "10" -Type "String"

        Write-Log "Mouse acceleration re-enabled (Windows defaults)" "SUCCESS"
        Write-Log "Note: May require logout/login to take full effect" "INFO"

    } catch {
        Write-Log "Error enabling mouse acceleration: $_" "ERROR"
        throw
    }
}


function Test-MouseAcceleration {
    <#
    .SYNOPSIS
        Verifies that mouse acceleration is disabled.
    .DESCRIPTION
        Checks registry values for MouseSpeed, MouseThreshold1, and MouseThreshold2.
    .OUTPUTS
        [bool] True when acceleration is disabled, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying mouse acceleration settings..." "INFO"

    try {
        $mousePath = "HKCU:\Control Panel\Mouse"

        $mouseSpeed = Get-RegistryValue -Path $mousePath -Name "MouseSpeed"
        $threshold1 = Get-RegistryValue -Path $mousePath -Name "MouseThreshold1"
        $threshold2 = Get-RegistryValue -Path $mousePath -Name "MouseThreshold2"

        if ($mouseSpeed -eq "0") {
            Write-Log "✓ Mouse acceleration disabled (MouseSpeed = 0)" "SUCCESS"
        } else {
            Write-Log "✗ Mouse acceleration enabled (MouseSpeed = $mouseSpeed)" "ERROR"
            $allPassed = $false
        }

        if ($threshold1 -eq "0" -and $threshold2 -eq "0") {
            Write-Log "✓ Mouse thresholds disabled" "SUCCESS"
        } else {
            Write-Log "✗ Mouse thresholds not disabled (T1=$threshold1, T2=$threshold2)" "ERROR"
            $allPassed = $false
        }

    } catch {
        Write-Log "Error verifying mouse settings: $_" "ERROR"
        return $false
    }

    return $allPassed
}


function Invoke-PeripheralOptimizations {
    <#
    .SYNOPSIS
        Applies all peripheral optimizations.
    .DESCRIPTION
        Disables mouse acceleration and applies other peripheral tweaks.
    .PARAMETER DisableMouseAcceleration
        When true, disables mouse acceleration.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$DisableMouseAcceleration = $true
    )

    Write-Log "Applying peripheral optimizations..." "INFO"

    try {
        if ($DisableMouseAcceleration) {
            Disable-MouseAcceleration -Enable $true
        }

        Write-Log "Peripheral optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying peripheral optimizations: $_" "ERROR"
        throw
    }
}


function Undo-PeripheralOptimizations {
    <#
    .SYNOPSIS
        Reverts peripheral-related changes.
    .DESCRIPTION
        Restores Windows default mouse acceleration settings.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back peripheral optimizations..." "INFO"

    try {
        Enable-MouseAcceleration

        $mousePath = "HKCU:\Control Panel\Mouse"
        if (Restore-RegistryKey -Path $mousePath) {
            Write-Log "Restored mouse registry settings" "SUCCESS"
        }

        Write-Log "Peripheral optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Disable-MouseAcceleration',
    'Enable-MouseAcceleration',
    'Test-MouseAcceleration',
    'Invoke-PeripheralOptimizations',
    'Undo-PeripheralOptimizations'
)

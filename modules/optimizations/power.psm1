#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-PowerOptimizations {
    $allPassed = $true

    Write-Log "Verifying power optimizations..." "INFO"

    $activePlan = powercfg /getactivescheme
    if ($activePlan -like "*High performance*" -or $activePlan -like "*Ultimate Performance*") {
        Write-Log "✓ High Performance power plan active" "SUCCESS"
    } else {
        Write-Log "✗ High Performance power plan not active" "ERROR"
        $allPassed = $false
    }

    $hiberFile = Test-Path "C:\hiberfil.sys"
    if (-not $hiberFile) {
        Write-Log "✓ Hibernation disabled" "SUCCESS"
    } else {
        Write-Log "Hibernation file still exists (may be enabled)" "INFO"
    }

    return $allPassed
}




function Set-UltimatePerformancePlan {
    try {
        Write-Log "Adding Ultimate Performance power plan..." "INFO"

        $ultPerfGuid = "e9a42b02-d5df-448d-aa00-03f14749eb61"

        $result = powercfg /duplicatescheme $ultPerfGuid 2>&1
        if ($LASTEXITCODE -eq 0) {
            $newGuid = $result -replace '.*GUID:\s*', '' -replace '\s*\(.*', ''
            if ($newGuid) {
                powercfg /setactive $newGuid.Trim() 2>&1 | Out-Null
                Write-Log "Ultimate Performance plan created and activated" "SUCCESS"
                Write-Log "Warning: High idle power/thermals - avoid on laptops" "INFO"
                return
            }
        }

        $existingUlt = powercfg /list | Select-String "Ultimate Performance" | ForEach-Object { ($_ -split '\s+')[3] }
        if ($existingUlt) {
            powercfg /setactive $existingUlt 2>&1 | Out-Null
            Write-Log "Activated existing Ultimate Performance plan" "SUCCESS"
            return
        }

        Write-Log "Ultimate Performance not available, using High Performance" "INFO"
        Set-PowerPlan

    } catch {
        Write-Log "Error setting Ultimate Performance: $_" "ERROR"
        throw
    }
}


function Set-PowerPlan {
    try {
        Write-Log "Configuring power plan..." "INFO"

        $highPerfPlan = powercfg /list | Select-String "High performance" | ForEach-Object { ($_ -split '\s+')[3] }

        if ($highPerfPlan) {
            powercfg /setactive $highPerfPlan
            Write-Log "Set power plan to High Performance: $highPerfPlan" "SUCCESS"
        } else {
            $guid = powercfg /duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1
            if ($LASTEXITCODE -eq 0 -and $guid) {
                $guid = ($guid -split '\s+')[-1]
                powercfg /setactive $guid 2>&1 | Out-Null
                Write-Log "Created and activated Ultimate Performance plan: $guid" "SUCCESS"
            } else {
                Write-Log "Could not create Ultimate Performance plan, using current plan" "ERROR"
            }
        }

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

    } catch {
        Write-Log "Error setting power plan: $_" "ERROR"
        throw
    }
}


function Disable-PCIeLinkState {
    try {
        powercfg /setacvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null

        powercfg /setdcvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Disabled PCIe Link State Power Management" "SUCCESS"

    } catch {
        Write-Log "Error disabling PCIe Link State: $_" "ERROR"
        throw
    }
}


function Disable-USBSelectiveSuspend {
    try {
        powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null

        powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Disabled USB Selective Suspend" "SUCCESS"

    } catch {
        Write-Log "Error disabling USB Selective Suspend: $_" "ERROR"
        throw
    }
}


function Set-ProcessorIdlePolicy {
    param(
        [int]$MinProcessorStatePercent = 5
    )

    try {
        if ($MinProcessorStatePercent -lt 5) { $MinProcessorStatePercent = 5 }
        if ($MinProcessorStatePercent -gt 100) { $MinProcessorStatePercent = 100 }

        powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed $MinProcessorStatePercent 2>&1 | Out-Null
        powercfg /setdcvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed $MinProcessorStatePercent 2>&1 | Out-Null


        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Set minimum processor state to ${MinProcessorStatePercent}% (C-states enabled for thermal headroom)" "SUCCESS"

    } catch {
        Write-Log "Error setting processor idle policy: $_" "ERROR"
        throw
    }
}


function Disable-Hibernation {
    try {
        powercfg /hibernate off 2>&1 | Out-Null
        Write-Log "Disabled hibernation (saves disk space)" "SUCCESS"

    } catch {
        Write-Log "Error disabling hibernation: $_" "ERROR"
        throw
    }
}




function Invoke-PowerOptimizations {
    param(
        [int]$MinProcessorStatePercent = 5
    )

    Write-Log "Applying power optimizations..." "INFO"

    try {
        Set-PowerPlan

        Disable-PCIeLinkState

        Disable-USBSelectiveSuspend

        Set-ProcessorIdlePolicy -MinProcessorStatePercent $MinProcessorStatePercent

        Disable-Hibernation

        Write-Log "Power optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying power optimizations: $_" "ERROR"
        throw
    }
}


function Undo-PowerOptimizations {
    Write-Log "Rolling back power optimizations..." "INFO"

    try {
        $balancedPlan = powercfg /list | Select-String "Balanced" | ForEach-Object { ($_ -split '\s+')[3] }
        if ($balancedPlan) {
            powercfg /setactive $balancedPlan 2>&1 | Out-Null
            Write-Log "Restored Balanced power plan" "SUCCESS"
        }

        powercfg /hibernate on 2>&1 | Out-Null
        Write-Log "Re-enabled hibernation" "SUCCESS"

        powercfg /restoredefaultschemes 2>&1 | Out-Null

        Write-Log "Power optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Set-PowerPlan',
    'Set-UltimatePerformancePlan',
    'Disable-PCIeLinkState',
    'Disable-USBSelectiveSuspend',
    'Set-ProcessorIdlePolicy',
    'Disable-Hibernation',
    'Test-PowerOptimizations',
    'Invoke-PowerOptimizations',
    'Undo-PowerOptimizations'
)

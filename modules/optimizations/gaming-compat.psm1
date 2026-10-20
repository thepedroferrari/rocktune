<#
.SYNOPSIS
    Finds and restores Windows gaming components that debloat tools or guides removed.
.DESCRIPTION
    Checks the Microsoft Store, Xbox Game Bar, Game Bar integration, Xbox Identity
    Provider, Xbox TCUI, the four Xbox services and the GameInput service. These
    are the parts that Game Pass, Xbox sign-in in PC games, controllers and AMD
    X3D core parking depend on. WinUtil and Win11Debloat leave them alone on
    their default settings; they go missing when someone ticks the Xbox or Store
    boxes, or after an older RockTune privacy tier.
.NOTES
    Requires Administrator. Honors dry-run through Test-RockTuneDryRun.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global


$script:XboxServices = @('XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc')


function Install-StorePackage {
    <#
    .SYNOPSIS
        Installs a Microsoft Store package with winget.
    .OUTPUTS
        [bool] True when winget reports success.
    #>
    param(
        [Parameter(Mandatory=$true)][string]$StoreId,
        [Parameter(Mandatory=$true)][string]$Label
    )
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "    [!] winget not found. Install $Label from https://apps.microsoft.com/detail/$StoreId" -ForegroundColor Yellow
        return $false
    }
    Write-Host "    Installing $Label from the Microsoft Store..." -ForegroundColor Gray
    $null = & winget install --id $StoreId -s msstore --accept-package-agreements --accept-source-agreements --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Reinstalled $Label ($StoreId)" "SUCCESS"
        return $true
    }
    Write-Log "winget could not install $Label ($StoreId), exit code $LASTEXITCODE" "WARNING"
    Write-Host "    [!] Install $Label by hand: https://apps.microsoft.com/detail/$StoreId" -ForegroundColor Yellow
    return $false
}


function Get-AppxState {
    <#
    .SYNOPSIS
        Returns Installed, Missing or Unknown for an Appx package.
    .DESCRIPTION
        Get-AppxPackage often fails in PowerShell 7. A failed call returns
        Unknown, so the check skips that app instead of reporting it missing.
    #>
    param([Parameter(Mandatory=$true)][string]$Name)
    try {
        if (Get-AppxPackage -Name $Name -ErrorAction Stop) { return 'Installed' }
    } catch {
        return 'Unknown'
    }
    return 'Missing'
}


function Get-GamingCompatIssues {
    <#
    .SYNOPSIS
        Lists missing or disabled gaming components.
    .PARAMETER IsX3D
        True on AMD X3D CPUs. Missing Game Bar then counts as critical, and the
        Game Bar integration check runs.
    .OUTPUTS
        [object[]] One object per issue: Name, Critical, Detail, Fix (scriptblock).
    #>
    param([bool]$IsX3D = $false)

    $issues = New-Object System.Collections.ArrayList

    if ((Get-AppxState -Name 'Microsoft.WindowsStore') -eq 'Unknown') {
        Write-Host "  [i] Cannot check Store apps in this PowerShell. Run in Windows PowerShell 5.1 to check them." -ForegroundColor Gray
        Write-Log "Gaming compatibility: Get-AppxPackage failed, app checks skipped" "WARNING"
    }

    if ((Get-AppxState -Name 'Microsoft.WindowsStore') -eq 'Missing') {
        [void]$issues.Add([pscustomobject]@{
            Name = 'Microsoft Store'
            Critical = $false
            Detail = 'Game Pass downloads and every Store reinstall below need it.'
            Fix = {
                Start-Process -FilePath 'wsreset.exe' -ArgumentList '-i' -WindowStyle Hidden
                Write-Host "    Store reinstall started in the background. It takes a few minutes." -ForegroundColor Gray
                Write-Log "Started Microsoft Store reinstall (wsreset -i)" "SUCCESS"
            }
        })
    }

    if ((Get-AppxState -Name 'Microsoft.XboxGamingOverlay') -eq 'Missing') {
        $detail = 'Game Bar overlay, Win+G widgets and controller Guide button.'
        if ($IsX3D) {
            $detail = 'AMD X3D needs Game Bar to keep games on the V-Cache cores. Without it, games spread across both CCDs and run slower.'
        }
        [void]$issues.Add([pscustomobject]@{
            Name = 'Xbox Game Bar'
            Critical = $IsX3D
            Detail = $detail
            Fix = { [void](Install-StorePackage -StoreId '9NZKPSTSNW4P' -Label 'Xbox Game Bar') }
        })
    }

    if ($IsX3D) {
        $nexus = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\GameBar' -ErrorAction SilentlyContinue).UseNexusForGameBarEnabled
        $handlerOverride = Test-Path 'HKLM:\SOFTWARE\Classes\ms-gamebar'
        if ($nexus -eq 0 -or $handlerOverride) {
            [void]$issues.Add([pscustomobject]@{
                Name = 'Game Bar integration'
                Critical = $true
                Detail = 'Game Bar links are redirected, so X3D game detection does not run.'
                Fix = {
                    Remove-ItemProperty 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'UseNexusForGameBarEnabled' -ErrorAction SilentlyContinue
                    Remove-Item 'HKLM:\SOFTWARE\Classes\ms-gamebar', 'HKLM:\SOFTWARE\Classes\ms-gamebarservices' -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Log "Restored Game Bar integration" "SUCCESS"
                }
            })
        }
    }

    if ((Get-AppxState -Name 'Microsoft.XboxIdentityProvider') -eq 'Missing') {
        [void]$issues.Add([pscustomobject]@{
            Name = 'Xbox Identity Provider'
            Critical = $false
            Detail = 'Xbox and Microsoft account sign-in inside PC games (Game Pass, Forza, Halo, Minecraft).'
            Fix = { [void](Install-StorePackage -StoreId '9WZDNCRD1HKW' -Label 'Xbox Identity Provider') }
        })
    }

    if ((Get-AppxState -Name 'Microsoft.Xbox.TCUI') -eq 'Missing') {
        [void]$issues.Add([pscustomobject]@{
            Name = 'Xbox TCUI'
            Critical = $false
            Detail = 'The in-game Xbox sign-in and friends screen.'
            Fix = {
                $staged = @(Get-AppxPackage -AllUsers -Name 'Microsoft.Xbox.TCUI' -ErrorAction SilentlyContinue)
                if ($staged.Count -gt 0) {
                    foreach ($pkg in $staged) {
                        Add-AppxPackage -DisableDevelopmentMode -Register (Join-Path $pkg.InstallLocation 'AppXManifest.xml') -ErrorAction SilentlyContinue
                    }
                    Write-Log "Re-registered Xbox TCUI" "SUCCESS"
                } else {
                    # The Xbox app installs TCUI as a dependency.
                    [void](Install-StorePackage -StoreId '9MV0B5HZVK9Z' -Label 'Xbox app (brings back Xbox TCUI)')
                }
            }
        })
    }

    $disabledXbox = @(Get-Service -Name $script:XboxServices -ErrorAction SilentlyContinue | Where-Object { $_.StartType -eq 'Disabled' })
    if ($disabledXbox.Count -gt 0) {
        $names = ($disabledXbox | ForEach-Object { $_.Name }) -join ', '
        [void]$issues.Add([pscustomobject]@{
            Name = 'Xbox services'
            Critical = $false
            Detail = "Disabled: $names. Game Pass, Xbox sign-in, cloud saves and Xbox controller updates need them."
            Targets = @($disabledXbox | ForEach-Object { $_.Name })
            Fix = {
                param([string[]]$Targets)
                foreach ($s in $Targets) {
                    [void](Set-ServiceStartTracked -Name $s -StartupType Manual)
                }
            }
        })
    }

    $gameInput = Get-Service -Name 'GameInputSvc' -ErrorAction SilentlyContinue
    if ($gameInput -and $gameInput.StartType -eq 'Disabled') {
        [void]$issues.Add([pscustomobject]@{
            Name = 'GameInput service'
            Critical = $false
            Detail = 'Controller input and vibration in games that use GameInput (for example Flight Simulator).'
            Fix = { [void](Set-ServiceStartTracked -Name 'GameInputSvc' -StartupType Manual) }
        })
    }

    return $issues.ToArray()
}


function Invoke-GamingCompatCheck {
    <#
    .SYNOPSIS
        Prints missing gaming components and offers to restore them.
    .PARAMETER IsX3D
        True on AMD X3D CPUs.
    .PARAMETER ListOnly
        Lists the issues and changes nothing. Unattended runs (-SkipConfirmation)
        use this, so a restore always needs a Y from the user.
    .OUTPUTS
        [int] Number of issues found.
    #>
    param(
        [bool]$IsX3D = $false,
        [bool]$ListOnly = $false
    )

    Write-Host "Gaming compatibility check:" -ForegroundColor Cyan
    $issues = @(Get-GamingCompatIssues -IsX3D $IsX3D)

    if ($issues.Count -eq 0) {
        Write-Host "  [OK] Store, Game Bar, Xbox sign-in, Xbox services and GameInput are in place" -ForegroundColor Green
        Write-Log "Gaming compatibility check: no issues" "SUCCESS"
        Write-Host ""
        return 0
    }

    foreach ($issue in $issues) {
        if ($issue.Critical) {
            Write-Host "  [CRITICAL] $($issue.Name) missing" -ForegroundColor Red
        } else {
            Write-Host "  [!] $($issue.Name) missing" -ForegroundColor Yellow
        }
        Write-Host "      $($issue.Detail)" -ForegroundColor Gray
        Write-Log "Gaming compatibility: $($issue.Name) missing (critical: $($issue.Critical))" "WARNING"
    }

    if (Test-RockTuneDryRun) {
        foreach ($issue in $issues) {
            Write-Host "  [DRY RUN] would restore $($issue.Name)" -ForegroundColor Yellow
        }
        Write-Host ""
        return $issues.Count
    }

    if ($ListOnly) {
        Write-Host "  Run without -SkipConfirmation to restore them." -ForegroundColor Gray
        Write-Log "Gaming compatibility: list only, nothing restored" "INFO"
        Write-Host ""
        return $issues.Count
    }

    $answer = (Read-Host "Restore these now? (Y/N)").Trim()
    $restore = $answer -match '^(?i:y|yes)$'

    if ($restore) {
        foreach ($issue in $issues) {
            Write-Host "  Restoring $($issue.Name)..." -ForegroundColor Cyan
            try {
                & $issue.Fix $issue.Targets
            } catch {
                Write-Log "Could not restore $($issue.Name): $_" "ERROR"
                Write-Host "    [!] Could not restore $($issue.Name): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Log "Gaming compatibility: user kept the current state" "INFO"
    }
    Write-Host ""
    return $issues.Count
}


Export-ModuleMember -Function @(
    'Get-GamingCompatIssues',
    'Invoke-GamingCompatCheck'
)

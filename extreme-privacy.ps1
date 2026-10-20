<#
.SYNOPSIS
    Applies aggressive privacy and anti-tracking hardening to Windows.
.DESCRIPTION
    Stops automatic Windows Update installs (updates stay available on demand, so
    Store and Game Pass installs keep working), disables telemetry services,
    location and cloud features, Microsoft account integration, and other data
    collection paths. Creates a System Restore point first and records every
    registry value, service and task it changes in
    %ProgramData%\RockTune\extreme-privacy-undo.json so -Undo can put them back.
.PARAMETER SkipConfirmations
    Skips the interactive confirmation prompt.
.PARAMETER EnableFirewallRules
    When set, adds outbound firewall rules for Microsoft-owned telemetry IPs
    (no shared CDN addresses).
.PARAMETER DryRun
    Prints every change without applying it.
.PARAMETER Undo
    Restores the values, services, tasks, hosts file and firewall rules recorded
    by a previous run, then exits.
.EXAMPLE
    .\extreme-privacy.ps1
.EXAMPLE
    .\extreme-privacy.ps1 -SkipConfirmations
.EXAMPLE
    .\extreme-privacy.ps1 -DryRun
.EXAMPLE
    .\extreme-privacy.ps1 -Undo
.NOTES
    Requires Administrator. Writes `extreme-privacy.log` in the current directory.
    Many changes are registry- and service-based and may require a reboot.
#>
#Requires -RunAsAdministrator



param(
    [switch]$SkipConfirmations,
    [switch]$EnableFirewallRules,
    [switch]$DryRun,
    [switch]$Undo
)

# Fail fast inside each try block. Native tools (takeown, icacls, sc, taskkill)
# run through Invoke-Native, because in Windows PowerShell 5.1 any stderr line
# from a native command turns into a terminating error under "Stop".
$ErrorActionPreference = "Stop"
$script:LogPath = ".\extreme-privacy.log"
$script:StateDir = Join-Path $env:ProgramData "RockTune"
$script:JournalPath = Join-Path $script:StateDir "extreme-privacy-undo.json"
$script:Journal = New-Object System.Collections.ArrayList
$script:Stats = @{ Applied = 0; Skipped = 0; Failed = 0 }
$script:FirewallGroup = "RockTune Extreme Privacy"

# Progress tracking
$script:SectionIndex = 0
$script:SectionTotal = if ($EnableFirewallRules) { 24 } else { 23 }

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
        Write-Verbose "Log file not writable: $_"
    }

    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "DRYRUN" { "Yellow" }
        default { "White" }
    }
    Write-Host $logMessage -ForegroundColor $color
}

function Write-Section {
    param([string]$Title)
    $script:SectionIndex++
    $pct = [math]::Min(100, [math]::Round(($script:SectionIndex / $script:SectionTotal) * 100))
    Write-Progress -Activity "Extreme Privacy" -Status $Title -PercentComplete $pct -CurrentOperation "Step $($script:SectionIndex) of $($script:SectionTotal)"
    Write-Host ""
    Write-Host ("[{0,2}/{1}] " -f $script:SectionIndex, $script:SectionTotal) -NoNewline -ForegroundColor DarkCyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Log "=== $Title ==="
}

function Invoke-Native {
    <#
    .SYNOPSIS
        Runs a native command with stderr merged into output, without tripping "Stop".
    #>
    param([Parameter(Mandatory=$true)][scriptblock]$Command)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Command 2>&1 | ForEach-Object { "$_" }
        return ($output -join " ")
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Save-Journal {
    if ($DryRun) { return }
    try {
        if (-not (Test-Path $script:StateDir)) { New-Item -ItemType Directory -Path $script:StateDir -Force | Out-Null }
        $json = ConvertTo-Json -InputObject @($script:Journal.ToArray()) -Depth 6
        Set-Content -Path $script:JournalPath -Value $json -Encoding UTF8 -Force
    } catch {
        Write-Log "Could not save undo journal: $_" "WARNING"
    }
}

function Add-JournalEntry {
    param([string]$Kind, [string]$Target, [string]$Name = "", $Existed = $false, $ValueKind = $null, $Value = $null)
    if ($DryRun) { return }
    foreach ($e in $script:Journal) {
        if ($e.Kind -eq $Kind -and $e.Target -eq $Target -and $e.Name -eq $Name) { return }
    }
    [void]$script:Journal.Add([pscustomobject]@{ Kind = $Kind; Target = $Target; Name = $Name; Existed = $Existed; ValueKind = $ValueKind; Value = $Value })
    Save-Journal
}

# Load the journal from an earlier run so the value from before the first run is kept.
if (Test-Path $script:JournalPath) {
    try {
        $raw = Get-Content $script:JournalPath -Raw
        if ($raw) {
            foreach ($e in @($raw | ConvertFrom-Json)) { [void]$script:Journal.Add($e) }
        }
    } catch {
        Write-Host "Undo journal unreadable, starting a new one: $_" -ForegroundColor Yellow
    }
}

<#
.SYNOPSIS
    Sets a registry value, creating the key if needed.
.DESCRIPTION
    Records the previous value (or its absence) in the undo journal, honors
    -DryRun, writes the value and type, and logs success or failure.
.OUTPUTS
    [bool] True on success, false on failure.
#>
function Set-RegistryValue {
    param(
        [string]$Path,
        [string]$Name,
        [object]$Value,
        [string]$Type = "DWORD"
    )
    if ($DryRun) {
        Write-Log "Would set: $Path\$Name = $Value" "DRYRUN"
        $script:Stats.Applied++
        return $true
    }
    try {
        $existed = $false; $kind = $null; $old = $null
        if (Test-Path $Path) {
            $key = Get-Item -Path $Path
            if ($key.GetValueNames() -contains $Name) {
                $existed = $true
                $kind = $key.GetValueKind($Name).ToString()
                $old = $key.GetValue($Name, $null, 'DoNotExpandEnvironmentNames')
            }
        }
        Add-JournalEntry -Kind "Registry" -Target $Path -Name $Name -Existed $existed -ValueKind $kind -Value $old

        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
        }
        New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
        Write-Log "Set: $Path\$Name = $Value" "SUCCESS"
        $script:Stats.Applied++
        return $true
    } catch {
        Write-Log "Failed: $Path\$Name - $_" "ERROR"
        $script:Stats.Failed++
        return $false
    }
}

function Set-ServiceStart {
    param([string]$Name, [ValidateSet('Automatic', 'Manual', 'Disabled')][string]$StartupType, [switch]$Stop)
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $service) {
        $script:Stats.Skipped++
        return
    }
    if ($DryRun) {
        Write-Log "Would set service $Name to $StartupType" "DRYRUN"
        $script:Stats.Applied++
        return
    }
    try {
        $start = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\$Name" -Name Start -ErrorAction SilentlyContinue).Start
        Add-JournalEntry -Kind "Service" -Target $Name -Existed $true -Value $start
        if ($Stop) { Stop-Service $Name -Force -ErrorAction SilentlyContinue }
        Set-Service $Name -StartupType $StartupType -ErrorAction Stop
        Write-Log "Service $Name set to $StartupType" "SUCCESS"
        $script:Stats.Applied++
    } catch {
        Write-Log "Could not change service $Name : $_" "ERROR"
        $script:Stats.Failed++
    }
}

function Disable-TaskByPath {
    param([string]$FullPath)
    $normalized = '\' + $FullPath.Trim('\')
    $idx = $normalized.LastIndexOf('\')
    $taskPath = $normalized.Substring(0, $idx + 1)
    $taskName = $normalized.Substring($idx + 1)
    $task = Get-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Log "Task not present, skipped: $normalized"
        $script:Stats.Skipped++
        return
    }
    if ($DryRun) {
        Write-Log "Would disable task: $normalized" "DRYRUN"
        $script:Stats.Applied++
        return
    }
    try {
        Add-JournalEntry -Kind "Task" -Target $taskPath -Name $taskName -Existed $true -Value $task.State.ToString()
        Disable-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction Stop | Out-Null
        Write-Log "Disabled scheduled task: $normalized" "SUCCESS"
        $script:Stats.Applied++
    } catch {
        Write-Log "Could not disable task $normalized : $_" "ERROR"
        $script:Stats.Failed++
    }
}

function Invoke-Undo {
    if ($script:Journal.Count -eq 0) {
        Write-Log "Nothing to undo: $script:JournalPath is missing or empty" "WARNING"
        return
    }
    $startTypes = @{ 2 = 'Automatic'; 3 = 'Manual'; 4 = 'Disabled' }
    $restored = 0; $failed = 0
    for ($i = $script:Journal.Count - 1; $i -ge 0; $i--) {
        $e = $script:Journal[$i]
        try {
            if ($DryRun) {
                Write-Log "Would restore $($e.Kind) $($e.Target) $($e.Name)" "DRYRUN"
                continue
            }
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
                        Set-Service -Name $e.Target -StartupType $startTypes[[int]$e.Value]
                    }
                }
                "Task" {
                    if ($e.Value -ne 'Disabled') {
                        Enable-ScheduledTask -TaskPath $e.Target -TaskName $e.Name | Out-Null
                    }
                }
                "Hosts" {
                    if (Test-Path $e.Value) {
                        Copy-Item -Path $e.Value -Destination $e.Target -Force
                        [void](Invoke-Native { ipconfig /flushdns })
                    }
                }
                "Firewall" {
                    Get-NetFirewallRule -Group $script:FirewallGroup -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
                }
            }
            $restored++
            Write-Log "Restored $($e.Kind): $($e.Target) $($e.Name)" "SUCCESS"
        } catch {
            $failed++
            Write-Log "Could not restore $($e.Kind) $($e.Target) $($e.Name): $_" "ERROR"
        }
    }
    if (-not $DryRun -and $failed -eq 0) {
        Rename-Item -Path $script:JournalPath -NewName "extreme-privacy-undo.restored-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ErrorAction SilentlyContinue
    }
    Write-Host ""
    Write-Host "  Restored: $restored   Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  OneDrive and removed Copilot apps are not reinstalled: winget install Microsoft.OneDrive" -ForegroundColor Gray
    Write-Host "  REBOOT to finish." -ForegroundColor Magenta
}

function New-SafetyRestorePoint {
    if ($DryRun) {
        Write-Log "Would create a System Restore point" "DRYRUN"
        return
    }
    $srKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore"
    $freqName = "SystemRestorePointCreationFrequency"
    $old = Get-ItemProperty -Path $srKey -Name $freqName -ErrorAction SilentlyContinue
    try {
        Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
        if (-not (Test-Path $srKey)) { New-Item -Path $srKey -Force | Out-Null }
        # 0 = allow a new point even if one was made in the last 24 hours
        New-ItemProperty -Path $srKey -Name $freqName -Value 0 -PropertyType DWord -Force | Out-Null
        Checkpoint-Computer -Description "Pre-RockTune-Extreme-Privacy" -RestorePointType "MODIFY_SETTINGS" -WarningAction SilentlyContinue
        Write-Log "System Restore point created" "SUCCESS"
    } catch {
        Write-Log "No restore point (continuing; -Undo still works): $($_.Exception.Message)" "WARNING"
    } finally {
        if ($null -ne $old) {
            New-ItemProperty -Path $srKey -Name $freqName -Value $old.$freqName -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
        } else {
            Remove-ItemProperty -Path $srKey -Name $freqName -ErrorAction SilentlyContinue
        }
    }
}

Write-Host @'

   ___  ___  ___  ___  _____  ___  ___  ____ _   _____  _______  __
  / _ \/ _ \/ __|/ _ \/ __/ |/ / || \ \/ / _ \ | / / _ |/ ___/\ \/ /
 / ___/ , _/\__ \ (_) \__ \    \ __ |\  / , _/ |/ / __ / /__   \  /
/_/  /_/|_| |___/\___/___/_/|_/_||_| /_/_/|_||___/_/ |_\___/   /_/

             RockTune - Extreme Privacy
'@ -ForegroundColor Red

if ($Undo) {
    Write-Log "=== Extreme Privacy Undo Started ===" "SUCCESS"
    Invoke-Undo
    exit 0
}

if ($DryRun) {
    Write-Host "DRY RUN: nothing on this PC will change. Every action is printed instead." -ForegroundColor Yellow
}

Write-Log "=== Extreme Privacy & Anti-Tracking Script Started ===" "SUCCESS"
Write-Host ""
Write-Host "=== EXTREME PRIVACY MODE ===" -ForegroundColor Red
Write-Host "This script applies AGGRESSIVE privacy hardening." -ForegroundColor Yellow
Write-Host "Some Windows features may break (Cortana, OneDrive, cloud sync)." -ForegroundColor Yellow
Write-Host "Undo any time: .\extreme-privacy.ps1 -Undo" -ForegroundColor Gray
Write-Host ""

if (-not $SkipConfirmations -and -not $DryRun) {
    $confirm = Read-Host "Continue with extreme privacy mode? (Y/N)"
    if ($confirm -notmatch '^(?i:y|yes)$') {
        Write-Log "Cancelled by user" "WARNING"
        exit 0
    }
}

New-SafetyRestorePoint

# Windows Update: no automatic installs or reboots. wuauserv stays Manual because
# Microsoft Store and Xbox/Game Pass installs need it, and WaaSMedicSvc turns a
# Disabled wuauserv back on anyway.
Write-Section "Stopping Automatic Windows Updates"
try {
    Set-ServiceStart -Name "wuauserv" -StartupType Manual

    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AUOptions" -Value 2 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AutoInstallMinorUpdates" -Value 0 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 | Out-Null

    Write-Log "Automatic updates off (check manually in Settings > Windows Update; Store and Game Pass still work)" "SUCCESS"
} catch {
    Write-Log "Error changing Windows Update policy: $_" "ERROR"
}


# Disable telemetry and diagnostic services that phone home.
Write-Section "Disabling All Telemetry Services"
$telemetryServices = @(
    "DiagTrack",
    "dmwappushservice",
    "diagnosticshub.standardcollector.service",
    "DPS",
    "WdiSystemHost",
    "WdiServiceHost",
    "PcaSvc",
    "WerSvc",
    "Wecsvc",
    "wercplsupport",
    "RetailDemo"
)

foreach ($svc in $telemetryServices) {
    Set-ServiceStart -Name $svc -StartupType Disabled -Stop
}


# Disable telemetry scheduled task
Write-Section "Disabling Telemetry Scheduled Tasks"
$telemetryTasks = @(
    "Microsoft\Windows\Autochk\Proxy",
    "Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
    "Microsoft\Windows\Customer Experience Improvement Program\UsbCeip",
    "Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector",
    "Microsoft\Windows\Feedback\Siuf\DmClient",
    "Microsoft\Windows\Feedback\Siuf\DmClientOnScenarioDownload",
    "Microsoft\Windows\Windows Error Reporting\QueueReporting",
    "Microsoft\Windows\Application Experience\MareBackup",
    "Microsoft\Windows\Application Experience\StartupAppTask",
    "Microsoft\Windows\Application Experience\PcaPatchDbTask",
    "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
    "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser Exp",
    "Microsoft\Windows\Application Experience\ProgramDataUpdater"
)
foreach ($task in $telemetryTasks) {
    Disable-TaskByPath -FullPath $task
}


# Disable Windows Copilot completely
Write-Section "Disabling Windows Copilot"
try {
    # Policy keys
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Value 1 | Out-Null

    # UI visibility
    Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowCopilotButton" -Value 0 | Out-Null

    # Availability flags
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot" -Name "IsCopilotAvailable" -Value 0 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot" -Name "CopilotDisabledReason" -Value "IsEnabledForGeographicRegionFailed" -Type "String" | Out-Null
    Set-RegistryValue -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsCopilot" -Name "AllowCopilotRuntime" -Value 0 | Out-Null

    # Shell extension blocking
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Shell Extensions\Blocked" -Name "{CB3B0003-8088-4EDE-8769-8B354AB2FF8C}" -Value "" -Type "String" | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot\BingChat" -Name "IsUserEligible" -Value 0 | Out-Null

    # Recall, Click to Do and AI data analysis (WindowsAI policy CSP)
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "AllowRecallEnablement" -Value 0 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "DisableAIDataAnalysis" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "DisableAIDataAnalysis" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "TurnOffSavingSnapshots" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "DisableClickToDo" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" -Name "DisableClickToDo" -Value 1 | Out-Null
    Set-ServiceStart -Name "WSAIFabricSvc" -StartupType Manual

    # Remove Copilot packages
    if ($DryRun) {
        Write-Log "Would remove Copilot and Microsoft 365 hub apps" "DRYRUN"
    } else {
        Get-AppxPackage -AllUsers *Copilot* -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
        Get-AppxPackage -AllUsers Microsoft.MicrosoftOfficeHub -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    }

    Write-Log "Copilot, Recall and Click to Do disabled" "SUCCESS"
} catch {
    Write-Log "Error disabling Copilot: $_" "ERROR"
}


# Disable location sensors and location-based permission stores.
Write-Section "Disabling Location Tracking"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocation" -Value 1 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableWindowsLocationProvider" -Value 1 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocationScripting" -Value 1 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" -Name "Value" -Value "Deny" -Type "String" | Out-Null


# Block camera access for UWP/modern apps, keep microphone enabled for voice chat.
Write-Section "Hardening Camera Privacy"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCamera" -Value 2 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" -Name "Value" -Value "Deny" -Type "String" | Out-Null


Write-Log "Camera blocked | Microphone enabled for gaming voice chat" "SUCCESS"


# Disable Windows Hello biometrics and PIN logon for domain usage.
Write-Section "Disabling Biometrics"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Biometrics" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "AllowDomainPINLogon" -Value 0 | Out-Null


# Remove OneDrive background sync and shell integration.
Write-Section "Disabling OneDrive"
try {
    if ($DryRun) {
        Write-Log "Would stop and uninstall OneDrive (files in your OneDrive folder stay)" "DRYRUN"
    } else {
        [void](Invoke-Native { taskkill /f /im OneDrive.exe })
        foreach ($setup in @("$env:SystemRoot\System32\OneDriveSetup.exe", "$env:SystemRoot\SysWOW64\OneDriveSetup.exe")) {
            if (Test-Path $setup) {
                [void](Invoke-Native { & $setup /uninstall })
            }
        }
    }

    # HKCR: is not a default PowerShell drive; use the provider path.
    Set-RegistryValue -Path "Registry::HKEY_CLASSES_ROOT\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 0 | Out-Null
    Set-RegistryValue -Path "Registry::HKEY_CLASSES_ROOT\Wow6432Node\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 0 | Out-Null

    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\OneDrive" -Name "DisableFileSyncNGSC" -Value 1 | Out-Null
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\OneDrive" -Name "DisableFileSync" -Value 1 | Out-Null

    if (-not $DryRun) {
        Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "OneDrive" -ErrorAction SilentlyContinue
    }

    Write-Log "OneDrive disabled and uninstalled" "SUCCESS"
} catch {
    Write-Log "Error disabling OneDrive: $_" "ERROR"
}


# Disable Windows settings sync to reduce cloud footprint.
Write-Section "Disabling Sync Settings"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync" -Name "DisableSettingSync" -Value 2 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync" -Name "DisableSettingSyncUserOverride" -Value 1 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync" -Name "SyncPolicy" -Value 5 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Personalization" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\BrowserSettings" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Credentials" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Language" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Accessibility" -Name "Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Windows" -Name "Enabled" -Value 0 | Out-Null


# Prevent Microsoft account sign-in integration (local account bias).
Write-Section "Disabling Microsoft Account Integration"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\current\device\Accounts" -Name "AllowMicrosoftAccountConnection" -Value 0 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftAccount" -Name "DisableUserAuth" -Value 1 | Out-Null


# Disable consumer cloud content delivery and spotlight suggestions.
Write-Section "Disabling Cloud Content"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableWindowsConsumerFeatures" -Value 1 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableCloudOptimizedContent" -Value 1 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "ContentDeliveryAllowed" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "OemPreInstalledAppsEnabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "PreInstalledAppsEnabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "PreInstalledAppsEverEnabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SilentInstalledAppsEnabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338387Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338388Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-353698Enabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SystemPaneSuggestionsEnabled" -Value 0 | Out-Null


# Stop app suggestions and sync provider notifications.
Write-Section "Disabling App Suggestions"
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SoftLandingEnabled" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSyncProviderNotifications" -Value 0 | Out-Null


# Disable typing/ink data collection used for personalization.
Write-Section "Disabling Typing Data Collection"
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization" -Name "RestrictImplicitInkCollection" -Value 1 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization" -Name "RestrictImplicitTextCollection" -Value 1 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization\TrainedDataStore" -Name "HarvestContacts" -Value 0 | Out-Null
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Personalization\Settings" -Name "AcceptedPrivacyPolicy" -Value 0 | Out-Null


# Block handwriting data sharing.
Write-Section "Disabling Handwriting Data Collection"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC" -Name "PreventHandwritingDataSharing" -Value 1 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports" -Name "PreventHandwritingErrorReports" -Value 1 | Out-Null


# Disable Microsoft experimentation/feature rollouts (A/B testing).
Write-Section "Disabling Microsoft Experimentation"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\current\device\System" -Name "AllowExperimentation" -Value 0 | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\System\AllowExperimentation" -Name "value" -Value 0 | Out-Null


# Deny UWP app access to account data and identity info.
Write-Section "Disabling App Access to Account Info"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userAccountInformation" -Name "Value" -Value "Deny" -Type "String" | Out-Null
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessAccountInfo" -Value 2 | Out-Null


# Deny app access to contacts and PIM data sources.
Write-Section "Disabling App Access to Contacts"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessContacts" -Value 2 | Out-Null


# Deny app access to calendar entries.
Write-Section "Disabling App Access to Calendar"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCalendar" -Value 2 | Out-Null


# Deny app access to call history logs.
Write-Section "Disabling App Access to Call History"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCallHistory" -Value 2 | Out-Null


# Deny app access to email data.
Write-Section "Disabling App Access to Email"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessEmail" -Value 2 | Out-Null


# Deny app access to notifications history.
Write-Section "Disabling App Access to Notifications"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessNotifications" -Value 2 | Out-Null


# Prevent automatic map package downloads.
Write-Section "Disabling Maps Auto-Update"
Set-RegistryValue -Path "HKLM:\SYSTEM\Maps" -Name "AutoUpdateEnabled" -Value 0 | Out-Null


# Adds telemetry domains to hosts file; requires ownership/ACL changes.
Write-Section "Advanced Hosts File Telemetry Blocking"
if ($DryRun) {
    Write-Log "Would back up the hosts file and add telemetry domains to it" "DRYRUN"
} else {
try {
    $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"

    # Ownership and permissions are required for hardened builds or customized ACLs.
    Write-Log "Taking ownership of hosts file (required for X-Lite builds)..."

    $takeownResult = Invoke-Native { takeown.exe /F $hostsFile /A }
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Successfully took ownership of hosts file" "SUCCESS"
    } else {
        Write-Log "Takeown result: $takeownResult" "ERROR"
    }

    # *S-1-5-32-544 is the Administrators SID; the group name is localized.
    $icaclsResult = Invoke-Native { icacls.exe $hostsFile /grant "*S-1-5-32-544:F" }
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Successfully granted full permissions to Administrators" "SUCCESS"
    } else {
        Write-Log "Icacls result: $icaclsResult" "ERROR"
    }

    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    [void](Invoke-Native { icacls.exe $hostsFile /grant "${currentUser}:F" })

    # DNS Client can keep the hosts file locked; stop it temporarily if running.
    Write-Log "Stopping DNS Client service to unlock hosts file..."
    $dnsService = Get-Service -Name "Dnscache" -ErrorAction SilentlyContinue
    $dnsWasRunning = $false

    if ($dnsService) {
        if ($dnsService.Status -eq "Running") {
            try {
                # Try using sc.exe as alternative (works better on X-Lite builds)
                [void](Invoke-Native { sc.exe stop "Dnscache" })
                if ($LASTEXITCODE -eq 0) {
                    $dnsWasRunning = $true
                    Write-Log "DNS Client service stopped" "SUCCESS"
                    Start-Sleep -Seconds 3
                } else {
                    Write-Log "DNS Client service could not be stopped (X-Lite build restrictions)" "ERROR"
                    Write-Log "Continuing with ownership/permissions changes..." "SUCCESS"
                }
            } catch {
                Write-Log "DNS Client service stop failed: $_" "ERROR"
                Write-Log "Continuing with ownership/permissions changes..." "SUCCESS"
            }
        } else {
            Write-Log "DNS Client service is not running" "SUCCESS"
        }
    } else {
        Write-Log "DNS Client service not found (disabled on X-Lite builds)" "SUCCESS"
    }

    try {
        $backupPath = "$hostsFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

        $hostsBytes = [System.IO.File]::ReadAllBytes($hostsFile)
        [System.IO.File]::WriteAllBytes($backupPath, $hostsBytes)
        Write-Log "Backed up hosts file to: $backupPath" "SUCCESS"
        $alreadyJournaled = $false
        foreach ($je in $script:Journal) { if ($je.Kind -eq "Hosts") { $alreadyJournaled = $true } }
        if (-not $alreadyJournaled) {
            Add-JournalEntry -Kind "Hosts" -Target $hostsFile -Existed $true -Value $backupPath
        }

        # Curated list of telemetry/ads endpoints to null-route.
        $telemetryDomains = @(
            "vortex.data.microsoft.com",
            "vortex-win.data.microsoft.com",
            "telecommand.telemetry.microsoft.com",
            "telecommand.telemetry.microsoft.com.nsatc.net",
            "oca.telemetry.microsoft.com",
            "oca.telemetry.microsoft.com.nsatc.net",
            "sqm.telemetry.microsoft.com",
            "sqm.telemetry.microsoft.com.nsatc.net",
            "watson.telemetry.microsoft.com",
            "watson.telemetry.microsoft.com.nsatc.net",
            "redir.metaservices.microsoft.com",
            "choice.microsoft.com",
            "choice.microsoft.com.nsatc.net",
            "df.telemetry.microsoft.com",
            "reports.wes.df.telemetry.microsoft.com",
            "wes.df.telemetry.microsoft.com",
            "services.wes.df.telemetry.microsoft.com",
            "sqm.df.telemetry.microsoft.com",
            "telemetry.microsoft.com",
            "telemetry.appex.bing.net",
            "telemetry.urs.microsoft.com",
            "settings-sandbox.data.microsoft.com",
            "vortex-sandbox.data.microsoft.com",
            "survey.watson.microsoft.com",
            "watson.live.com",
            "watson.microsoft.com",
            "statsfe2.ws.microsoft.com",
            "corpext.msitadfs.glbdns2.microsoft.com",
            "compatexchange.cloudapp.net",
            "cs1.wpc.v0cdn.net",
            "diagnostics.support.microsoft.com",
            "corp.sts.microsoft.com",
            "statsfe1.ws.microsoft.com",
            "pre.footprintpredict.com",
            "i1.services.social.microsoft.com",
            "i1.services.social.microsoft.com.nsatc.net",
            "feedback.windows.com",
            "feedback.microsoft-hohm.com",
            "feedback.search.microsoft.com",
            "ads.msn.com",
            "ads1.msn.com",
            "ads2.msn.com",
            "bingads.microsoft.com",
            "rad.msn.com",
            "flex.msn.com"
        )

        $hostsContentRaw = [System.IO.File]::ReadAllText($hostsFile)
        $hostsContent = $hostsContentRaw -split "`r?`n"
        $newEntries = @()

        foreach ($domain in $telemetryDomains) {
            $entry = "0.0.0.0 $domain"
            if ($hostsContent -notcontains $entry) {
                $newEntries += $entry
            }
        }

        if ($newEntries.Count -gt 0) {
            $newContent = $hostsContentRaw
            if (-not $hostsContentRaw.EndsWith("`n")) {
                $newContent += "`r`n"
            }
            $newContent += "`r`n# Extreme Privacy - Microsoft Telemetry Blocking ($(Get-Date -Format 'yyyy-MM-dd'))`r`n"
            $newContent += ($newEntries -join "`r`n")
            $newContent += "`r`n"

            # Preserve UTF-8 without BOM to avoid compatibility issues.
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($hostsFile, $newContent, $utf8NoBom)

            Write-Log "Added $($newEntries.Count) telemetry domains to hosts file" "SUCCESS"
        } else {
            Write-Log "All telemetry domains already blocked in hosts file" "SUCCESS"
        }

    } finally {
        if ($dnsWasRunning) {
            try {
                [void](Invoke-Native { sc.exe start "Dnscache" })
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "DNS Client service restarted" "SUCCESS"
                } else {
                    Start-Service -Name "Dnscache" -ErrorAction SilentlyContinue
                    Write-Log "DNS Client service restarted" "SUCCESS"
                }
            } catch {
                Write-Log "DNS Client service could not be restarted (may require manual restart)" "ERROR"
            }

            try {
                [void](Invoke-Native { ipconfig /flushdns })
                Write-Log "DNS cache flushed" "SUCCESS"
            } catch {
                Write-Log "Could not flush DNS cache" "ERROR"
            }
        }
    }

} catch {
    Write-Log "Error modifying hosts file: $_" "ERROR"
}
}


if ($EnableFirewallRules) {
    # Optional: outbound firewall rules for known telemetry IPs.
    Write-Section "Creating Firewall Rules to Block Telemetry"
    try {
        # Microsoft-owned telemetry endpoints only. Shared Akamai CDN and Bing/MSN
        # addresses are left out: blocking them breaks unrelated sites and downloads.
        $telemetryIPs = @(
            "134.170.30.202",
            "137.116.81.24",
            "157.56.106.189",
            "65.39.117.230",
            "65.52.108.33",
            "65.55.108.23"
        )

        # Clean up rules from older versions that blocked shared CDN addresses.
        if (-not $DryRun) {
            foreach ($oldIp in @("184.86.53.99", "2.22.61.43", "2.22.61.66", "204.79.197.200", "23.218.212.69")) {
                Get-NetFirewallRule -DisplayName "Block Telemetry IP $oldIp" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
            }
        }

        foreach ($ip in $telemetryIPs) {
            $ruleName = "Block Telemetry IP $ip"
            if ($DryRun) {
                Write-Log "Would create firewall rule: $ruleName" "DRYRUN"
                continue
            }
            if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
                New-NetFirewallRule -DisplayName $ruleName -Group $script:FirewallGroup -Direction Outbound -RemoteAddress $ip -Action Block -ErrorAction Stop | Out-Null
                Write-Log "Created firewall rule: $ruleName" "SUCCESS"
            }
        }
        Add-JournalEntry -Kind "Firewall" -Target $script:FirewallGroup -Existed $false

        Write-Log "Firewall rules created to block telemetry IPs" "SUCCESS"
    } catch {
        Write-Log "Error creating firewall rules: $_" "ERROR"
    }
}


Write-Progress -Activity "Extreme Privacy" -Completed
Write-Log "=== Extreme Privacy Script Completed ===" "SUCCESS"
Write-Host ""
Write-Host "  +------------------------------------------+" -ForegroundColor White
Write-Host "  |         EXTREME PRIVACY SUMMARY          |" -ForegroundColor White
Write-Host "  +------------------------------------------+" -ForegroundColor White
if ($DryRun) {
    Write-Host "  Would change: $($script:Stats.Applied)   Not present: $($script:Stats.Skipped)" -ForegroundColor Yellow
    Write-Host "  DRY RUN complete. Nothing was changed." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}
Write-Host "  Applied: $($script:Stats.Applied)   Skipped: $($script:Stats.Skipped)   Failed: $($script:Stats.Failed)" -ForegroundColor $(if ($script:Stats.Failed -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Undo file: $script:JournalPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Now turned off:" -ForegroundColor Yellow
Write-Host "  - Automatic Windows Update installs and reboots (check manually in Settings)" -ForegroundColor White
Write-Host "  - OneDrive (uninstalled; your files stay in the OneDrive folder)" -ForegroundColor White
Write-Host "  - Microsoft Account sync and cloud features" -ForegroundColor White
Write-Host "  - Copilot, Recall, Click to Do, Cortana" -ForegroundColor White
Write-Host "  Store, Xbox and Game Pass downloads keep working." -ForegroundColor Green
Write-Host ""
Write-Host "Undo everything above:  .\extreme-privacy.ps1 -Undo" -ForegroundColor Cyan
Write-Host ""
Write-Host "REBOOT NEEDED for all changes to take effect." -ForegroundColor Magenta
Write-Host ""

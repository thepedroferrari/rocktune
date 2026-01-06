#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune - Windows Gaming Optimization Loadout Builder

.DESCRIPTION
    Interactive gaming optimization script with the same polished UX as the web app.
    Provides preset-based or custom optimization selection with before/after scanning.

.EXAMPLE
    .\rocktune.ps1

.EXAMPLE
    .\rocktune.ps1 -Preset pro_gamer

.EXAMPLE
    .\rocktune.ps1 -SkipConfirmation

.NOTES
    Source: https://github.com/thepedroferrari/rocktune
    Web App: https://rocktune.pedroferrari.com
#>

param(
    [ValidateSet("gamer", "pro_gamer", "streamer", "benchmarker")]
    [string]$Preset,
    [switch]$SkipConfirmation,
    [switch]$DryRun
)

# ════════════════════════════════════════════════════════════════════════════
# OS DETECTION
# ════════════════════════════════════════════════════════════════════════════

$script:WinBuild = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
$script:IsWin11 = $script:WinBuild -ge 22000
$script:IsWin11_24H2 = $script:WinBuild -ge 26100
$script:WinVersion = if ($script:IsWin11) { "Windows 11" } else { "Windows 10" }

# IDs that only work on Windows 11
$script:Win11OnlyIds = @('18', '21', '22')
$script:Win11_24H2OnlyIds = @('86')

# ════════════════════════════════════════════════════════════════════════════
# COUNTERS & STATE
# ════════════════════════════════════════════════════════════════════════════

$script:SuccessCount = 0
$script:FailCount = 0
$script:WarningCount = 0
$script:ScanResults = @()

# ════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

function Write-Banner {
    Clear-Host
    Write-Host @'

    ____             __   ______
   / __ \____  _____/ /__/_  __/_  ______  ___
  / /_/ / __ \/ ___/ //_/ / / / / / / __ \/ _ \
 / _, _/ /_/ / /__/ ,<   / / / /_/ / / / /  __/
/_/ |_|\____/\___/_/|_| /_/  \__,_/_/ /_/\___/

        Windows Gaming Loadout Builder
'@ -ForegroundColor Magenta
    Write-Host ""
}

function Write-Step { param([string]$M) Write-Host "`n>> $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) $script:SuccessCount++; Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Warn { param([string]$M) $script:WarningCount++; Write-Host "  [!] $M" -ForegroundColor Yellow }

function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD", [switch]$PassThru)
    $success = $false
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        $existing = Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue
        if ($null -eq $existing) {
            New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
        } else {
            Set-ItemProperty -Path $Path -Name $Name -Value $Value -EA Stop
        }
        $success = $true
    } catch { $success = $false }
    if ($PassThru) { return $success }
}

function Add-ScanResult {
    param([string]$Name, [string]$Current, [string]$Target, [string]$Status = "CHANGE")
    $script:ScanResults += [PSCustomObject]@{
        Name = $Name
        Current = $Current
        Target = $Target
        Status = $Status
    }
}

function Write-ScanResults {
    if ($script:ScanResults.Count -eq 0) { return }

    $nameWidth = 36
    $currentWidth = 14
    $targetWidth = 18

    Write-Host ""
    Write-Host "  +$('-' * $nameWidth)+$('-' * $currentWidth)+$('-' * $targetWidth)+" -ForegroundColor White
    Write-Host "  | Setting$(' ' * ($nameWidth - 9))| Current$(' ' * ($currentWidth - 9))| Target$(' ' * ($targetWidth - 8))|" -ForegroundColor White
    Write-Host "  +$('-' * $nameWidth)+$('-' * $currentWidth)+$('-' * $targetWidth)+" -ForegroundColor White

    foreach ($result in $script:ScanResults) {
        $name = $result.Name
        if ($name.Length -gt ($nameWidth - 2)) { $name = $name.Substring(0, $nameWidth - 5) + "..." }
        $name = " " + $name.PadRight($nameWidth - 2)

        $current = $result.Current
        if ($current.Length -gt ($currentWidth - 2)) { $current = $current.Substring(0, $currentWidth - 5) + "..." }
        $current = " " + $current.PadRight($currentWidth - 2)

        $target = $result.Target
        if ($target.Length -gt ($targetWidth - 2)) { $target = $target.Substring(0, $targetWidth - 5) + "..." }
        $target = " " + $target.PadRight($targetWidth - 2)

        $color = switch ($result.Status) {
            "OK"      { "Green" }
            "CHANGE"  { "Yellow" }
            "INFO"    { "Cyan" }
            "PENDING" { "Gray" }
            default   { "White" }
        }

        Write-Host "  |" -NoNewline -ForegroundColor White
        Write-Host $name -NoNewline -ForegroundColor $color
        Write-Host "|" -NoNewline -ForegroundColor White
        Write-Host $current -NoNewline -ForegroundColor $color
        Write-Host "|" -NoNewline -ForegroundColor White
        Write-Host $target -NoNewline -ForegroundColor $color
        Write-Host "|" -ForegroundColor White
    }

    Write-Host "  +$('-' * $nameWidth)+$('-' * $currentWidth)+$('-' * $targetWidth)+" -ForegroundColor White
    Write-Host ""

    $changeCount = ($script:ScanResults | Where-Object { $_.Status -eq "CHANGE" }).Count
    $okCount = ($script:ScanResults | Where-Object { $_.Status -eq "OK" }).Count
    Write-Host "  Summary: $changeCount changes needed, $okCount already configured" -ForegroundColor Gray
    Write-Host ""
}

# ════════════════════════════════════════════════════════════════════════════
# PRESET DEFINITIONS
# ════════════════════════════════════════════════════════════════════════════

$PRESETS = @{
    'gamer' = @{
        name = 'Casual Gamer'
        desc = 'Safe defaults for everyday gaming'
        color = 'Green'
        opts = @('2','4','10','11','13','20','26','28','29','105','106','107','108')
    }
    'pro_gamer' = @{
        name = 'Competitive Gamer'
        desc = 'Maximum performance for esports'
        color = 'Cyan'
        opts = @('2','4','5','6','8','10','11','13','20','25','26','28','29','43','52','54','63','64','104','105','106','107','108')
    }
    'streamer' = @{
        name = 'Content Creator'
        desc = 'Balanced for streaming + gaming'
        color = 'Magenta'
        opts = @('2','4','10','11','13','20','26','28','29','60','105','106','107','108')
    }
    'benchmarker' = @{
        name = 'Benchmarker'
        desc = 'Absolute maximum performance'
        color = 'Yellow'
        opts = @('2','4','5','6','8','10','11','13','20','25','26','28','29','43','50','51','52','53','54','55','63','64','65','66','104','105','106','107','108')
    }
}

$OPT_DESCRIPTIONS = @{
    '2'  = @{ name='Fast Startup'; tier='SAFE'; desc='Disable Fast Boot for cleaner shutdowns' }
    '4'  = @{ name='Power Plan'; tier='SAFE'; desc='Enable High Performance power plan' }
    '5'  = @{ name='USB Power'; tier='SAFE'; desc='Disable USB selective suspend' }
    '6'  = @{ name='PCIe Power'; tier='SAFE'; desc='Disable PCIe power saving' }
    '8'  = @{ name='Nagle Algorithm'; tier='SAFE'; desc='Disable network buffering' }
    '10' = @{ name='Game DVR'; tier='SAFE'; desc='Disable background recording' }
    '11' = @{ name='Background Apps'; tier='SAFE'; desc='Disable background app activity' }
    '13' = @{ name='Copilot'; tier='SAFE'; desc='Disable Windows Copilot' }
    '20' = @{ name='Visual Effects'; tier='SAFE'; desc='Set to performance mode' }
    '25' = @{ name='Multiplane Overlay'; tier='SAFE'; desc='Disable DWM overlay' }
    '26' = @{ name='Mouse Acceleration'; tier='SAFE'; desc='Disable for raw input' }
    '28' = @{ name='Keyboard Response'; tier='SAFE'; desc='Minimize delay' }
    '29' = @{ name='Game Mode'; tier='SAFE'; desc='Enable Windows Game Mode' }
    '43' = @{ name='Input Buffer'; tier='SAFE'; desc='Increase for high poll rate' }
    '50' = @{ name='MSI Mode'; tier='CAUTION'; desc='Lower DPC latency for GPU' }
    '51' = @{ name='HPET'; tier='CAUTION'; desc='Disable timer (test before/after)' }
    '52' = @{ name='Game Bar Overlay'; tier='CAUTION'; desc='Disable overlays' }
    '53' = @{ name='HAGS'; tier='CAUTION'; desc='Enable GPU scheduling' }
    '54' = @{ name='FSO'; tier='CAUTION'; desc='Disable fullscreen optimizations' }
    '55' = @{ name='Ultimate Perf'; tier='CAUTION'; desc='Ultimate power plan' }
    '60' = @{ name='Network Throttle'; tier='CAUTION'; desc='Disable throttling' }
    '63' = @{ name='MMCSS'; tier='CAUTION'; desc='Multimedia scheduler gaming' }
    '64' = @{ name='Scheduler'; tier='CAUTION'; desc='Optimize for responsiveness' }
    '65' = @{ name='Core Parking'; tier='CAUTION'; desc='Disable core parking' }
    '66' = @{ name='Timer Registry'; tier='CAUTION'; desc='Enable timer requests' }
    '104' = @{ name='Background Polling'; tier='SAFE'; desc='Full mouse rate in background' }
    '105' = @{ name='NIC Interrupt Mod'; tier='SAFE'; desc='Disable interrupt moderation' }
    '106' = @{ name='NIC Flow Control'; tier='SAFE'; desc='Disable flow control' }
    '107' = @{ name='NIC Energy Efficient'; tier='SAFE'; desc='Disable EEE/Green Ethernet' }
    '108' = @{ name='Browser Background'; tier='SAFE'; desc='Disable Chrome/Edge background' }
}

# ════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

$OPT_FUNCTIONS = @{
    '2' = {
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "HiberbootEnabled" 0 -PassThru) { Write-OK "Fast startup disabled" }
    }
    '4' = {
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK "High Performance power plan enabled" } else { Write-Warn "High Performance plan not available" }
    }
    '5' = {
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\USB\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1
        Write-OK "USB selective suspend disabled"
    }
    '6' = {
        powercfg /setacvalueindex scheme_current sub_pciexpress ee12f906-d166-476a-8f3a-af931b6e9d31 0 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { powercfg /setactive scheme_current 2>&1 | Out-Null; Write-OK "PCIe power saving disabled" }
    }
    '8' = {
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($adapter in $adapters) {
            $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($adapter.InterfaceGuid)"
            Set-Reg $path "TcpAckFrequency" 1
            Set-Reg $path "TCPNoDelay" 1
        }
        Write-OK "Nagle algorithm disabled"
    }
    '10' = {
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_Enabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" "AllowGameDVR" 0
        Write-OK "Game DVR disabled"
    }
    '11' = {
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" "GlobalUserDisabled" 1
        Write-OK "Background apps disabled"
    }
    '13' = {
        Set-Reg "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" "TurnOffWindowsCopilot" 1
        Write-OK "Copilot disabled"
    }
    '20' = {
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" 2
        Write-OK "Visual effects set to performance"
    }
    '25' = {
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" "OverlayTestMode" 5
        Write-OK "Multiplane Overlay disabled"
    }
    '26' = {
        if (Set-Reg "HKCU:\Control Panel\Mouse" "MouseSpeed" 0 -PassThru) { Write-OK "Mouse acceleration disabled" }
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold1" 0
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold2" 0
    }
    '28' = {
        if (Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardDelay" 0 -PassThru) { Write-OK "Keyboard delay minimized" }
        Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardSpeed" 31
    }
    '29' = {
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AllowAutoGameMode" 1
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AutoGameModeEnabled" 1
        Write-OK "Game Mode enabled"
    }
    '43' = {
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\mouclass\Parameters" "MouseDataQueueSize" 32
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\kbdclass\Parameters" "KeyboardDataQueueSize" 32
        Write-OK "Input buffer increased (8000Hz ready)"
    }
    '50' = {
        $gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1
        if ($gpu) {
            $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.InstanceId)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
            if (Test-Path $msiPath) { Set-Reg $msiPath "MSISupported" 1; Write-OK "MSI mode enabled for GPU" }
        }
    }
    '51' = {
        bcdedit /set useplatformclock false 2>$null
        bcdedit /set disabledynamictick yes 2>$null
        Write-OK "HPET disabled (reboot required)"
    }
    '52' = {
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "ShowStartupPanel" 0
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "GamePanelStartupTipIndex" 3
        Write-OK "Game Bar overlays disabled"
    }
    '53' = {
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" "HwSchMode" 2 -PassThru) { Write-OK "HAGS enabled" }
    }
    '54' = {
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehaviorMode" 2
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" 1
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehavior" 2
        Write-OK "Fullscreen optimizations disabled"
    }
    '55' = {
        powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 >$null 2>&1
        $planOutput = powercfg /list 2>&1
        $plans = $planOutput | Select-String "Ultimate Performance"
        if ($plans) {
            $guidMatch = [regex]::Match($plans.Line, "([A-Fa-f0-9-]{36})")
            if ($guidMatch.Success) {
                powercfg /setactive $guidMatch.Value 2>&1 | Out-Null
                Write-OK "Ultimate Performance enabled"
            }
        } else { Write-Warn "Ultimate Performance not available" }
    }
    '60' = {
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" "NetworkThrottlingIndex" 0xffffffff
        Write-OK "Network throttling disabled"
    }
    '63' = {
        $mmcss = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
        Set-Reg $mmcss "GPU Priority" 8
        Set-Reg $mmcss "Priority" 6
        Set-Reg $mmcss "Scheduling Category" "High" "String"
        Set-Reg $mmcss "SFIO Priority" "High" "String"
        Write-OK "MMCSS gaming priority configured"
    }
    '64' = {
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PrioritySeparation" 26
        Write-OK "Scheduler optimized"
    }
    '65' = {
        powercfg /setacvalueindex scheme_current sub_processor CPMINCORES 100 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { powercfg /setactive scheme_current 2>&1 | Out-Null; Write-OK "Core parking disabled" }
    }
    '66' = {
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "GlobalTimerResolutionRequests" 1
        Write-OK "Timer resolution registry configured"
    }
    '104' = {
        if (Set-Reg "HKCU:\Control Panel\Mouse" "RawMouseThrottleEnabled" 0 -PassThru) {
            Write-OK "Background mouse polling unlocked"
        }
    }
    '105' = {
        $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*")} | Select-Object -First 1
        if ($adapter) {
            try {
                Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*InterruptModeration" -RegistryValue "0" -ErrorAction SilentlyContinue
                Write-OK "NIC interrupt moderation disabled"
            } catch { Write-Warn "NIC property not supported" }
        }
    }
    '106' = {
        $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*")} | Select-Object -First 1
        if ($adapter) {
            try {
                Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*FlowControl" -RegistryValue "0" -ErrorAction SilentlyContinue
                Write-OK "NIC flow control disabled"
            } catch { Write-Warn "NIC property not supported" }
        }
    }
    '107' = {
        $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*")} | Select-Object -First 1
        if ($adapter) {
            try {
                Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "EEELinkAdvertisement" -RegistryValue "0" -ErrorAction SilentlyContinue
                Write-OK "NIC energy efficient ethernet disabled"
            } catch {
                try {
                    Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "GreenEthernet" -RegistryValue "0" -ErrorAction SilentlyContinue
                    Write-OK "NIC green ethernet disabled"
                } catch { Write-Warn "NIC energy property not supported" }
            }
        }
    }
    '108' = {
        # Chrome
        if (-not (Test-Path "HKLM:\SOFTWARE\Policies\Google\Chrome")) {
            New-Item -Path "HKLM:\SOFTWARE\Policies\Google\Chrome" -Force | Out-Null
        }
        Set-Reg "HKLM:\SOFTWARE\Policies\Google\Chrome" "BackgroundModeEnabled" 0
        # Edge
        if (-not (Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge")) {
            New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Force | Out-Null
        }
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "StartupBoostEnabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "BackgroundModeEnabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "BackgroundExtensionsEnabled" 0
        Write-OK "Browser background apps disabled"
    }
}

# ════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ════════════════════════════════════════════════════════════════════════════

Write-Banner

# Show system info
$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)

Write-Host "  System:" -ForegroundColor White
Write-Host "    OS:  $script:WinVersion (Build $script:WinBuild)" -ForegroundColor $(if ($script:IsWin11) { "Gray" } else { "Yellow" })
Write-Host "    CPU: $cpu" -ForegroundColor Gray
Write-Host "    GPU: $gpu" -ForegroundColor Gray
Write-Host "    RAM: ${ram}GB" -ForegroundColor Gray

if (-not $script:IsWin11) {
    Write-Host ""
    Write-Host "  ! Windows 10 detected - some Win11-only options will be skipped" -ForegroundColor Yellow
}
Write-Host ""

# Preset selection
if (-not $Preset) {
    Write-Host "  Select a profile:" -ForegroundColor White
    Write-Host ""
    Write-Host "    [1] " -NoNewline; Write-Host "Casual Gamer" -NoNewline -ForegroundColor Green; Write-Host " - Safe defaults for everyday gaming"
    Write-Host "    [2] " -NoNewline; Write-Host "Competitive Gamer" -NoNewline -ForegroundColor Cyan; Write-Host " - Maximum performance for esports"
    Write-Host "    [3] " -NoNewline; Write-Host "Content Creator" -NoNewline -ForegroundColor Magenta; Write-Host " - Balanced for streaming + gaming"
    Write-Host "    [4] " -NoNewline; Write-Host "Benchmarker" -NoNewline -ForegroundColor Yellow; Write-Host " - Absolute maximum performance"
    Write-Host ""
    Write-Host "  Choice (1-4): " -NoNewline -ForegroundColor Cyan
    $choice = Read-Host

    $Preset = switch ($choice) {
        '1' { 'gamer' }
        '2' { 'pro_gamer' }
        '3' { 'streamer' }
        '4' { 'benchmarker' }
        default { 'gamer' }
    }
}

$selectedPreset = $PRESETS[$Preset]
$optIds = $selectedPreset.opts

Write-Host ""
Write-Host "  Selected: " -NoNewline
Write-Host $selectedPreset.name -ForegroundColor $selectedPreset.color
Write-Host "  $($selectedPreset.desc)" -ForegroundColor Gray
Write-Host "  Optimizations: $($optIds.Count)" -ForegroundColor Gray
Write-Host ""

# Pre-flight scan
Write-Host "  Scanning current system state..." -ForegroundColor Gray

foreach ($id in $optIds) {
    $info = $OPT_DESCRIPTIONS[$id]
    if (-not $info) { continue }

    $name = "[$($info.tier)] $($info.name)"
    $current = "-"
    $target = "Apply"
    $status = "PENDING"

    switch ($id) {
        '2' {
            try {
                $val = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -EA SilentlyContinue
                if ($val.HiberbootEnabled -eq 0) { $current = "OFF"; $status = "OK" }
                else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
            } catch { }
        }
        '10' {
            try {
                $val = Get-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -EA SilentlyContinue
                if ($val.GameDVR_Enabled -eq 0) { $current = "OFF"; $status = "OK" }
                else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
            } catch { }
        }
        '26' {
            try {
                $val = Get-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -EA SilentlyContinue
                if ($val.MouseSpeed -eq "0") { $current = "OFF"; $status = "OK" }
                else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
            } catch { }
        }
        '29' {
            try {
                $val = Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -EA SilentlyContinue
                if ($val.AutoGameModeEnabled -eq 1) { $current = "ON"; $status = "OK" }
                else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
            } catch { }
        }
    }

    Add-ScanResult $name $current $target $status
}

Write-ScanResults

# Confirmation
if (-not $SkipConfirmation -and -not $DryRun) {
    Write-Host "  Apply these optimizations? [Y]es / [N]o: " -NoNewline -ForegroundColor Cyan
    $confirm = Read-Host
    if ($confirm -notmatch '^[Yy]') {
        Write-Host ""
        Write-Host "  Cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "  DRY RUN - No changes applied" -ForegroundColor Yellow
    exit 0
}

# Apply optimizations
Write-Step "Applying Optimizations"

foreach ($id in $optIds) {
    if (-not $OPT_FUNCTIONS.ContainsKey($id)) { continue }

    # Skip Win11-only on Win10
    if (-not $script:IsWin11 -and $id -in $script:Win11OnlyIds) {
        $info = $OPT_DESCRIPTIONS[$id]
        Write-Host "  [SKIP] $($info.name) (requires Windows 11)" -ForegroundColor DarkGray
        continue
    }

    try {
        & $OPT_FUNCTIONS[$id]
    } catch {
        Write-Fail "Failed: $($_.Exception.Message)"
    }
}

# Summary
Write-Step "Complete"
Write-Host ""
Write-Host "  +----------------------------------------+" -ForegroundColor White
Write-Host "  |           LOADOUT SUMMARY              |" -ForegroundColor White
Write-Host "  +----------------------------------------+" -ForegroundColor White
Write-Host ""
Write-Host "  Applied:  $($script:SuccessCount) changes" -ForegroundColor Green
if ($script:WarningCount -gt 0) { Write-Host "  Warnings: $($script:WarningCount)" -ForegroundColor Yellow }
if ($script:FailCount -gt 0) { Write-Host "  Failed:   $($script:FailCount)" -ForegroundColor Red }
Write-Host ""
Write-Host "  Reboot recommended for all changes to take effect." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Source: https://rocktune.pedroferrari.com" -ForegroundColor DarkGray
Write-Host ""

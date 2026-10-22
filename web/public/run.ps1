<#
.SYNOPSIS
    RockTune Universal Loader - Execute shared loadouts via one-liner

.DESCRIPTION
    This script enables direct execution of RockTune loadouts from a URL.
    Configuration is passed via query parameters, parsed at runtime.

    SECURITY: LUDICROUS tier optimizations (IDs 100-103) are NOT included.
    Recipients must use the web UI to enable dangerous optimizations.

.EXAMPLE
    $env:RT="c=1&g=1&o=1,2,10"; irm https://rocktune.pedroferrari.com/run.ps1 | iex

.EXAMPLE
    $env:RT="c=1&g=1&d=1&o=1,2,3,10,11&s=steam,discord"; irm https://rocktune.pedroferrari.com/run.ps1 | iex

.NOTES
    Generated from RockTune web app: https://rocktune.pedroferrari.com
    Source: https://github.com/thepedroferrari/rocktune
#>

# ============================================================================
# ADMIN CHECK
# ============================================================================
# This script runs as "irm ... | iex": #Requires is ignored there and "exit" would
# close the whole PowerShell window, so check explicitly and use "return".
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host ""
    Write-Host "  Run PowerShell as Administrator" -ForegroundColor Red
    Write-Host "  Right-click PowerShell / Terminal > 'Run as administrator', then paste the one-liner again." -ForegroundColor Yellow
    Write-Host ""
    return
}

# ============================================================================
# OS DETECTION
# ============================================================================

$script:WinBuild = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
$script:IsWin11 = $script:WinBuild -ge 22000
$script:IsWin11_24H2 = $script:WinBuild -ge 26100
$script:WinVersion = if ($script:IsWin11) { "Windows 11" } else { "Windows 10" }

# IDs that only work on Windows 11
$script:Win11OnlyIds = @('21', '113', '114')  # End Task, Windows AI, Widgets
$script:Win11_24H2OnlyIds = @('86')  # Native NVMe

# ============================================================================
# PARSE CONFIGURATION
# ============================================================================
# Configuration is passed via $env:RT environment variable as query string format
# Example: $env:RT='c=1&g=1&o=1,2,3&s=steam'; irm url | iex

$configString = $env:RT
if (-not $configString) {
    Write-Host ""
    Write-Host "  ERROR: No configuration found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Usage:" -ForegroundColor Yellow
    Write-Host '  $env:RT="c=1&g=1&o=1,2,3&s=steam"; irm https://rocktune.pedroferrari.com/run.ps1 | iex' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Get your one-liner at: https://rocktune.pedroferrari.com" -ForegroundColor Gray
    Write-Host ""
    return
}

# Parse the config string as query parameters
try {
    Add-Type -AssemblyName System.Web
    $query = [System.Web.HttpUtility]::ParseQueryString($configString)
} catch {
    Write-Host "ERROR: Invalid configuration format." -ForegroundColor Red
    return
}

# Extract parameters
$cpuId = $query['c']
$gpuId = $query['g']
$dnsId = $query['d']
$peripheralIds = if ($query['p']) { $query['p'] -split ',' } else { @() }
$monitorIds = if ($query['m']) { $query['m'] -split ',' } else { @() }
$optIds = if ($query['o']) { $query['o'] -split ',' } else { @() }
$pkgKeys = if ($query['s']) { $query['s'] -split ',' } else { @() }

$validCpuIds = @('1', '2', '3')
$validGpuIds = @('1', '2', '3')
$validDnsIds = @('1', '2', '3', '4', '5')

if ($cpuId -and $cpuId -notin $validCpuIds) {
    Write-Host "  WARNING: Invalid CPU ID '$cpuId' - defaulting to AMD" -ForegroundColor Yellow
    $cpuId = '2'
}
if ($gpuId -and $gpuId -notin $validGpuIds) {
    Write-Host "  WARNING: Invalid GPU ID '$gpuId' - defaulting to NVIDIA" -ForegroundColor Yellow
    $gpuId = '1'
}
if ($dnsId -and $dnsId -notin $validDnsIds) {
    Write-Host "  WARNING: Invalid DNS ID '$dnsId' - DNS optimization will be skipped" -ForegroundColor Yellow
    $dnsId = $null
}

$optIds = $optIds | Where-Object { $_ -match '^\d+$' }

# Retired IDs: general Windows cleanup moved to WinUtil / Win11Debloat.
# Old share links still list them; skip each one with a single line.
# MUST STAY IN SYNC with DEPRECATED_OPT_IDS in web/src/lib/share-registry.ts
$RETIRED_OPT_IDS = @{
    '12'='Edge Debloat'; '14'='Explorer Speed'; '15'='Purge Temp Files'; '18'='Classic Context Menu'
    '19'='Storage Sense'; '22'='Explorer Cleanup'; '24'='PowerShell 7 Telemetry'; '35'='Error Reporting Off'
    '36'='WiFi Sense Off'; '37'='Spotlight Off'; '38'='Feedback Off'; '39'='Clipboard Sync Off'
    '56'='Trim Services'; '57'='Deep Disk Cleanup'; '58'='WPBT Disable'; '80'='Privacy Tier 1'
    '81'='Privacy Tier 2'; '82'='Privacy Tier 3'; '83'='Remove Bloatware'; '115'='Clean Start Menu'
    '116'='Bing Search Off'; '117'='No Ads & Nags'; '120'='Uninstall OneDrive'
}
$retiredHits = @($optIds | Where-Object { $RETIRED_OPT_IDS.ContainsKey($_) })
$optIds = @($optIds | Where-Object { -not $RETIRED_OPT_IDS.ContainsKey($_) })
$pkgKeys = $pkgKeys | Where-Object { $_ -match '^[a-zA-Z0-9._-]+$' }

# Clear the env var after reading (security)
$env:RT = $null

# ============================================================================
# ID MAPPINGS - MUST STAY IN SYNC with web/src/lib/share-registry.ts
# ============================================================================
#
# To find next available ID:
#   cd web && pnpm share:audit
#
# When adding a new optimization:
# 1. Add to share-registry.ts with next sequential ID
# 2. Add entry to $OPT_DESCRIPTIONS below
# 3. Add entry to $OPT_FUNCTIONS below
# 4. Run: cd web && pnpm share:audit (verify passes)
#
# ============================================================================

$CPU_MAP = @{ '1'='amd_x3d'; '2'='amd'; '3'='intel' }
$GPU_MAP = @{ '1'='nvidia'; '2'='amd'; '3'='intel' }
$DNS_MAP = @{
    '1' = @{ name='Cloudflare'; primary='1.1.1.1'; secondary='1.0.0.1' }
    '2' = @{ name='Google'; primary='8.8.8.8'; secondary='8.8.4.4' }
    '3' = @{ name='Quad9'; primary='9.9.9.9'; secondary='149.112.112.112' }
    '4' = @{ name='OpenDNS'; primary='208.67.222.222'; secondary='208.67.220.220' }
    '5' = @{ name='AdGuard'; primary='94.140.14.14'; secondary='94.140.15.15' }
}

# ============================================================================
# PACKAGE MAPPINGS (from catalog.json)
# ============================================================================

$PACKAGE_MAP = @{
    'steam' = @{ id='Valve.Steam'; name='Steam' }
    'epic' = @{ id='EpicGames.EpicGamesLauncher'; name='Epic Games' }
    'gog' = @{ id='GOG.Galaxy'; name='GOG Galaxy' }
    'battlenet' = @{ id='Blizzard.BattleNet'; name='Battle.net' }
    'ea' = @{ id='ElectronicArts.EADesktop'; name='EA App' }
    'ubisoft' = @{ id='Ubisoft.Connect'; name='Ubisoft Connect' }
    'xbox' = @{ id='Microsoft.GamingApp'; name='Xbox' }
    'riot' = @{ id='RiotGames.LeagueOfLegends.EUW'; name='Riot Client' }
    'rockstar' = @{ id='Rockstar.RockstarGamesLauncher'; name='Rockstar' }
    'itch' = @{ id='itch.itch'; name='itch.io' }
    'amazon' = @{ id='Amazon.Games'; name='Amazon Games' }
    'playnite' = @{ id='Playnite.Playnite'; name='Playnite' }
    'heroic' = @{ id='HeroicGamesLauncher.HeroicGamesLauncher'; name='Heroic' }
    'discord' = @{ id='Discord.Discord'; name='Discord' }
    'teamspeak' = @{ id='TeamSpeakSystems.TeamSpeakClient'; name='TeamSpeak' }
    'guilded' = @{ id='Guilded.Guilded'; name='Guilded' }
    'parsec' = @{ id='Parsec.Parsec'; name='Parsec' }
    'moonlight' = @{ id='MoonlightGameStreamingProject.Moonlight'; name='Moonlight' }
    'obs' = @{ id='OBSProject.OBSStudio'; name='OBS Studio' }
    'streamlabs' = @{ id='Streamlabs.Streamlabs'; name='Streamlabs' }
    'twitchstudio' = @{ id='Twitch.TwitchStudio'; name='Twitch Studio' }
    'voicemeeter' = @{ id='VB-Audio.Voicemeeter.Potato'; name='Voicemeeter' }
    'nvidiabroadcast' = @{ id='Nvidia.Broadcast'; name='NVIDIA Broadcast' }
    'medal' = @{ id='Medal.Medal'; name='Medal.tv' }
    'elgato' = @{ id='Elgato.StreamDeck'; name='Stream Deck' }
    'prism' = @{ id='PRISMLiveStudio.PRISMLiveStudio'; name='Prism Live' }
    'sunshine' = @{ id='LizardByte.Sunshine'; name='Sunshine' }
    'steamlink' = @{ id='Valve.SteamLink'; name='Steam Link' }
    'hwinfo' = @{ id='REALiX.HWiNFO'; name='HWiNFO' }
    'afterburner' = @{ id='Guru3D.Afterburner'; name='Afterburner' }
    'cpuz' = @{ id='CPUID.CPU-Z'; name='CPU-Z' }
    'gpuz' = @{ id='TechPowerUp.GPU-Z'; name='GPU-Z' }
    'coretemp' = @{ id='ALCPU.CoreTemp'; name='Core Temp' }
    'crystaldiskinfo' = @{ id='CrystalDewWorld.CrystalDiskInfo'; name='CrystalDiskInfo' }
    'crystaldiskmark' = @{ id='CrystalDewWorld.CrystalDiskMark'; name='CrystalDiskMark' }
    'fpsmonitor' = @{ id='FPSMonitor.FPSMonitor'; name='FPS Monitor' }
    'openhardwaremonitor' = @{ id='OpenHardwareMonitor.OpenHardwareMonitor'; name='Open Hardware Monitor' }
    'nvcleanstall' = @{ id='TechPowerUp.NVCleanstall'; name='NVCleanstall' }
    'displaydriveruninstaller' = @{ id='Wagnardsoft.DisplayDriverUninstaller'; name='DDU' }
    'processlasso' = @{ id='BitSum.ProcessLasso'; name='Process Lasso' }
    'rtss' = @{ id='Guru3D.RTSS'; name='RTSS' }
    'capframex' = @{ id='CXWorld.CapFrameX'; name='CapFrameX' }
    'latencymon' = @{ id='Resplendence.LatencyMon'; name='LatencyMon' }
    'fancontrol' = @{ id='Rem0o.FanControl'; name='FanControl' }
    'librehardwaremonitor' = @{ id='LibreHardwareMonitor.LibreHardwareMonitor'; name='Libre Hardware Monitor' }
    'brave' = @{ id='Brave.Brave'; name='Brave' }
    'firefox' = @{ id='Mozilla.Firefox'; name='Firefox' }
    'chrome' = @{ id='Google.Chrome'; name='Chrome' }
    'edge' = @{ id='Microsoft.Edge'; name='Edge' }
    'operagx' = @{ id='Opera.OperaGX'; name='Opera GX' }
    'vivaldi' = @{ id='Vivaldi.Vivaldi'; name='Vivaldi' }
    'librewolf' = @{ id='LibreWolf.LibreWolf'; name='LibreWolf' }
    'torbrowser' = @{ id='TorProject.TorBrowser'; name='Tor Browser' }
    'vlc' = @{ id='VideoLAN.VLC'; name='VLC' }
    'spotify' = @{ id='Spotify.Spotify'; name='Spotify' }
    'foobar2000' = @{ id='PeterPawlowski.foobar2000'; name='foobar2000' }
    'mpchc' = @{ id='clsid2.mpc-hc'; name='MPC-HC' }
    'plex' = @{ id='Plex.Plex'; name='Plex' }
    'jellyfin' = @{ id='Jellyfin.JellyfinMediaPlayer'; name='Jellyfin' }
    'audacity' = @{ id='Audacity.Audacity'; name='Audacity' }
    'handbrake' = @{ id='HandBrake.HandBrake'; name='HandBrake' }
    'stremio' = @{ id='Stremio.Stremio'; name='Stremio' }
    'musicbee' = @{ id='MusicBee.MusicBee'; name='MusicBee' }
    '7zip' = @{ id='7zip.7zip'; name='7-Zip' }
    'sharex' = @{ id='ShareX.ShareX'; name='ShareX' }
    'powertoys' = @{ id='Microsoft.PowerToys'; name='PowerToys' }
    'everything' = @{ id='voidtools.Everything'; name='Everything' }
    'qbittorrent' = @{ id='qBittorrent.qBittorrent'; name='qBittorrent' }
    'bitwarden' = @{ id='Bitwarden.Bitwarden'; name='Bitwarden' }
    'keepassxc' = @{ id='KeePassXCTeam.KeePassXC'; name='KeePassXC' }
    'notepadplusplus' = @{ id='Notepad++.Notepad++'; name='Notepad++' }
    'wiztree' = @{ id='AntibodySoftware.WizTree'; name='WizTree' }
    'windirstat' = @{ id='WinDirStat.WinDirStat'; name='WinDirStat' }
    'autohotkey' = @{ id='AutoHotkey.AutoHotkey'; name='AutoHotkey' }
    'f.lux' = @{ id='flux.flux'; name='f.lux' }
    'winrar' = @{ id='RARLab.WinRAR'; name='WinRAR' }
    'peazip' = @{ id='Giorgiotani.Peazip'; name='PeaZip' }
    'revo' = @{ id='RevoUninstaller.RevoUninstaller'; name='Revo Uninstaller' }
    'bulk' = @{ id='TGRMNSoftware.BulkRenameUtility'; name='Bulk Rename' }
    'imageglass' = @{ id='ImageGlass.ImageGlass'; name='ImageGlass' }
    'flameshot' = @{ id='Flameshot.Flameshot'; name='Flameshot' }
    'ditto' = @{ id='Ditto.Ditto'; name='Ditto' }
    'eartrumpet' = @{ id='File-New-Project.EarTrumpet'; name='EarTrumpet' }
    'bcuninstaller' = @{ id='Klocman.BulkCrapUninstaller'; name='Bulk Crap Uninstaller' }
    'sysinternals_suite' = @{ id='Microsoft.Sysinternals.Suite'; name='Sysinternals Suite' }
    'rainmeter' = @{ id='Rainmeter.Rainmeter'; name='Rainmeter' }
    'lively' = @{ id='rocksdanister.LivelyWallpaper'; name='Lively Wallpaper' }
    'logitechghub' = @{ id='Logitech.GHUB'; name='Logitech G HUB' }
    'razersynapse' = @{ id='RazerInc.RazerInstaller'; name='Razer Synapse' }
    'icue' = @{ id='Corsair.iCUE.5'; name='Corsair iCUE' }
    'steelseriesgg' = @{ id='SteelSeries.GG'; name='SteelSeries GG' }
    'armourycrate' = @{ id='ASUS.ArmouryCrate'; name='ASUS Armoury Crate' }
    'nzxtcam' = @{ id='NZXT.CAM'; name='NZXT CAM' }
    'signalrgb' = @{ id='WhirlwindFX.SignalRgb'; name='SignalRGB' }
    'openrgb' = @{ id='OpenRGB.OpenRGB'; name='OpenRGB' }
    'wooting' = @{ id='Wooting.Wootility'; name='Wootility' }
    'delldisplaymanager' = @{ id='Dell.DisplayManager'; name='Dell Display Manager' }
    'lgonscreencontrol' = @{ id='LG.OnScreenControl'; name='LG OnScreen Control' }
    'hpdisplaycenter' = @{ id='HP.DisplayCenter'; name='HP Display Center' }
    'vscode' = @{ id='Microsoft.VisualStudioCode'; name='VS Code' }
    'git' = @{ id='Git.Git'; name='Git' }
    'python' = @{ id='Python.Python.3.12'; name='Python' }
    'nodejs' = @{ id='OpenJS.NodeJS.LTS'; name='Node.js' }
    'wt' = @{ id='Microsoft.WindowsTerminal'; name='Terminal' }
    'docker' = @{ id='Docker.DockerDesktop'; name='Docker' }
    'postman' = @{ id='Postman.Postman'; name='Postman' }
    'github' = @{ id='GitHub.GitHubDesktop'; name='GitHub Desktop' }
    'sublime' = @{ id='SublimeHQ.SublimeText.4'; name='Sublime Text' }
    'neovim' = @{ id='Neovim.Neovim'; name='Neovim' }
    'wsl' = @{ id='Canonical.Ubuntu.2404'; name='Ubuntu (WSL)' }
    'jetbrains' = @{ id='JetBrains.Toolbox'; name='JetBrains Toolbox' }
    'powershell' = @{ id='Microsoft.PowerShell'; name='PowerShell' }
    'gh' = @{ id='GitHub.cli'; name='GitHub CLI' }
    'vcredist' = @{ id='Microsoft.VCRedist.2015+.x64'; name='VC++ Runtime' }
    'vcredist_x86' = @{ id='Microsoft.VCRedist.2015+.x86'; name='VC++ Runtime (x86)' }
    'dotnet' = @{ id='Microsoft.DotNet.DesktopRuntime.8'; name='.NET Runtime' }
    'dotnet_runtime_8' = @{ id='Microsoft.DotNet.Runtime.8'; name='.NET Runtime 8' }
    'dotnet_sdk_8' = @{ id='Microsoft.DotNet.SDK.8'; name='.NET SDK 8' }
    'directx' = @{ id='Microsoft.DirectX'; name='DirectX' }
    'java' = @{ id='Oracle.JavaRuntimeEnvironment'; name='Java' }
    'webview2' = @{ id='Microsoft.EdgeWebView2Runtime'; name='WebView2' }
    '3dmark' = @{ id='Futuremark.3DMark'; name='3DMark' }
    'cinebench' = @{ id='Maxon.Cinebench'; name='Cinebench' }
    'geekbench' = @{ id='Geekbench.Geekbench.6'; name='Geekbench' }
    'furmark' = @{ id='Geeks3D.FurMark'; name='FurMark' }
    'occt' = @{ id='OCBase.OCCT.Personal'; name='OCCT' }
    'unigine_heaven' = @{ id='Unigine.HeavenBenchmark'; name='Unigine Heaven' }
    'unigine_valley' = @{ id='Unigine.ValleyBenchmark'; name='Unigine Valley' }
    'unigine_superposition' = @{ id='Unigine.SuperpositionBenchmark'; name='Unigine Superposition' }
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

$script:SuccessCount = 0
$script:FailCount = 0
$script:WarningCount = 0
$script:ScanResults = @()

function Write-Banner {
    Write-Host @'
    ____             __   ______
   / __ \____  _____/ /__/_  __/_  ______  ___
  / /_/ / __ \/ ___/ //_/ / / / / / / __ \/ _ \
 / _, _/ /_/ / /__/ ,<   / / / /_/ / / / /  __/
/_/ |_|\____/\___/_/|_| /_/  \__,_/_/ /_/\___/

        Windows Gaming Loadout Builder
'@ -ForegroundColor Magenta
}

function Write-Step { param([string]$M) Write-Host "`n>> $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) $script:SuccessCount++; Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Warn { param([string]$M) $script:WarningCount++; Write-Host "  [!] $M" -ForegroundColor Yellow }

function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD", [switch]$PassThru)
    $success = $false
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force -EA Stop | Out-Null }
        # -Force replaces the value and its type (a REG_SZ that should be DWORD is recreated)
        New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force -EA Stop | Out-Null
        $success = $true
    } catch { $success = $false }
    if ($PassThru) { return $success }
}

function Test-DefenderActive {
    # Get-MpPreference still answers when another antivirus has put Defender in
    # passive mode, so ask Get-MpComputerStatus whether Defender is the active antivirus.
    try {
        $st = Get-MpComputerStatus -EA Stop
        return [bool]($st.AntivirusEnabled -and (-not $st.AMRunningMode -or $st.AMRunningMode -eq 'Normal'))
    } catch { return $false }
}

function Set-DxGlobalSetting {
    # DirectXUserGlobalSettings holds several "Name=Value;" pairs: merge one in, keep the rest
    param([string]$Name, [string]$Value)
    $dxPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
    $old = (Get-ItemProperty -Path $dxPath -Name "DirectXUserGlobalSettings" -EA SilentlyContinue).DirectXUserGlobalSettings
    $pairs = [ordered]@{}
    if ($old) {
        foreach ($pair in ($old -split ';')) {
            if ($pair -match '^\s*([^=]+?)\s*=\s*(.*?)\s*$') { $pairs[$Matches[1]] = $Matches[2] }
        }
    }
    $pairs[$Name] = $Value
    $new = (($pairs.Keys | ForEach-Object { "$_=$($pairs[$_])" }) -join ';') + ';'
    return (Set-Reg $dxPath "DirectXUserGlobalSettings" $new "String" -PassThru)
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
    Write-Host "  +$('=' * $nameWidth)+$('=' * $currentWidth)+$('=' * $targetWidth)+" -ForegroundColor White
    Write-Host "  | Setting$(' ' * ($nameWidth - 9))| Current$(' ' * ($currentWidth - 9))| Target$(' ' * ($targetWidth - 8))|" -ForegroundColor White
    Write-Host "  +$('=' * $nameWidth)+$('=' * $currentWidth)+$('=' * $targetWidth)+" -ForegroundColor White

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
            "WARN"    { "Red" }
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

    Write-Host "  +$('=' * $nameWidth)+$('=' * $currentWidth)+$('=' * $targetWidth)+" -ForegroundColor White
    Write-Host ""

    $changeCount = ($script:ScanResults | Where-Object { $_.Status -eq "CHANGE" }).Count
    $okCount = ($script:ScanResults | Where-Object { $_.Status -eq "OK" }).Count
    $warnCount = ($script:ScanResults | Where-Object { $_.Status -eq "WARN" }).Count
    Write-Host "  Summary: $changeCount changes needed, $okCount already configured" -ForegroundColor Gray
    if ($warnCount -gt 0) { Write-Host "  $warnCount gaming feature(s) turned off or removed (see [COMPAT] rows)" -ForegroundColor Red }
    Write-Host ""
}

# ============================================================================
# OPTIMIZATION DESCRIPTIONS (for interactive mode)
# ============================================================================

$OPT_DESCRIPTIONS = @{
    # SAFE tier (1-45)
    '1'  = @{ name='Page File'; tier='SAFE'; desc='Set fixed page file size based on RAM (4GB for 32GB+, 8GB for 16GB)' }
    '2'  = @{ name='Fast Startup'; tier='SAFE'; desc='Disable Fast Boot for cleaner shutdowns and driver resets' }
    '3'  = @{ name='Timer Resolution'; tier='SAFE'; desc='Manual step: Requires timer-tool.ps1 before gaming' }
    '4'  = @{ name='Power Plan'; tier='SAFE'; desc='Enable High Performance power plan' }
    '5'  = @{ name='USB Power'; tier='SAFE'; desc='Disable USB selective suspend (prevents device disconnects)' }
    '6'  = @{ name='PCIe Power'; tier='SAFE'; desc='Disable PCIe power saving for GPU stability' }
    '7'  = @{ name='DNS Provider'; tier='SAFE'; desc='Set DNS servers to selected provider' }
    '8'  = @{ name='Nagle Algorithm'; tier='SAFE'; desc='Disable Nagle buffering for lower network latency' }
    '9'  = @{ name='Audio Ducking'; tier='SAFE'; desc='Disable audio volume reduction during calls' }
    '10' = @{ name='Game DVR'; tier='SAFE'; desc='Disable background game recording' }
    '11' = @{ name='Background Apps'; tier='SAFE'; desc='Disable background app activity' }
    '13' = @{ name='Copilot'; tier='SAFE'; desc='Disable Windows Copilot' }
    '16' = @{ name='Razer Block'; tier='SAFE'; desc='Stop and disable Razer background services' }
    '17' = @{ name='Restore Point'; tier='SAFE'; desc='Create system restore point before changes' }
    '20' = @{ name='Visual Effects'; tier='SAFE'; desc='Set visual effects to performance mode' }
    '21' = @{ name='End Task'; tier='SAFE'; desc='Enable End Task option in taskbar' }
    '23' = @{ name='Notifications'; tier='SAFE'; desc='Disable notification center and toasts' }
    '25' = @{ name='Multiplane Overlay'; tier='SAFE'; desc='Disable DWM overlay for cleaner fullscreen' }
    '26' = @{ name='Mouse Acceleration'; tier='SAFE'; desc='Disable mouse acceleration for raw input' }
    '27' = @{ name='USB Suspend'; tier='SAFE'; desc='Disable USB selective suspend' }
    '28' = @{ name='Keyboard Response'; tier='SAFE'; desc='Minimize keyboard delay and maximize repeat rate' }
    '29' = @{ name='Game Mode'; tier='SAFE'; desc='Enable Windows Game Mode' }
    '30' = @{ name='Min Processor'; tier='SAFE'; desc='Set minimum processor state to 5% (better thermals)' }
    '31' = @{ name='Hibernation'; tier='SAFE'; desc='Disable hibernation (saves disk space)' }
    '32' = @{ name='RSS'; tier='SAFE'; desc='Enable Receive Side Scaling for network' }
    '33' = @{ name='Adapter Power'; tier='SAFE'; desc='Disable network adapter power saving' }
    '34' = @{ name='Delivery Opt'; tier='SAFE'; desc='Disable P2P update delivery' }
    '40' = @{ name='Accessibility'; tier='SAFE'; desc='Disable Sticky Keys and other shortcuts' }
    '41' = @{ name='Audio Comm'; tier='SAFE'; desc='Disable volume ducking during communications' }
    '42' = @{ name='System Sounds'; tier='SAFE'; desc='Mute Windows system sounds' }
    '43' = @{ name='Input Buffer'; tier='SAFE'; desc='Increase input buffer for high poll rate devices' }
    '44' = @{ name='Filesystem'; tier='SAFE'; desc='Optimize NTFS settings (disable last access, 8.3 names)' }
    '45' = @{ name='DWM Perf'; tier='SAFE'; desc='Optimize Desktop Window Manager settings' }

    # CAUTION tier (50-72)
    '50' = @{ name='MSI Mode'; tier='CAUTION'; desc='Enable Message Signaled Interrupts for GPU (lower DPC latency)' }
    '51' = @{ name='HPET'; tier='CAUTION'; desc='Disable High Precision Event Timer (test before/after)' }
    '52' = @{ name='Game Bar Popups'; tier='CAUTION'; desc='Hide the Game Bar startup panel and tips (Game Bar stays installed)' }
    '53' = @{ name='HAGS'; tier='CAUTION'; desc='Enable Hardware Accelerated GPU Scheduling' }
    '54' = @{ name='FSO'; tier='CAUTION'; desc='Disable fullscreen optimizations globally' }
    '55' = @{ name='Ultimate Perf'; tier='CAUTION'; desc='Enable Ultimate Performance power plan' }
    '59' = @{ name='QoS Gaming'; tier='CAUTION'; desc='Remove bandwidth reservations for gaming' }
    '60' = @{ name='Network Throttle'; tier='CAUTION'; desc='Disable network throttling during multimedia' }
    '61' = @{ name='GPU Affinity'; tier='CAUTION'; desc='Set GPU interrupt affinity to CPU 0' }
    '62' = @{ name='Mitigations'; tier='CAUTION'; desc='Disable kernel shadow stacks (reduces security)' }
    '63' = @{ name='MMCSS'; tier='CAUTION'; desc='Configure multimedia class scheduler for games' }
    '64' = @{ name='Scheduler'; tier='CAUTION'; desc='Optimize thread scheduler for responsiveness' }
    '65' = @{ name='Core Parking'; tier='CAUTION'; desc='Disable CPU core parking' }
    '66' = @{ name='Timer Registry'; tier='CAUTION'; desc='Enable global timer resolution requests' }
    '67' = @{ name='RSC'; tier='CAUTION'; desc='Disable Receive Segment Coalescing' }
    '68' = @{ name='SysMain'; tier='CAUTION'; desc='Disable SysMain/Superfetch service' }
    '69' = @{ name='Search'; tier='CAUTION'; desc='Set Windows Search to manual (stops indexing)' }
    '70' = @{ name='Memory Gaming'; tier='CAUTION'; desc='Keep kernel in RAM (disable paging executive)' }
    '71' = @{ name='Power Throttle'; tier='CAUTION'; desc='Disable CPU power throttling' }
    '72' = @{ name='Priority Boost'; tier='CAUTION'; desc='Disable priority boost (consistent scheduling)' }

    # RISKY tier (80-89)
    '84' = @{ name='IPv4 Prefer'; tier='RISKY'; desc='Prefer IPv4 over IPv6' }
    '85' = @{ name='Teredo'; tier='RISKY'; desc='Disable Teredo tunneling' }
    '86' = @{ name='Native NVMe'; tier='RISKY'; desc='Enable native NVMe stack (Win11 24H2+)' }
    '87' = @{ name='SMT'; tier='RISKY'; desc='Disable SMT/Hyperthreading (physical cores only)' }
    '88' = @{ name='Audio Exclusive'; tier='RISKY'; desc='Configure audio for exclusive mode apps' }
    '89' = @{ name='TCP Optimizer'; tier='RISKY'; desc='Apply TCP optimizations for gaming' }

    # FR33THY Phase (104+)
    '104' = @{ name='Background Polling'; tier='SAFE'; desc='Unlock full mouse polling rate in background windows' }
    '105' = @{ name='AMD ULPS'; tier='CAUTION'; desc='Disable AMD Ultra Low Power State (prevents downclock stutters)' }
    '106' = @{ name='NVIDIA P0 State'; tier='RISKY'; desc='Force GPU to max clocks (increases heat/power!)' }
    '107' = @{ name='Network Binding Strip'; tier='RISKY'; desc='Remove IPv6/sharing bindings (breaks file sharing!)' }
    '108' = @{ name='NIC Interrupt Moderation'; tier='SAFE'; desc='Disable interrupt coalescing (lower network latency)' }
    '109' = @{ name='NIC Flow Control'; tier='SAFE'; desc='Disable 802.3x flow control (less packet buffering)' }
    '110' = @{ name='NIC Energy Efficient Ethernet'; tier='SAFE'; desc='Disable EEE/Green Ethernet (no wake latency)' }
    '111' = @{ name='Browser Background Apps'; tier='SAFE'; desc='Stop Chrome/Edge running in the background when closed' }

    # Windows 11 background load and game-session fixes (113+)
    '113' = @{ name='Windows AI Off'; tier='SAFE'; desc='Recall, Click to Do, AI Fabric service, Notepad/Paint AI off' }
    '114' = @{ name='Widgets Off'; tier='SAFE'; desc='Widgets board, taskbar button and its background web process off' }
    '118' = @{ name='Game Bar Popup Fix'; tier='SAFE'; desc='Stops the ms-gamebar popup when Game Bar is off (skipped on X3D)' }
    '119' = @{ name='No Surprise Reboots'; tier='SAFE'; desc='Windows Update never auto-restarts while you are signed in' }
    '112' = @{ name='Maintenance Tasks Off'; tier='CAUTION'; desc='No update scans, defrag or Defender full scans mid-game' }
    '121' = @{ name='Windowed Game Optimizations'; tier='SAFE'; desc='Borderless DX10/DX11 games use flip model (Win11 22H2+)' }
    '122' = @{ name='VRR for Older Games'; tier='SAFE'; desc='Variable refresh rate for DX9-DX11 games without it' }
    '123' = @{ name='Defender Scans When Idle'; tier='SAFE'; desc='Scheduled scans wait for idle, low CPU priority' }
    '124' = @{ name='Gaming Active Hours'; tier='SAFE'; desc='No update restarts 10:00-04:00' }
    '125' = @{ name='Defender Skips Game Folders'; tier='CAUTION'; desc='Steam, Epic, EA and Xbox libraries not scanned in real time' }
}

# ============================================================================
# OPTIMIZATION FUNCTIONS (by ID from share-registry.ts)
# NOTE: LUDICROUS tier IDs (100-103) are intentionally NOT included
# ============================================================================

$OPT_FUNCTIONS = @{
    # SAFE tier (1-45)
    '1' = { # pagefile
        $ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum).Sum/1GB)
        if ($ram -ge 16) {
            $size = 8192
            if ($ram -ge 32) { $size = 4096 }
            $pfName = "$env:SystemDrive\pagefile.sys"
            $cs = Get-CimInstance Win32_ComputerSystem
            $wasAuto = [bool]$cs.AutomaticManagedPagefile
            try {
                if ($wasAuto) { Set-CimInstance -InputObject $cs -Property @{ AutomaticManagedPagefile = $false } -EA Stop }
                $pf = Get-CimInstance Win32_PageFileSetting -EA SilentlyContinue | Where-Object { $_.Name -eq $pfName } | Select-Object -First 1
                if (-not $pf) { $pf = New-CimInstance -ClassName Win32_PageFileSetting -Property @{ Name = $pfName } -EA Stop }
                Set-CimInstance -InputObject $pf -Property @{ InitialSize = [uint32]$size; MaximumSize = [uint32]$size } -EA Stop
                Write-OK "Page file set to $size MB fixed (reboot to apply)"
            } catch {
                if ($wasAuto) { try { Set-CimInstance -InputObject (Get-CimInstance Win32_ComputerSystem) -Property @{ AutomaticManagedPagefile = $true } -EA Stop } catch { } }
                Write-Warn "Page file change failed, automatic management kept"
            }
        } else { Write-Host "  [SKIP] Fixed page file (needs 16 GB+ RAM)" -ForegroundColor DarkGray }
    }
    '2' = { # fastboot
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "HiberbootEnabled" 0 -PassThru) { Write-OK "Fast startup disabled" }
    }
    '3' = { # timer
        Write-Host ""
        Write-Host "  [!] MANUAL STEP: Timer Resolution" -ForegroundColor Yellow
        Write-Host "      Download and run timer-tool.ps1 before gaming" -ForegroundColor Yellow
        Write-Host "      https://github.com/thepedroferrari/rocktune" -ForegroundColor Cyan
        Write-Host ""
    }
    '4' = { # power_plan
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK "High Performance power plan enabled" } else { Write-Warn "High Performance plan not available" }
    }
    '5' = { # usb_power
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\USB\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1
        Write-OK "USB selective suspend disabled"
    }
    '6' = { # pcie_power
        powercfg /setacvalueindex scheme_current sub_pciexpress ee12f906-d166-476a-8f3a-af931b6e9d31 0 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "PCIe power saving disabled"
        } else { Write-Warn "PCIe power setting not supported" }
    }
    '7' = { # dns - handled separately with dnsId
        # This is a placeholder - actual DNS setting is done in main logic
    }
    '8' = { # nagle
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($adapter in $adapters) {
            $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($adapter.InterfaceGuid)"
            Set-Reg $path "TcpAckFrequency" 1
            Set-Reg $path "TCPNoDelay" 1
        }
        Write-OK "Nagle algorithm disabled"
    }
    '9' = { # audio_enhancements
        Set-Reg "HKCU:\Software\Microsoft\Multimedia\Audio" "UserDuckingPreference" 3
        Write-OK "Audio ducking disabled"
    }
    '10' = { # gamedvr
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_Enabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" "AllowGameDVR" 0
        Write-OK "Game DVR disabled"
    }
    '11' = { # background_apps
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" "GlobalUserDisabled" 1
        Write-OK "Background apps disabled"
    }
    '13' = { # copilot_disable
        Set-Reg "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" "TurnOffWindowsCopilot" 1
        Write-OK "Copilot disabled"
    }
    '16' = { # razer_block -> block OEM/peripheral app auto-installs (services untouched)
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Device Metadata" "PreventDeviceMetadataFromNetwork" 1
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata" "PreventDeviceMetadataFromNetwork" 1
        Write-OK "Device app auto-installs blocked (Synapse / G HUB you install keep working)"
    }
    '17' = { # restore_point
        $hasPoints = $null
        try { $hasPoints = Get-ComputerRestorePoint -EA Stop } catch { $hasPoints = $null }
        if (-not $hasPoints) {
            try { Enable-ComputerRestore -Drive "$env:SystemDrive\" -EA Stop } catch { Write-Warn "Could not enable System Protection" }
        }
        # Windows silently skips a second restore point within 24h unless this is 0
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" "SystemRestorePointCreationFrequency" 0
        try {
            Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop -WarningAction SilentlyContinue
            Write-OK "Restore point created"
        } catch {
            Write-Warn "Could not create restore point: $($_.Exception.Message)"
        }
    }
    '20' = { # display_perf
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" 2
        Write-OK "Visual effects set to performance"
    }
    '21' = { # end_task
        if (-not $script:IsWin11) {
            Write-Warn "End Task in taskbar is a Windows 11 feature"
            return
        }
        if (Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings" "TaskbarEndTask" 1 -PassThru) { Write-OK "End Task enabled in taskbar" }
    }
    '23' = { # notifications_off
        Set-Reg "HKCU:\Software\Policies\Microsoft\Windows\Explorer" "DisableNotificationCenter" 1
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" "ToastEnabled" 0
        Write-OK "Notifications disabled"
    }
    '25' = { # multiplane_overlay
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" "OverlayTestMode" 5
        Write-OK "Multiplane Overlay disabled"
    }
    '26' = { # mouse_accel
        if (Set-Reg "HKCU:\Control Panel\Mouse" "MouseSpeed" "0" "String" -PassThru) { Write-OK "Mouse acceleration disabled" }
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold1" "0" "String"
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold2" "0" "String"
    }
    '27' = { # usb_suspend
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\USB\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1
        Write-OK "USB selective suspend disabled"
    }
    '28' = { # keyboard_response
        if (Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardDelay" "0" "String" -PassThru) { Write-OK "Keyboard delay minimized" }
        Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardSpeed" "31" "String"
    }
    '29' = { # game_mode
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AllowAutoGameMode" 1
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AutoGameModeEnabled" 1
        Write-OK "Game Mode enabled"
    }
    '30' = { # min_processor_state
        powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "Min processor state set to 5%"
        } else { Write-Warn "Min processor state setting not supported" }
    }
    '31' = { # hibernation_disable
        powercfg /hibernate off 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK "Hibernation disabled" } else { Write-Warn "Could not disable hibernation" }
    }
    '32' = { # rss_enable
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Enable-NetAdapterRss -Name $_.Name -EA SilentlyContinue
        }
        Write-OK "RSS enabled on active adapters"
    }
    '33' = { # adapter_power
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Set-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket Disabled -WakeOnPattern Disabled -EA SilentlyContinue
        }
        Write-OK "Network adapter power saving disabled"
    }
    '34' = { # delivery_opt
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" "DODownloadMode" 0
        Write-OK "Delivery Optimization P2P disabled"
    }
    '40' = { # accessibility_shortcuts
        Set-Reg "HKCU:\Control Panel\Accessibility\StickyKeys" "Flags" "506" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\Keyboard Response" "Flags" "122" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\ToggleKeys" "Flags" "58" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\MouseKeys" "Flags" "58" "String"
        Write-OK "Accessibility shortcuts disabled (no more Sticky Keys popup)"
    }
    '41' = { # audio_communications
        Set-Reg "HKCU:\Software\Microsoft\Multimedia\Audio" "UserDuckingPreference" 3
        Write-OK "Volume ducking disabled (full volume during calls)"
    }
    '42' = { # audio_system_sounds
        Set-Reg "HKCU:\AppEvents\Schemes" "(Default)" ".None" "String"
        Get-ChildItem "HKCU:\AppEvents\Schemes\Apps" -Recurse | Where-Object {$_.PSChildName -eq ".Current"} | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name "(Default)" -Value "" -EA SilentlyContinue }
        Write-OK "Windows system sounds muted"
    }
    '43' = { # input_buffer -> restore default queue size (100) where it was shrunk
        $mPath = "HKLM:\SYSTEM\CurrentControlSet\Services\mouclass\Parameters"
        $kPath = "HKLM:\SYSTEM\CurrentControlSet\Services\kbdclass\Parameters"
        $mq = (Get-ItemProperty $mPath -Name "MouseDataQueueSize" -EA SilentlyContinue).MouseDataQueueSize
        $kq = (Get-ItemProperty $kPath -Name "KeyboardDataQueueSize" -EA SilentlyContinue).KeyboardDataQueueSize
        if ($null -ne $mq -and $mq -lt 100) { Set-Reg $mPath "MouseDataQueueSize" 100 }
        if ($null -ne $kq -and $kq -lt 100) { Set-Reg $kPath "KeyboardDataQueueSize" 100 }
        Write-OK "Input queues at Windows default (100) or larger"
    }
    '44' = { # filesystem_perf
        fsutil behavior set disablelastaccess 1 >$null 2>&1
        fsutil behavior set disable8dot3 1 >$null 2>&1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" "NtfsMemoryUsage" 2
        Write-OK "Filesystem performance optimized"
    }
    '45' = { # dwm_perf
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "AccentColorInactive" 1
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "ColorPrevalence" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "EnableAeroPeek" 0
        Write-OK "DWM performance optimized"
    }

    # CAUTION tier (50-72)
    '50' = { # msi_mode
        $gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1
        if ($gpu) {
            $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.InstanceId)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
            if (Test-Path $msiPath) { Set-Reg $msiPath "MSISupported" 1; Write-OK "MSI mode enabled for GPU" }
        }
    }
    '51' = { # hpet
        bcdedit /set useplatformclock false 2>$null
        bcdedit /set disabledynamictick yes 2>$null
        Write-OK "HPET disabled (reboot required)"
    }
    '52' = { # game_bar
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "ShowStartupPanel" 0
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "GamePanelStartupTipIndex" 3
        Write-OK "Game Bar overlays disabled"
    }
    '53' = { # hags
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" "HwSchMode" 2 -PassThru) { Write-OK "HAGS enabled" }
    }
    '54' = { # fso_disable
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehaviorMode" 2
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" 1
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehavior" 2
        Write-OK "Fullscreen optimizations disabled"
    }
    '55' = { # ultimate_perf (fixed GUID: no duplicate plans, works on any Windows language)
        $rtPlan = "52f3b1c6-9d7a-4f0e-8b3a-726f636b7475"
        $null = powercfg /query $rtPlan 2>&1
        if ($LASTEXITCODE -ne 0) { $null = powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 $rtPlan 2>&1 }
        $null = powercfg /setactive $rtPlan 2>&1
        if ($LASTEXITCODE -eq 0) { Write-OK "Ultimate Performance enabled" }
        else {
            $null = powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1
            Write-Warn "Ultimate Performance unavailable - High Performance used instead"
        }
    }
    '59' = { # qos_gaming
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" "NonBestEffortLimit" 0
        Write-OK "QoS gaming configured"
    }
    '60' = { # network_throttling
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" "NetworkThrottlingIndex" 0xffffffff
        Write-OK "Network throttling disabled"
    }
    '61' = { # interrupt_affinity (REG_BINARY KAFFINITY mask, off CPU 0)
        $gpu = Get-PnpDevice -Class Display -EA SilentlyContinue | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1
        $lp = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
        if ($gpu -and $lp -ge 2) {
            $irqCpu = 1
            if ($lp -ge 4) { $irqCpu = 2 }
            $mask = [byte[]](0,0,0,0,0,0,0,0)
            $mask[0] = [byte](1 -shl $irqCpu)
            $affPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.InstanceId)\Device Parameters\Interrupt Management\Affinity Policy"
            Set-Reg $affPath "DevicePolicy" 3
            Set-Reg $affPath "AssignmentSetOverride" $mask "Binary"
            Write-OK "GPU interrupts pinned to CPU $irqCpu (reboot to apply)"
        } else { Write-Warn "No active GPU found, interrupt affinity skipped" }
    }
    '62' = { # process_mitigation
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "KernelShadowStacksForceDisabled" 1
        Write-OK "Process mitigations disabled (security reduced)"
    }
    '63' = { # mmcss_gaming
        $mmcss = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
        Set-Reg $mmcss "GPU Priority" 8
        Set-Reg $mmcss "Priority" 6
        Set-Reg $mmcss "Scheduling Category" "High" "String"
        Set-Reg $mmcss "SFIO Priority" "High" "String"
        Write-OK "MMCSS gaming priority configured"
    }
    '64' = { # scheduler_opt
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PrioritySeparation" 26
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "IRQ8Priority" 1
        Write-OK "Scheduler optimized for gaming"
    }
    '65' = { # core_parking
        powercfg /setacvalueindex scheme_current sub_processor CPMINCORES 100 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "Core parking disabled"
        } else { Write-Warn "Core parking setting not supported" }
    }
    '66' = { # timer_registry
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "GlobalTimerResolutionRequests" 1
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" "SystemResponsiveness" 0
        Write-OK "Timer resolution registry configured"
    }
    '67' = { # rsc_disable
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Disable-NetAdapterRsc -Name $_.Name -EA SilentlyContinue
        }
        Write-OK "RSC disabled on active adapters"
    }
    '68' = { # sysmain_disable
        Stop-Service SysMain -Force -EA SilentlyContinue
        Set-Service SysMain -StartupType Disabled -EA SilentlyContinue
        Write-OK "SysMain/Superfetch disabled"
    }
    '69' = { # services_search_off
        Stop-Service WSearch -Force -EA SilentlyContinue
        Set-Service WSearch -StartupType Manual -EA SilentlyContinue
        Write-OK "Windows Search set to Manual (stops disk indexing)"
    }
    '70' = { # memory_gaming
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" "DisablePagingExecutive" 1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" "LargeSystemCache" 0
        Write-OK "Memory gaming mode enabled (kernel stays in RAM)"
    }
    '71' = { # power_throttle_off
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" "PowerThrottlingOff" 1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "EcoQosPolicyDisabled" 1
        Write-OK "Power throttling disabled"
    }
    '72' = { # priority_boost_off
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PriorityBoost" 0
        Write-OK "Priority boost disabled (consistent scheduling)"
    }

    # RISKY tier (80-89)
    '84' = { # ipv4_prefer
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" "DisabledComponents" 32
        Write-OK "IPv4 preferred over IPv6"
    }
    '85' = { # teredo_disable
        netsh interface teredo set state disabled 2>$null
        Write-OK "Teredo disabled"
    }
    '86' = { # native_nvme
        $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
        if ($build -ge 26100) {
            $nvmePath = "HKLM:\SYSTEM\CurrentControlSet\Policies\Microsoft\FeatureManagement\Overrides"
            if (-not (Test-Path $nvmePath)) { New-Item -Path $nvmePath -Force | Out-Null }
            Set-Reg $nvmePath "1176759950" 1
            Write-OK "Native NVMe enabled (reboot required)"
        } else { Write-Fail "Native NVMe requires Win11 24H2+" }
    }
    '87' = { # smt_disable -> BIOS guidance (bcdedit numproc keeps SMT on and halves cores)
        $np = bcdedit /enum "{current}" 2>$null | Select-String -Pattern "^numproc"
        if ($np) { $null = bcdedit /deletevalue numproc 2>&1; Write-OK "Removed numproc core limit (it was halving your cores)" }
        $cpuInfo = Get-CimInstance Win32_Processor
        $phys = ($cpuInfo | Measure-Object NumberOfCores -Sum).Sum
        $logi = ($cpuInfo | Measure-Object NumberOfLogicalProcessors -Sum).Sum
        if ($logi -le $phys) { Write-OK "SMT/Hyperthreading already off ($phys cores)" }
        else {
            Write-Warn "SMT is on ($phys cores / $logi threads). Turn it off in BIOS/UEFI:"
            Write-Host "      AMD: Advanced > AMD CBS > CPU Common Options > SMT Control = Disabled" -ForegroundColor Gray
            Write-Host "      Intel: Advanced > CPU Configuration > Hyper-Threading = Disabled" -ForegroundColor Gray
        }
    }
    '88' = { # audio_exclusive
        Set-Reg "HKCU:\AppEvents\Schemes" "(Default)" ".None" "String"
        Write-OK "System sounds disabled for exclusive mode"
    }
    '89' = { # tcp_optimizer
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($adapter in $adapters) {
            $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($adapter.InterfaceGuid)"
            Set-Reg $path "TcpAckFrequency" 1
            Set-Reg $path "TCPNoDelay" 1
        }
        Write-OK "TCP optimizer applied"
    }

    # FR33THY Phase (104+)
    '104' = { # background_polling
        if (Set-Reg "HKCU:\Control Panel\Mouse" "RawMouseThrottleEnabled" 0 -PassThru) {
            Write-OK "Background mouse polling unlocked (full rate in background windows)"
        }
    }
    '105' = { # amd_ulps_disable
        $gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        $foundAmd = $false
        Get-ChildItem $gpuPath -EA SilentlyContinue | ForEach-Object {
            try {
                $desc = Get-ItemPropertyValue $_.PSPath "DriverDesc" -EA SilentlyContinue
                if ($desc -match "AMD|Radeon") {
                    $foundAmd = $true
                    Set-Reg $_.PSPath "EnableUlps" 0
                    Set-Reg $_.PSPath "EnableUlps_NA" 0
                }
            } catch {}
        }
        if ($foundAmd) { Write-OK "AMD ULPS disabled (no more downclock stutters)" }
        else { Write-Warn "No AMD GPU found, ULPS skip" }
    }
    '106' = { # nvidia_p0_state
        $gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        $foundNv = $false
        Get-ChildItem $gpuPath -EA SilentlyContinue | ForEach-Object {
            try {
                $desc = Get-ItemPropertyValue $_.PSPath "DriverDesc" -EA SilentlyContinue
                if ($desc -match "NVIDIA|GeForce") {
                    $foundNv = $true
                    Set-Reg $_.PSPath "DisableDynamicPstate" 1
                }
            } catch {}
        }
        if ($foundNv) {
            Write-OK "NVIDIA P0 state forced (constant max clocks)"
            Write-Warn "GPU will run hotter - monitor temperatures!"
        }
        else { Write-Warn "No NVIDIA GPU found, P0 skip" }
    }
    '107' = { # network_binding_strip
        Write-Warn "Stripping network bindings (breaks file/printer sharing!)"
        $bindings = @("ms_lldp","ms_lltdio","ms_implat","ms_rspndr","ms_tcpip6","ms_server","ms_msclient","ms_pacer")
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        $count = 0
        foreach ($adapter in $adapters) {
            foreach ($binding in $bindings) {
                try {
                    $current = Get-NetAdapterBinding -Name $adapter.Name -ComponentID $binding -EA Stop
                    if ($current.Enabled) {
                        Disable-NetAdapterBinding -Name $adapter.Name -ComponentID $binding -EA Stop
                        $count++
                    }
                } catch {}
            }
        }
        if ($count -gt 0) { Write-OK "Stripped $count network bindings (IPv4 only mode)" }
        else { Write-Warn "No bindings modified (may already be stripped)" }
    }
    '108' = { # nic_interrupt_mod
        $nicCount = 0
        foreach ($adapter in @(Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq "Up" })) {
            try {
                $prop = Get-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*InterruptModeration" -EA Stop
                if ($prop.RegistryValue -ne "0") {
                    Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*InterruptModeration" -RegistryValue "0" -EA Stop
                    $nicCount++
                }
            } catch { }
        }
        if ($nicCount -gt 0) { Write-OK "NIC interrupt moderation disabled on $nicCount adapter(s)" }
        else { Write-Warn "NIC interrupt moderation: not supported or already disabled" }
    }
    '109' = { # nic_flow_control
        $nicCount = 0
        foreach ($adapter in @(Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq "Up" })) {
            try {
                $prop = Get-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*FlowControl" -EA Stop
                if ($prop.RegistryValue -ne "0") {
                    Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword "*FlowControl" -RegistryValue "0" -EA Stop
                    $nicCount++
                }
            } catch { }
        }
        if ($nicCount -gt 0) { Write-OK "NIC flow control disabled on $nicCount adapter(s)" }
        else { Write-Warn "NIC flow control: not supported or already disabled" }
    }
    '110' = { # nic_energy_efficient
        $nicCount = 0
        foreach ($adapter in @(Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq "Up" })) {
            try {
                $keyword = $null
                foreach ($k in @("*EEE", "EEELinkAdvertisement")) {
                    if (Get-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword $k -EA SilentlyContinue) { $keyword = $k; break }
                }
                if ($keyword) {
                    $prop = Get-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword $keyword -EA Stop
                    if ($prop.RegistryValue -ne "0") {
                        Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword $keyword -RegistryValue "0" -EA Stop
                        $nicCount++
                    }
                }
            } catch { }
        }
        if ($nicCount -gt 0) { Write-OK "NIC Energy Efficient Ethernet disabled on $nicCount adapter(s)" }
        else { Write-Warn "NIC EEE: not supported or already disabled" }
    }
    '111' = { # browser_background
        $browserCount = 0
        $chromePath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
        if (Set-Reg $chromePath "BackgroundModeEnabled" 0 -PassThru) { $browserCount++ }
        $edgePath = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        if (Set-Reg $edgePath "BackgroundModeEnabled" 0 -PassThru) { $browserCount++ }
        if (Set-Reg $edgePath "StartupBoostEnabled" 0 -PassThru) { $browserCount++ }
        if (Set-Reg $edgePath "BackgroundExtensionsEnabled" 0 -PassThru) { $browserCount++ }
        if ($browserCount -gt 0) { Write-OK "Browser background apps disabled ($browserCount policies)" }
        else { Write-Fail "Browser background policies could not be written" }
    }

    # Windows 11 background load and game-session fixes (113+)
    '113' = { # ai_off
        $aiPol = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
        Set-Reg $aiPol "AllowRecallEnablement" 0
        Set-Reg $aiPol "DisableAIDataAnalysis" 1
        Set-Reg $aiPol "TurnOffSavingSnapshots" 1
        Set-Reg $aiPol "DisableClickToDo" 1
        Set-Reg $aiPol "DisableSettingsAgent" 1
        Set-Reg "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" "DisableAIDataAnalysis" 1
        Set-Reg "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI" "DisableClickToDo" 1
        Set-Reg "HKLM:\SOFTWARE\Policies\WindowsNotepad" "DisableAIFeatures" 1
        foreach ($n in @("DisableCocreator", "DisableGenerativeFill", "DisableImageCreator", "DisableGenerativeErase", "DisableRemoveBackground")) {
            Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Paint" $n 1
        }
        if (Test-Path "HKLM:\SYSTEM\CurrentControlSet\Services\WSAIFabricSvc") {
            Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\WSAIFabricSvc" "Start" 3
            Stop-Service WSAIFabricSvc -Force -EA SilentlyContinue
        }
        if ($script:IsWin11_24H2) {
            $recall = Get-WindowsOptionalFeature -Online -FeatureName "Recall" -EA SilentlyContinue
            if ($recall -and $recall.State -eq "Enabled") { Disable-WindowsOptionalFeature -Online -FeatureName "Recall" -NoRestart -EA SilentlyContinue | Out-Null }
        }
        Write-OK "Windows AI off (Recall, Click to Do, AI service, Notepad/Paint AI)"
    }
    '114' = { # widgets_off
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" "AllowNewsAndInterests" 0
        Get-Process -Name "Widgets", "WidgetService" -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
        Write-OK "Widgets off (taskbar button disappears after sign-out)"
    }
    '118' = { # gamebar_popup_fix
        if ($cpuId -eq '1') { Write-Host "  [SKIP] Game Bar popup fix (X3D CPUs need Game Bar detection)" -ForegroundColor DarkGray; return }
        Set-Reg "HKCU:\SOFTWARE\Microsoft\GameBar" "UseNexusForGameBarEnabled" 0
        foreach ($proto in @("ms-gamebar", "ms-gamebarservices")) {
            $base = "HKLM:\SOFTWARE\Classes\$proto"
            Set-Reg $base "(Default)" "URL:$proto" "String"
            Set-Reg $base "URL Protocol" "" "String"
            Set-Reg $base "NoOpenWith" "" "String"
            Set-Reg "$base\shell\open\command" "(Default)" "%SystemRoot%\System32\systray.exe" "ExpandString"
        }
        Write-OK "ms-gamebar links no longer show a popup"
    }
    '119' = { # update_no_reboot
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" "NoAutoRebootWithLoggedOnUsers" 1
        Set-Reg "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" "IsContinuousInnovationOptedIn" 0
        Write-OK "Windows Update will not auto-reboot while you are signed in"
    }
    '112' = { # scheduled_tasks_gaming
        $tasks = @(
            "Microsoft\Windows\WindowsUpdate\Scheduled Start",
            "Microsoft\Windows\UpdateOrchestrator\Schedule Scan",
            "Microsoft\Windows\UpdateOrchestrator\Schedule Wake To Work",
            "Microsoft\Windows\UpdateOrchestrator\USO_UxBroker",
            "Microsoft\Windows\Windows Defender\Windows Defender Scheduled Scan",
            "Microsoft\Windows\Windows Defender\Windows Defender Cache Maintenance",
            "Microsoft\Windows\Windows Defender\Windows Defender Cleanup",
            "Microsoft\Windows\Windows Defender\Windows Defender Verification",
            "Microsoft\Windows\TaskScheduler\Regular Maintenance",
            "Microsoft\Windows\Diagnosis\Scheduled",
            "Microsoft\Windows\Maintenance\WinSAT",
            "Microsoft\Windows\Defrag\ScheduledDefrag",
            "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
            "Microsoft\Windows\Application Experience\ProgramDataUpdater"
        )
        $count = 0
        foreach ($t in $tasks) {
            $full = '\' + $t
            $name = Split-Path $full -Leaf
            $folder = (Split-Path $full -Parent).TrimEnd('\') + '\'
            $task = Get-ScheduledTask -TaskPath $folder -TaskName $name -EA SilentlyContinue
            if ($task -and $task.State -ne 'Disabled') {
                try { Disable-ScheduledTask -TaskPath $folder -TaskName $name -EA Stop | Out-Null; $count++ } catch { }
            }
        }
        Write-OK "Disabled $count maintenance tasks"
    }
    '121' = { # windowed_optimizations
        if ($script:WinBuild -lt 22621) { Write-Host "  [SKIP] Windowed game optimizations (needs Windows 11 22H2+)" -ForegroundColor DarkGray; return }
        if (Set-DxGlobalSetting "SwapEffectUpgradeEnable" "1") { Write-OK "Optimizations for windowed games on" }
        else { Write-Fail "Windowed game optimizations could not be written" }
    }
    '122' = { # vrr_optimizations
        if ($script:WinBuild -lt 18362) { Write-Host "  [SKIP] VRR for older games (needs Windows 10 1903+)" -ForegroundColor DarkGray; return }
        if (Set-DxGlobalSetting "VRROptimizeEnable" "1") { Write-OK "Variable refresh rate for older DirectX games on" }
        else { Write-Fail "VRR for older games could not be written" }
    }
    '123' = { # defender_scan_idle
        if (-not (Test-DefenderActive)) { Write-Host "  [SKIP] Defender scan settings (Defender is not the active antivirus)" -ForegroundColor DarkGray; return }
        try {
            Set-MpPreference -ScanOnlyIfIdleEnabled $true -ScanAvgCPULoadFactor 20 -EnableLowCpuPriority $true -EA Stop
            Write-OK "Defender scans: idle only, low CPU priority, 20% CPU cap"
        } catch { Write-Warn "Defender scan settings unchanged: $($_.Exception.Message)" }
    }
    '124' = { # active_hours_gaming
        $wuPol = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
        $ahOk = (Set-Reg $wuPol "SetActiveHours" 1 -PassThru)
        $ahOk = (Set-Reg $wuPol "ActiveHoursStart" 10 -PassThru) -and $ahOk
        $ahOk = (Set-Reg $wuPol "ActiveHoursEnd" 4 -PassThru) -and $ahOk
        if ($ahOk) { Write-OK "Update active hours set to 10:00-04:00" }
        else { Write-Fail "Update active hours could not be written" }
    }
    '125' = { # defender_game_exclusions
        $mp = $null
        if (Test-DefenderActive) { try { $mp = Get-MpPreference -EA Stop } catch { $mp = $null } }
        if (-not $mp) { Write-Host "  [SKIP] Defender exclusions (Defender is not the active antivirus)" -ForegroundColor DarkGray; return }
        $dirs = New-Object System.Collections.Generic.List[string]
        $steamPath = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -Name "SteamPath" -EA SilentlyContinue).SteamPath
        if ($steamPath) {
            $vdf = Join-Path ($steamPath -replace '/', '\') "steamapps\libraryfolders.vdf"
            if (Test-Path -LiteralPath $vdf) {
                foreach ($m in [regex]::Matches([string](Get-Content -LiteralPath $vdf -Raw), '"path"\s+"([^"]+)"')) {
                    # String join, not Join-Path: Join-Path throws on a library drive that is not connected
                    $dirs.Add(($m.Groups[1].Value -replace '\\\\', '\').TrimEnd('\') + '\steamapps\common')
                }
            }
        }
        foreach ($dir in @("$env:ProgramFiles\Epic Games", "$env:ProgramFiles\EA Games", "$env:SystemDrive\XboxGames")) { $dirs.Add($dir) }
        $existing = @($mp.ExclusionPath)
        $added = 0
        foreach ($dir in ($dirs | Select-Object -Unique)) {
            if ((Test-Path -LiteralPath $dir) -and ($existing -notcontains $dir)) {
                try { Add-MpPreference -ExclusionPath $dir -EA Stop; $added++ } catch { Write-Warn "Could not exclude $dir : $($_.Exception.Message)" }
            }
        }
        if ($added -gt 0) { Write-OK "Defender skips $added game library folder(s)" }
        else { Write-Host "  [SKIP] No new game library folders to exclude" -ForegroundColor DarkGray }
    }

    # NOTE: LUDICROUS tier (100-103) intentionally NOT included for security
    # IDs 100, 101, 102, 103 would disable critical security mitigations
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Clear-Host
Write-Banner
Write-Host "  General Windows cleanup is WinUtil or Win11Debloat's job: https://github.com/ChrisTitusTech/winutil | https://github.com/Raphire/Win11Debloat" -ForegroundColor DarkGray
foreach ($rid in $retiredHits) {
    Write-Host "  [skip] $($RETIRED_OPT_IDS[$rid]): moved to WinUtil / Win11Debloat" -ForegroundColor DarkGray
}
Write-Host ""

# Display configuration
$cpuName = if ($cpuId -and $CPU_MAP[$cpuId]) { $CPU_MAP[$cpuId].ToUpper() } else { "Not specified" }
$gpuName = if ($gpuId -and $GPU_MAP[$gpuId]) { $GPU_MAP[$gpuId].ToUpper() } else { "Not specified" }

Write-Host "  Configuration:" -ForegroundColor White
Write-Host "    CPU: $cpuName" -ForegroundColor Gray
Write-Host "    GPU: $gpuName" -ForegroundColor Gray
Write-Host "    Optimizations: $($optIds.Count)" -ForegroundColor Gray
Write-Host "    Packages: $($pkgKeys.Count)" -ForegroundColor Gray
Write-Host ""

# Show system info
$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)
Write-Host "  System:" -ForegroundColor White
Write-Host "    OS:  $script:WinVersion (Build $script:WinBuild)" -ForegroundColor $(if ($script:IsWin11) { "Gray" } else { "Yellow" })
Write-Host "    CPU: $cpu" -ForegroundColor Gray
Write-Host "    GPU: $gpu" -ForegroundColor Gray
Write-Host "    RAM: ${ram}GB" -ForegroundColor Gray

# Win10 compatibility notice
if (-not $script:IsWin11) {
    Write-Host ""
    Write-Host "  ! Windows 10 detected - some Win11-only options will be skipped" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# PRE-FLIGHT SCAN
# ============================================================================

if ($optIds.Count -gt 0) {
    Write-Host "  Scanning current system state..." -ForegroundColor Gray

    # Scan each selected optimization
    foreach ($id in $optIds) {
        $info = $OPT_DESCRIPTIONS[$id]
        if (-not $info) { continue }

        $name = "[$($info.tier)] $($info.name)"
        $current = "-"
        $target = "Will apply"
        $status = "PENDING"

        switch ($id) {
            '1' { # pagefile
                try {
                    $cs = Get-CimInstance Win32_ComputerSystem
                    if ($cs.AutomaticManagedPagefile) {
                        $current = "Auto"
                        $target = "Fixed size"
                        $status = "CHANGE"
                    } else {
                        $current = "Fixed"
                        $status = "OK"
                    }
                } catch { }
            }
            '2' { # fastboot
                try {
                    $val = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -EA SilentlyContinue
                    if ($val.HiberbootEnabled -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '10' { # gamedvr
                try {
                    $val = Get-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -EA SilentlyContinue
                    if ($val.GameDVR_Enabled -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '11' { # background_apps
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -EA SilentlyContinue
                    if ($val.GlobalUserDisabled -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '13' { # copilot_disable
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -EA SilentlyContinue
                    if ($val.TurnOffWindowsCopilot -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '21' { # end_task
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings" -Name "TaskbarEndTask" -EA SilentlyContinue
                    if ($val.TaskbarEndTask -eq 1) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '23' { # notifications_off
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableNotificationCenter" -EA SilentlyContinue
                    if ($val.DisableNotificationCenter -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '26' { # mouse_accel
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -EA SilentlyContinue
                    if ($val.MouseSpeed -eq "0") { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '28' { # keyboard_response
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Keyboard" -Name "KeyboardDelay" -EA SilentlyContinue
                    if ($val.KeyboardDelay -eq "0") { $current = "0ms"; $status = "OK" }
                    else { $current = "$($val.KeyboardDelay)"; $target = "0ms"; $status = "CHANGE" }
                } catch { }
            }
            '29' { # game_mode
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -EA SilentlyContinue
                    if ($val.AutoGameModeEnabled -eq 1) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '52' { # game_bar
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -Name "ShowStartupPanel" -EA SilentlyContinue
                    if ($val.ShowStartupPanel -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '53' { # hags
                try {
                    $val = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -EA SilentlyContinue
                    if ($val.HwSchMode -eq 2) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '54' { # fso_disable
                try {
                    $val = Get-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -EA SilentlyContinue
                    if ($val.GameDVR_FSEBehaviorMode -eq 2) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '68' { # sysmain_disable
                try {
                    $svc = Get-Service SysMain -EA SilentlyContinue
                    if ($svc.StartType -eq 'Disabled') { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '69' { # services_search_off
                try {
                    $svc = Get-Service WSearch -EA SilentlyContinue
                    if ($svc.StartType -eq 'Manual' -or $svc.StartType -eq 'Disabled') { $current = "Manual"; $status = "OK" }
                    else { $current = "Auto"; $target = "Manual"; $status = "CHANGE" }
                } catch { }
            }
            '85' { # teredo_disable
                try {
                    $teredo = netsh interface teredo show state 2>$null | Select-String "Type"
                    if ($teredo -match "disabled") { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '104' { # background_polling
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Mouse" -Name "RawMouseThrottleEnabled" -EA SilentlyContinue
                    if ($val.RawMouseThrottleEnabled -eq 0) { $current = "Unlocked"; $status = "OK" }
                    else { $current = "Throttled"; $target = "Unlocked"; $status = "CHANGE" }
                } catch { }
            }
            '105' { # amd_ulps_disable
                $current = "Check GPU"; $target = "Disabled"; $status = "PENDING"
            }
            '106' { # nvidia_p0_state
                $current = "Check GPU"; $target = "P0 Forced"; $status = "PENDING"
            }
            '107' { # network_binding_strip
                $current = "Multiple"; $target = "IPv4 Only"; $status = "PENDING"
            }
            '7' { # dns - special handling
                if ($dnsId -and $DNS_MAP[$dnsId]) {
                    $dns = $DNS_MAP[$dnsId]
                    $name = "[SAFE] DNS Provider"
                    $target = $dns.name
                    try {
                        $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1
                        if ($adapter) {
                            $dnsServers = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses
                            if ($dnsServers -contains $dns.primary) { $current = $dns.name; $status = "OK" }
                            else { $current = "Other"; $status = "CHANGE" }
                        }
                    } catch { }
                }
            }
        }

        Add-ScanResult $name $current $target $status
    }
}

# ============================================================================
# GAMING COMPATIBILITY CHECK
# ============================================================================
# General cleanup tools (WinUtil, Win11Debloat) and old tweak guides can turn off
# parts of Windows that games need. Each problem adds a WARN row and a fix entry.

$script:CompatFixes = @()
function Add-CompatFix { param([string]$Id, [string]$Label, $Arg) $script:CompatFixes += [PSCustomObject]@{ Id = $Id; Label = $Label; Arg = $Arg } }
function Get-AppxState {
    param([string]$Name)
    try { if (Get-AppxPackage -Name $Name -EA Stop) { return 'Installed' } } catch { return 'Unknown' }
    try { if (Get-AppxPackage -AllUsers -Name $Name -EA Stop) { return 'Unregistered' } } catch { }
    return 'Missing'
}
function Test-CompatAppx {
    param([string]$Name, [string]$Label, [string]$StoreId, [bool]$Required)
    $state = Get-AppxState $Name
    if ($state -eq 'Installed') { Add-ScanResult "[COMPAT] $Label" "Installed" "Installed" "OK"; return }
    if ($state -eq 'Unknown') { Add-ScanResult "[COMPAT] $Label" "Cannot check" "Installed" "INFO"; return }
    if ($state -eq 'Missing' -and -not $Required) { Add-ScanResult "[COMPAT] $Label" "Not installed" "Optional" "INFO"; return }
    Add-ScanResult "[COMPAT] $Label" $state "Installed" "WARN"
    Add-CompatFix 'appx' "Reinstall $Label" @($Name, $StoreId, $Label)
}

$xblDisabled = @()
foreach ($s in @('XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc')) {
    $svc = Get-Service -Name $s -EA SilentlyContinue
    if ($svc -and $svc.StartType.ToString() -eq 'Disabled') { $xblDisabled += $s }
}
if ($xblDisabled.Count -eq 0) { Add-ScanResult "[COMPAT] Xbox services" "Not disabled" "Manual" "OK" }
else {
    Add-ScanResult "[COMPAT] Xbox services" "$($xblDisabled.Count) disabled" "Manual" "WARN"
    Add-CompatFix 'services' "Set Xbox services back to Manual ($($xblDisabled -join ', '))" $xblDisabled
}

$storeState = Get-AppxState 'Microsoft.WindowsStore'
if ($storeState -eq 'Installed') { Add-ScanResult "[COMPAT] Microsoft Store" "Installed" "Installed" "OK" }
elseif ($storeState -eq 'Unknown') { Add-ScanResult "[COMPAT] Microsoft Store" "Cannot check" "Installed" "INFO" }
else {
    Add-ScanResult "[COMPAT] Microsoft Store" $storeState "Installed" "WARN"
    Add-CompatFix 'store' "Reinstall the Microsoft Store (Game Pass downloads need it)" $null
}

if ($cpuId -eq '1') {
    # AMD X3D: the V-Cache driver uses Game Bar to detect games and park the non-cache CCD
    $gbState = Get-AppxState 'Microsoft.XboxGamingOverlay'
    if ($gbState -eq 'Installed') { Add-ScanResult "[COMPAT] Game Bar (X3D)" "Installed" "Installed" "OK" }
    elseif ($gbState -eq 'Unknown') { Add-ScanResult "[COMPAT] Game Bar (X3D)" "Cannot check" "Installed" "INFO" }
    else {
        Add-ScanResult "[COMPAT] Game Bar (X3D)" "$gbState - CRITICAL" "Installed" "WARN"
        Write-Host "  [!] CRITICAL: Game Bar is missing. On X3D CPUs games can run on the slower CCD without it." -ForegroundColor Red
        Add-CompatFix 'appx' "Reinstall Xbox Game Bar (X3D core parking needs it)" @('Microsoft.XboxGamingOverlay', '9NZKPSTSNW4P', 'Xbox Game Bar')
    }
} else {
    Test-CompatAppx 'Microsoft.XboxGamingOverlay' 'Xbox Game Bar' '9NZKPSTSNW4P' $false
}
Test-CompatAppx 'Microsoft.XboxIdentityProvider' 'Xbox Identity Provider' '9WZDNCRD1HKW' $true
Test-CompatAppx 'Microsoft.Xbox.TCUI' 'Xbox TCUI' '' $true
Test-CompatAppx 'Microsoft.GamingApp' 'Xbox app' '9MV0B5HZVK9Z' $false
Test-CompatAppx 'Microsoft.GamingServices' 'Gaming Services' '9MWPM2CQNLHN' $false

$gi = Get-Service -Name 'GameInputSvc' -EA SilentlyContinue
if (-not $gi) { Add-ScanResult "[COMPAT] GameInput service" "Not installed" "Optional" "INFO" }
elseif ($gi.StartType.ToString() -eq 'Disabled') {
    Add-ScanResult "[COMPAT] GameInput service" "Disabled" "Manual" "WARN"
    Add-CompatFix 'gameinput' "Set the GameInput service back to Manual" $null
} else { Add-ScanResult "[COMPAT] GameInput service" $gi.StartType.ToString() "Manual" "OK" }

$doMode = (Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" -EA SilentlyContinue).DODownloadMode
$doStart = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\DoSvc" -EA SilentlyContinue).Start
if ($doMode -eq 100) {
    Add-ScanResult "[COMPAT] Store downloads" "Bypass (100)" "HTTP only (0)" "WARN"
    Add-CompatFix 'do_mode' "Set Delivery Optimization to HTTP only so Store downloads work" $null
} elseif ($doStart -eq 4) {
    Add-ScanResult "[COMPAT] Store downloads" "Service off" "Service on" "WARN"
    Add-CompatFix 'do_service' "Turn the Delivery Optimization service back on (reboot needed)" $null
} else { Add-ScanResult "[COMPAT] Store downloads" "Working" "Working" "OK" }

if ($optIds -notcontains '85') {
    $teredo = (netsh interface teredo show state 2>$null | Out-String)
    if ($teredo -match 'Type\s*:\s*disabled') {
        Add-ScanResult "[COMPAT] Teredo (Xbox party chat)" "Disabled" "Default" "WARN"
        Add-CompatFix 'teredo' "Turn Teredo back on for Xbox party chat" $null
    } elseif ($teredo) { Add-ScanResult "[COMPAT] Teredo (Xbox party chat)" "On" "Default" "OK" }
}

Write-ScanResults

# ============================================================================
# INTERACTIVE APPROVAL MODE
# ============================================================================

function Get-TierColor {
    param([string]$Tier)
    switch ($Tier) {
        'SAFE'    { 'Green' }
        'CAUTION' { 'Yellow' }
        'RISKY'   { 'Red' }
        default   { 'Gray' }
    }
}

function Show-OptimizationPrompt {
    param([string]$Id, [int]$Current, [int]$Total)

    $info = $OPT_DESCRIPTIONS[$Id]
    if (-not $info) {
        $info = @{ name="Unknown ($Id)"; tier='UNKNOWN'; desc='No description available' }
    }

    $tierColor = Get-TierColor $info.tier

    Write-Host ""
    Write-Host "  [$Current/$Total] " -NoNewline -ForegroundColor DarkGray
    Write-Host $info.name -NoNewline -ForegroundColor White
    Write-Host " [" -NoNewline -ForegroundColor DarkGray
    Write-Host $info.tier -NoNewline -ForegroundColor $tierColor
    Write-Host "]" -ForegroundColor DarkGray
    Write-Host "  $($info.desc)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Apply? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
}

# Execute optimizations
if ($optIds.Count -gt 0) {
    Write-Step "Upgrades"
    Write-Host ""
    Write-Host "  +================================================================+" -ForegroundColor White
    Write-Host "  |  INTERACTIVE MODE - Review each optimization before applying   |" -ForegroundColor White
    Write-Host "  +================================================================+" -ForegroundColor White
    Write-Host ""
    Write-Host "  This loadout contains $($optIds.Count) optimization(s)." -ForegroundColor Gray
    Write-Host "  You will be prompted to approve each one." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Tier legend:" -ForegroundColor White
    Write-Host "    SAFE    - " -NoNewline; Write-Host "Low risk, recommended for everyone" -ForegroundColor Green
    Write-Host "    CAUTION - " -NoNewline; Write-Host "May affect some features, test after" -ForegroundColor Yellow
    Write-Host "    RISKY   - " -NoNewline; Write-Host "May break features, know what you're doing" -ForegroundColor Red
    Write-Host ""

    # Restore point runs first so it captures the system before any change
    if ($optIds -contains '17') {
        $optIds = @($optIds | Where-Object { $_ -eq '17' }) + @($optIds | Where-Object { $_ -ne '17' })
    } else {
        Write-Host "  Creating a safety restore point before any change..." -ForegroundColor DarkGray
        try { & $OPT_FUNCTIONS['17'] } catch { Write-Warn "Restore point skipped: $($_.Exception.Message)" }
    }

    $autoApprove = $false
    $consecutiveYes = 0  # Track consecutive Y responses for smart auto-All
    $approvedIds = @()
    $skippedIds = @()
    $quit = $false
    $current = 0
    $total = $optIds.Count

    # Handle DNS separately if specified
    if ($dnsId -and $DNS_MAP[$dnsId] -and ($optIds -contains '7')) {
        $current++
        $dns = $DNS_MAP[$dnsId]
        if (-not $autoApprove) {
            Write-Host ""
            Write-Host "  [$current/$total] " -NoNewline -ForegroundColor DarkGray
            Write-Host "DNS Provider" -NoNewline -ForegroundColor White
            Write-Host " [" -NoNewline -ForegroundColor DarkGray
            Write-Host "SAFE" -NoNewline -ForegroundColor Green
            Write-Host "]" -ForegroundColor DarkGray
            Write-Host "  Set DNS to $($dns.name) ($($dns.primary), $($dns.secondary))" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  Apply? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
            $response = Read-Host
        } else {
            $response = 'y'
        }

        switch ($response.ToLower()) {
            'a' { $autoApprove = $true; $response = 'y' }
            'q' { $quit = $true }
            'n' { $consecutiveYes = 0 }  # Reset on skip
        }

        if (-not $quit -and $response.ToLower() -eq 'y') {
            $consecutiveYes++
            # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
            if ($consecutiveYes -ge 3 -and -not $autoApprove) {
                $autoApprove = $true
                $remaining = $total - $current
                Write-Host ""
                Write-Host "  $([char]0x2192) Auto-applying remaining $remaining optimizations (3 consecutive approvals; RISKY items still ask)" -ForegroundColor Cyan
                Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                Write-Host ""
            }
            # Physical adapters only: VPN, Hyper-V and WSL adapters keep their DNS
            foreach ($nic in @(Get-NetAdapter -Physical -EA SilentlyContinue | Where-Object { $_.Status -eq "Up" })) {
                try { Set-DnsClientServerAddress -InterfaceIndex $nic.ifIndex -ServerAddresses $dns.primary,$dns.secondary -EA Stop }
                catch { Write-Warn "DNS not changed on $($nic.Name): $($_.Exception.Message)" }
            }
            Write-OK "DNS set to $($dns.name)"
            $approvedIds += '7'
        } else {
            $skippedIds += '7'
            if (-not $quit) { Write-Host "  [SKIP] DNS" -ForegroundColor DarkGray }
        }
    }

    foreach ($id in $optIds) {
        if ($quit) { break }
        if ($id -eq '7') { continue } # Skip DNS, handled above

        $current++

        if (-not $OPT_FUNCTIONS.ContainsKey($id)) {
            Write-Warn "Unknown optimization ID: $id (skipped)"
            continue
        }

        # Skip Win11-only features on Win10
        if (-not $script:IsWin11 -and $id -in $script:Win11OnlyIds) {
            $info = $OPT_DESCRIPTIONS[$id]
            $name = if ($info) { $info.name } else { $id }
            Write-Host "  [SKIP] $name (requires Windows 11)" -ForegroundColor DarkGray
            $skippedIds += $id
            continue
        }

        # Skip Win11 24H2+ features on older builds
        if (-not $script:IsWin11_24H2 -and $id -in $script:Win11_24H2OnlyIds) {
            $info = $OPT_DESCRIPTIONS[$id]
            $name = if ($info) { $info.name } else { $id }
            Write-Host "  [SKIP] $name (requires Windows 11 24H2+)" -ForegroundColor DarkGray
            $skippedIds += $id
            continue
        }

        # RISKY items always get a prompt, even after [A]ll or 3 consecutive Y
        $isRisky = ($OPT_DESCRIPTIONS[$id] -and $OPT_DESCRIPTIONS[$id].tier -eq 'RISKY')
        if (-not $autoApprove -or $isRisky) {
            Show-OptimizationPrompt -Id $id -Current $current -Total $total
            $response = Read-Host
        } else {
            $response = 'y'
        }

        switch ($response.ToLower()) {
            'a' { $autoApprove = $true; $response = 'y' }
            'q' { $quit = $true }
            'n' { $consecutiveYes = 0 }  # Reset on skip
        }

        if (-not $quit -and $response.ToLower() -eq 'y') {
            $consecutiveYes++
            # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
            if ($consecutiveYes -ge 3 -and -not $autoApprove) {
                $autoApprove = $true
                $remaining = $total - $current
                Write-Host ""
                Write-Host "  $([char]0x2192) Auto-applying remaining $remaining optimizations (3 consecutive approvals; RISKY items still ask)" -ForegroundColor Cyan
                Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                Write-Host ""
            }
            try {
                & $OPT_FUNCTIONS[$id]
                $approvedIds += $id
            } catch {
                Write-Fail "Optimization $id failed: $($_.Exception.Message)"
            }
        } else {
            $skippedIds += $id
            if (-not $quit) {
                $info = $OPT_DESCRIPTIONS[$id]
                $name = if ($info) { $info.name } else { $id }
                Write-Host "  [SKIP] $name" -ForegroundColor DarkGray
            }
        }
    }

    # Show approval summary
    Write-Host ""
    Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Applied: $($approvedIds.Count) | Skipped: $($skippedIds.Count)" -ForegroundColor Gray
    if ($quit) { Write-Host "  (User quit early)" -ForegroundColor Yellow }
}

# ============================================================================
# GAMING COMPATIBILITY RESTORE
# ============================================================================

function Restore-GamingAppx {
    param([string]$Name, [string]$StoreId, [string]$Label)
    $staged = $null
    try { $staged = Get-AppxPackage -AllUsers -Name $Name -EA Stop | Select-Object -First 1 } catch { }
    if ($staged -and $staged.InstallLocation) {
        $manifest = Join-Path $staged.InstallLocation 'AppXManifest.xml'
        if (Test-Path $manifest) {
            try {
                Add-AppxPackage -DisableDevelopmentMode -Register $manifest -EA Stop
                Write-OK "$Label registered again"
                return
            } catch { }
        }
    }
    if (-not $StoreId) { Write-Warn "$Label - reinstall the Xbox app to bring it back"; return }
    if (-not (Get-Command winget -EA SilentlyContinue)) { Write-Warn "$Label - winget not found. Install it from the Microsoft Store (ID $StoreId)"; return }
    $null = winget install --id $StoreId -s msstore --accept-package-agreements --accept-source-agreements --silent 2>&1
    if ($LASTEXITCODE -eq 0) { Write-OK "$Label installed from the Microsoft Store" }
    else { Write-Warn "$Label - winget exit code $LASTEXITCODE. Install it from the Microsoft Store (ID $StoreId)" }
}

if ($script:CompatFixes.Count -gt 0) {
    Write-Step "Gaming Compatibility"
    Write-Host ""
    Write-Host "  Gaming features that are turned off or removed:" -ForegroundColor Yellow
    foreach ($f in $script:CompatFixes) { Write-Host "    - $($f.Label)" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "  Restore these gaming features? [Y/N]: " -NoNewline -ForegroundColor Cyan
    $compatResponse = Read-Host
    if ($compatResponse -match '^[Yy]') {
        # Undo for this step is the restore point. Create one if the upgrades step did not.
        if ($optIds.Count -eq 0) {
            try { & $OPT_FUNCTIONS['17'] } catch { Write-Warn "Restore point skipped: $($_.Exception.Message)" }
        }
        foreach ($f in $script:CompatFixes) {
            switch ($f.Id) {
                'services' {
                    foreach ($s in $f.Arg) {
                        try { Set-Service -Name $s -StartupType Manual -EA Stop; Write-OK "$s set to Manual" }
                        catch { Write-Warn "$s - could not change startup type: $($_.Exception.Message)" }
                    }
                }
                'store' {
                    try {
                        Start-Process -FilePath 'wsreset.exe' -ArgumentList '-i' -WindowStyle Hidden -EA Stop
                        Write-OK "Microsoft Store reinstall started. It finishes in the background in a few minutes"
                    } catch { Write-Warn "Could not start wsreset.exe -i: $($_.Exception.Message)" }
                }
                'appx' { Restore-GamingAppx $f.Arg[0] $f.Arg[1] $f.Arg[2] }
                'gameinput' {
                    try { Set-Service -Name 'GameInputSvc' -StartupType Manual -EA Stop; Write-OK "GameInput service set to Manual" }
                    catch { Write-Warn "GameInput service - could not change startup type: $($_.Exception.Message)" }
                }
                'do_mode' {
                    if (Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" "DODownloadMode" 0 -PassThru) { Write-OK "Delivery Optimization set to HTTP only" }
                    else { Write-Warn "Could not change Delivery Optimization mode" }
                }
                'do_service' {
                    if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\DoSvc" "Start" 2 -PassThru) { Write-OK "Delivery Optimization service turned back on (reboot to apply)" }
                    else { Write-Warn "Could not change the Delivery Optimization service" }
                }
                'teredo' {
                    $null = netsh interface teredo set state type=default 2>&1
                    Write-OK "Teredo back to the Windows default"
                }
            }
        }
    } else { Write-Host "  [SKIP] Gaming features left as they are" -ForegroundColor DarkGray }
}

# Install packages
if ($pkgKeys.Count -gt 0) {
    Write-Step "Arsenal (winget)"
    Write-Host ""
    Write-Host "  +================================================================+" -ForegroundColor White
    Write-Host "  |  PACKAGE INSTALLATION - Review each software before install    |" -ForegroundColor White
    Write-Host "  +================================================================+" -ForegroundColor White
    Write-Host ""
    Write-Host "  This loadout includes $($pkgKeys.Count) package(s) to install via winget." -ForegroundColor Gray
    Write-Host ""

    $wingetPath = Get-Command winget -EA SilentlyContinue
    if (-not $wingetPath) {
        Write-Fail "winget not found. Install App Installer from Microsoft Store."
    } else {
        $pkgAutoApprove = $false
        $pkgConsecutiveYes = 0  # Track consecutive Y responses for smart auto-All
        $installedPkgs = @()
        $skippedPkgs = @()
        $pkgQuit = $false
        $pkgCurrent = 0
        $pkgTotal = $pkgKeys.Count

        foreach ($key in $pkgKeys) {
            if ($pkgQuit) { break }
            $pkgCurrent++

            if (-not $PACKAGE_MAP.ContainsKey($key)) {
                Write-Warn "Unknown package: $key (skipped)"
                continue
            }

            $pkg = $PACKAGE_MAP[$key]

            if (-not $pkgAutoApprove) {
                Write-Host ""
                Write-Host "  [$pkgCurrent/$pkgTotal] " -NoNewline -ForegroundColor DarkGray
                Write-Host $pkg.name -NoNewline -ForegroundColor White
                Write-Host " [" -NoNewline -ForegroundColor DarkGray
                Write-Host "SOFTWARE" -NoNewline -ForegroundColor Cyan
                Write-Host "]" -ForegroundColor DarkGray
                Write-Host "  winget: $($pkg.id)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "  Install? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
                $pkgResponse = Read-Host
            } else {
                $pkgResponse = 'y'
            }

            switch ($pkgResponse.ToLower()) {
                'a' { $pkgAutoApprove = $true; $pkgResponse = 'y' }
                'q' { $pkgQuit = $true }
                'n' { $pkgConsecutiveYes = 0 }  # Reset on skip
            }

            if (-not $pkgQuit -and $pkgResponse.ToLower() -eq 'y') {
                $pkgConsecutiveYes++
                # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
                if ($pkgConsecutiveYes -ge 3 -and -not $pkgAutoApprove) {
                    $pkgAutoApprove = $true
                    $remaining = $pkgTotal - $pkgCurrent
                    Write-Host ""
                    Write-Host "  $([char]0x2192) Auto-installing remaining $remaining packages (3 consecutive approvals)" -ForegroundColor Cyan
                    Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                    Write-Host ""
                }
                Write-Host "  Installing $($pkg.name)..." -NoNewline
                $installOutput = winget install --id "$($pkg.id)" --silent --accept-package-agreements --accept-source-agreements 2>&1
                if ($LASTEXITCODE -eq 0) { Write-OK ""; $installedPkgs += $key }
                elseif ($installOutput -match "No available upgrade found|No newer package versions are available|already installed") { Write-OK "Already installed"; $installedPkgs += $key }
                else { Write-Fail ""; $installOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }
            } else {
                $skippedPkgs += $key
                if (-not $pkgQuit) { Write-Host "  [SKIP] $($pkg.name)" -ForegroundColor DarkGray }
            }
        }

        # Show package summary
        Write-Host ""
        Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
        Write-Host "  Installed: $($installedPkgs.Count) | Skipped: $($skippedPkgs.Count)" -ForegroundColor Gray
        if ($pkgQuit) { Write-Host "  (User quit early)" -ForegroundColor Yellow }
    }
}

# Summary
Write-Step "Complete"
Write-Host ""
Write-Host "  +========================================+" -ForegroundColor White
Write-Host "  |           LOADOUT SUMMARY              |" -ForegroundColor White
Write-Host "  +========================================+" -ForegroundColor White
Write-Host ""
Write-Host "  Applied:  $($script:SuccessCount) changes" -ForegroundColor Green
if ($script:WarningCount -gt 0) { Write-Host "  Warnings: $($script:WarningCount)" -ForegroundColor Yellow }
if ($script:FailCount -gt 0) { Write-Host "  Failed:   $($script:FailCount)" -ForegroundColor Red }
Write-Host ""
Write-Host "  Reboot recommended for all changes to take effect." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Source: https://rocktune.pedroferrari.com" -ForegroundColor DarkGray
Write-Host ""

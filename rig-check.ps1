<#
.SYNOPSIS
    RockTune Rig Check: finds the setup mistakes that cost gamers frames.
.DESCRIPTION
    Reads hardware and Windows settings and prints a score card with
    PASS / WARN / FAIL lines, a score out of 100 and the top 3 fixes.
    Rig Check changes nothing on the PC. Most checks work without
    administrator rights; a check that cannot read its data shows SKIP.

    Hosted one-liner:
      irm https://rocktune.pedroferrari.com/check.ps1 | iex

    Local copy:
      powershell -ExecutionPolicy Bypass -File .\rig-check.ps1

    Documentation: https://rocktune.pedroferrari.com
    Source: https://github.com/thepedroferrari/rocktune
#>

# Everything runs inside one script block so that `irm | iex` does not leave
# functions or variables behind in the user's PowerShell session.
& {
    $rc = @{
        Results   = New-Object System.Collections.ArrayList
        IsLaptop  = $false
        Gpus      = @()
        Monitors  = $null
        GameDirs  = $null
        DriveInfo = @{}
        Space     = $null
    }

    # ------------------------------------------------------------------
    # Output helpers
    # ------------------------------------------------------------------

    function Write-RcBanner {
        $art = @'
  ____  _          ____ _               _
 |  _ \(_) __ _   / ___| |__   ___  ___| | __
 | |_) | |/ _` | | |   | '_ \ / _ \/ __| |/ /
 |  _ <| | (_| | | |___| | | |  __/ (__|   <
 |_| \_\_|\__, |  \____|_| |_|\___|\___|_|\_\
          |___/
'@
        Write-Host ''
        Write-Host $art -ForegroundColor Magenta
        Write-Host '  RockTune Rig Check - reads your setup, changes nothing.' -ForegroundColor Cyan
        Write-Host '  https://rocktune.pedroferrari.com' -ForegroundColor DarkGray
        Write-Host ''
    }

    function Write-RcSection {
        param([string]$Title)
        Write-Host ''
        Write-Host ("  == " + $Title + " ") -ForegroundColor Cyan
    }

    function Add-RcResult {
        param(
            [string]$Label,
            [string]$Status,
            [string]$Detail,
            [string]$Fix,
            [int]$Weight
        )
        $item = [pscustomobject]@{
            Label  = $Label
            Status = $Status
            Detail = $Detail
            Fix    = $Fix
            Weight = $Weight
        }
        [void]$rc.Results.Add($item)

        $color = 'Gray'
        switch ($Status) {
            'PASS' { $color = 'Green' }
            'WARN' { $color = 'Yellow' }
            'FAIL' { $color = 'Red' }
            'INFO' { $color = 'Cyan' }
            'SKIP' { $color = 'DarkGray' }
        }
        Write-Host '  [' -NoNewline -ForegroundColor DarkGray
        Write-Host $Status -NoNewline -ForegroundColor $color
        Write-Host '] ' -NoNewline -ForegroundColor DarkGray
        Write-Host ($Label.PadRight(28)) -NoNewline -ForegroundColor White
        Write-Host $Detail -ForegroundColor Gray
        if (($Status -eq 'WARN' -or $Status -eq 'FAIL') -and $Fix) {
            Write-Host ('         Fix: ' + $Fix) -ForegroundColor DarkYellow
        }
    }

    # Runs one check. The body returns a hashtable with S (status), D (detail)
    # and F (fix). Any error turns into SKIP so the run always continues.
    function Invoke-RcCheck {
        param(
            [string]$Label,
            [int]$Weight,
            [scriptblock]$Body
        )
        $ErrorActionPreference = 'Stop'
        try {
            $r = & $Body
            if ($null -eq $r) {
                Add-RcResult -Label $Label -Status 'SKIP' -Detail 'No data.' -Fix '' -Weight $Weight
                return
            }
            Add-RcResult -Label $Label -Status $r.S -Detail $r.D -Fix $r.F -Weight $Weight
        } catch {
            $msg = $_.Exception.Message
            if ($msg.Length -gt 70) { $msg = $msg.Substring(0, 70) + '...' }
            Add-RcResult -Label $Label -Status 'SKIP' -Detail ('Could not read: ' + $msg) -Fix '' -Weight $Weight
        }
    }

    function Get-RcRegValue {
        param([string]$Path, [string]$Name)
        $item = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
        if ($null -eq $item) { return $null }
        return $item.$Name
    }

    # ------------------------------------------------------------------
    # Shared data
    # ------------------------------------------------------------------

    function Get-RcGpuKind {
        param([string]$Name, [string]$PnpId)
        if ($PnpId -match 'VEN_10DE' -or $Name -match 'NVIDIA') { return 'dGPU' }
        if ($Name -match 'Radeon.*\b(RX|Pro W)\b' -or $Name -match 'Radeon (VII|R9)') { return 'dGPU' }
        if ($Name -match 'Arc.*\b[AB]\d{3}\b') { return 'dGPU' }
        if ($Name -match 'Intel|Radeon|AMD') { return 'iGPU' }
        return 'other'
    }

    function Get-RcVendor {
        param([string]$Name, [string]$PnpId)
        if ($PnpId -match 'VEN_10DE' -or $Name -match 'NVIDIA') { return 'NVIDIA' }
        if ($PnpId -match 'VEN_1002' -or $Name -match 'AMD|Radeon') { return 'AMD' }
        if ($PnpId -match 'VEN_8086' -or $Name -match 'Intel') { return 'Intel' }
        return 'Unknown'
    }

    function Initialize-RcDisplayApi {
        if ('RockTuneRigCheck.Display' -as [type]) { return }
        $code = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace RockTuneRigCheck {
    public class MonitorInfo {
        public string Device;
        public string Adapter;
        public int Width;
        public int Height;
        public int CurrentHz;
        public int MaxHz;
    }

    public static class Display {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DEVMODE {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public int dmDisplayOrientation;
            public int dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmDisplayFlags;
            public int dmDisplayFrequency;
            public int dmICMMethod;
            public int dmICMIntent;
            public int dmMediaType;
            public int dmDitherType;
            public int dmReserved1;
            public int dmReserved2;
            public int dmPanningWidth;
            public int dmPanningHeight;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DISPLAY_DEVICE {
            public int cb;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
            public int StateFlags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
        }

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        static extern bool EnumDisplayDevices(string lpDevice, uint iDevNum, ref DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);

        const int ENUM_CURRENT_SETTINGS = -1;
        const int ATTACHED_TO_DESKTOP = 1;

        public static List<MonitorInfo> GetMonitors() {
            List<MonitorInfo> list = new List<MonitorInfo>();
            for (uint i = 0; i < 32; i++) {
                DISPLAY_DEVICE dd = new DISPLAY_DEVICE();
                dd.cb = Marshal.SizeOf(dd);
                if (!EnumDisplayDevices(null, i, ref dd, 0)) { break; }
                if ((dd.StateFlags & ATTACHED_TO_DESKTOP) == 0) { continue; }

                DEVMODE cur = new DEVMODE();
                cur.dmSize = (short)Marshal.SizeOf(cur);
                if (!EnumDisplaySettings(dd.DeviceName, ENUM_CURRENT_SETTINGS, ref cur)) { continue; }

                int maxHz = cur.dmDisplayFrequency;
                for (int m = 0; m < 4000; m++) {
                    DEVMODE mode = new DEVMODE();
                    mode.dmSize = (short)Marshal.SizeOf(mode);
                    if (!EnumDisplaySettings(dd.DeviceName, m, ref mode)) { break; }
                    if (mode.dmPelsWidth == cur.dmPelsWidth && mode.dmPelsHeight == cur.dmPelsHeight && mode.dmDisplayFrequency > maxHz) {
                        maxHz = mode.dmDisplayFrequency;
                    }
                }

                MonitorInfo info = new MonitorInfo();
                info.Device = dd.DeviceName;
                info.Adapter = dd.DeviceString;
                info.Width = cur.dmPelsWidth;
                info.Height = cur.dmPelsHeight;
                info.CurrentHz = cur.dmDisplayFrequency;
                info.MaxHz = maxHz;
                list.Add(info);
            }
            return list;
        }
    }
}
'@
        Add-Type -TypeDefinition $code -Language CSharp
    }

    function Get-RcMonitors {
        if ($null -eq $rc.Monitors) {
            Initialize-RcDisplayApi
            $rc.Monitors = @([RockTuneRigCheck.Display]::GetMonitors())
        }
        return $rc.Monitors
    }

    # Steam and Epic install folders.
    function Get-RcGameDirs {
        if ($null -ne $rc.GameDirs) { return $rc.GameDirs }
        $dirs = New-Object System.Collections.ArrayList

        $steamPath = Get-RcRegValue -Path 'HKCU:\Software\Valve\Steam' -Name 'SteamPath'
        if ($steamPath) {
            $steamPath = $steamPath -replace '/', '\'
            $vdf = Join-Path $steamPath 'steamapps\libraryfolders.vdf'
            if (Test-Path -LiteralPath $vdf) {
                $text = Get-Content -LiteralPath $vdf -Raw -ErrorAction SilentlyContinue
                foreach ($m in [regex]::Matches([string]$text, '"path"\s+"([^"]+)"')) {
                    $p = $m.Groups[1].Value -replace '\\\\', '\'
                    [void]$dirs.Add([pscustomobject]@{ Store = 'Steam'; Path = $p })
                }
            }
            if ($dirs.Count -eq 0) {
                [void]$dirs.Add([pscustomobject]@{ Store = 'Steam'; Path = $steamPath })
            }
        }

        $epic = Join-Path $env:ProgramData 'Epic\EpicGamesLauncher\Data\Manifests'
        if (Test-Path -LiteralPath $epic) {
            foreach ($f in Get-ChildItem -LiteralPath $epic -Filter '*.item' -ErrorAction SilentlyContinue) {
                try {
                    $j = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
                    if ($j.InstallLocation) {
                        [void]$dirs.Add([pscustomobject]@{ Store = 'Epic'; Path = [string]$j.InstallLocation })
                    }
                } catch {
                    Write-Verbose ('Skipped Epic manifest ' + $f.Name)
                }
            }
        }

        if (Test-Path -LiteralPath 'C:\XboxGames') {
            [void]$dirs.Add([pscustomobject]@{ Store = 'Xbox'; Path = 'C:\XboxGames' })
        }

        $rc.GameDirs = @($dirs)
        return $rc.GameDirs
    }

    function Get-RcGameDriveLetters {
        $letters = @()
        foreach ($d in Get-RcGameDirs) {
            if ($d.Path -match '^([A-Za-z]):') {
                $letters += $Matches[1].ToUpper()
            }
        }
        return @($letters | Sort-Object -Unique)
    }

    # Returns HDD / SSD / Unspecified for a drive letter.
    function Get-RcDriveMedia {
        param([string]$Letter)
        if ($rc.DriveInfo.ContainsKey($Letter)) { return $rc.DriveInfo[$Letter] }
        $media = 'Unknown'
        $bus = ''
        $part = Get-Partition -DriveLetter $Letter -ErrorAction Stop
        $diskNumber = [string]$part.DiskNumber
        $pd = Get-PhysicalDisk -ErrorAction Stop | Where-Object { [string]$_.DeviceId -eq $diskNumber } | Select-Object -First 1
        if ($pd) {
            $media = [string]$pd.MediaType
            $bus = [string]$pd.BusType
        }
        $info = [pscustomobject]@{ Media = $media; Bus = $bus }
        $rc.DriveInfo[$Letter] = $info
        return $info
    }

    # ------------------------------------------------------------------
    # Start
    # ------------------------------------------------------------------

    Write-RcBanner
    Write-Host '  Scanning... (about 10 seconds)' -ForegroundColor DarkGray

    try {
        $battery = @(Get-CimInstance -ClassName Win32_Battery -ErrorAction Stop)
        $chassis = @((Get-CimInstance -ClassName Win32_SystemEnclosure -ErrorAction Stop).ChassisTypes)
        $laptopTypes = @(8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32)
        $isLaptopChassis = @($chassis | Where-Object { $laptopTypes -contains [int]$_ }).Count -gt 0
        $rc.IsLaptop = ($battery.Count -gt 0) -or $isLaptopChassis
    } catch {
        $rc.IsLaptop = $false
    }

    try {
        $rc.Gpus = @(Get-CimInstance -ClassName Win32_VideoController -ErrorAction Stop | ForEach-Object {
                [pscustomobject]@{
                    Name       = [string]$_.Name
                    Vendor     = Get-RcVendor -Name ([string]$_.Name) -PnpId ([string]$_.PNPDeviceID)
                    Kind       = Get-RcGpuKind -Name ([string]$_.Name) -PnpId ([string]$_.PNPDeviceID)
                    DriverDate = $_.DriverDate
                    Driver     = [string]$_.DriverVersion
                }
            })
    } catch {
        $rc.Gpus = @()
    }

    $cpuName = ''
    try { $cpuName = [string](Get-CimInstance -ClassName Win32_Processor -ErrorAction Stop | Select-Object -First 1).Name } catch { $cpuName = '' }
    $cpuName = $cpuName.Trim()

    $machineLine = '  ' + $cpuName
    if ($rc.Gpus.Count -gt 0) { $machineLine += ' | ' + (($rc.Gpus | ForEach-Object { $_.Name }) -join ' + ') }
    if ($rc.IsLaptop) { $machineLine += ' | laptop' } else { $machineLine += ' | desktop' }
    Write-Host $machineLine -ForegroundColor DarkGray

    # ------------------------------------------------------------------
    # Memory
    # ------------------------------------------------------------------

    Write-RcSection 'MEMORY'

    Invoke-RcCheck -Label 'RAM speed (XMP / EXPO)' -Weight 3 -Body {
        $sticks = @(Get-CimInstance -ClassName Win32_PhysicalMemory)
        if ($sticks.Count -eq 0) { return $null }
        $rated = [int](($sticks | Measure-Object -Property Speed -Maximum).Maximum)
        $configured = [int](($sticks | Measure-Object -Property ConfiguredClockSpeed -Minimum).Minimum)
        if ($configured -le 0) { return $null }
        $type = [int]$sticks[0].SMBIOSMemoryType
        $typeName = 'RAM'
        if ($type -eq 26) { $typeName = 'DDR4' }
        if ($type -eq 34) { $typeName = 'DDR5' }
        $fix = 'BIOS: turn on XMP (Intel) or EXPO / DOCP (AMD) in the memory or Ai Tweaker settings, then save and reboot.'

        if ($rated -gt 0 -and $configured -lt ($rated - 50)) {
            return @{ S = 'FAIL'; D = ("$typeName runs at $configured MT/s, the sticks are rated for $rated MT/s."); F = $fix }
        }
        $jedecBase = ($type -eq 26 -and $configured -le 2666) -or ($type -eq 34 -and $configured -le 4800)
        if ($jedecBase -and -not $rc.IsLaptop) {
            return @{ S = 'WARN'; D = ("$typeName at $configured MT/s is the default speed. If the box says more (3200-3600 DDR4, 6000+ DDR5), the memory profile is off."); F = $fix }
        }
        return @{ S = 'PASS'; D = ("$typeName at $configured MT/s.") }
    }

    Invoke-RcCheck -Label 'RAM channels' -Weight 3 -Body {
        $sticks = @(Get-CimInstance -ClassName Win32_PhysicalMemory)
        if ($sticks.Count -eq 0) { return $null }
        $totalGb = [math]::Round((($sticks | Measure-Object -Property Capacity -Sum).Sum) / 1GB)
        if ($sticks.Count -eq 1) {
            $status = 'FAIL'
            if ($rc.IsLaptop) { $status = 'WARN' }
            return @{ S = $status; D = ("One stick ($totalGb GB): single channel, about half the memory bandwidth."); F = 'Add a second matching stick so the RAM runs in dual channel (slots A2 and B2 on most 4-slot boards).' }
        }
        if ($sticks.Count -eq 2 -and -not $rc.IsLaptop) {
            $keys = @()
            foreach ($s in $sticks) {
                $loc = [string]$s.DeviceLocator + ' ' + [string]$s.BankLabel
                $key = ''
                if ($loc -match 'Controller(\d)') { $key += 'C' + $Matches[1] }
                if ($loc -match 'Channel\s*([A-H])\b') { $key += $Matches[1] }
                elseif ($loc -match 'DIMM_?([A-H])\d') { $key += $Matches[1] }
                else { $key = '' }
                $keys += $key
            }
            if ($keys[0] -and $keys[0] -eq $keys[1]) {
                return @{ S = 'WARN'; D = ('Both sticks report the same channel (' + $sticks[0].DeviceLocator + ', ' + $sticks[1].DeviceLocator + ').'); F = 'Move the sticks to slots A2 and B2 (see the motherboard manual) so they run in dual channel.' }
            }
        }
        return @{ S = 'PASS'; D = ("$($sticks.Count) sticks, $totalGb GB.") }
    }

    Invoke-RcCheck -Label 'RAM amount' -Weight 1 -Body {
        $total = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory
        $gb = [math]::Round($total / 1GB)
        if ($gb -lt 15) { return @{ S = 'WARN'; D = ("$gb GB. Many new games want 16 GB or more."); F = 'Upgrade to 16 GB or 32 GB (2 matching sticks).' } }
        return @{ S = 'PASS'; D = ("$gb GB.") }
    }

    # ------------------------------------------------------------------
    # Display and GPU
    # ------------------------------------------------------------------

    Write-RcSection 'DISPLAY AND GPU'

    Invoke-RcCheck -Label 'Monitor refresh rate' -Weight 3 -Body {
        $mons = @(Get-RcMonitors)
        if ($mons.Count -eq 0) { return $null }
        $slow = @($mons | Where-Object { $_.MaxHz -gt ($_.CurrentHz + 5) })
        $desc = ($mons | ForEach-Object { "$($_.Width)x$($_.Height) @ $($_.CurrentHz) Hz" }) -join ', '
        if ($slow.Count -gt 0) {
            $m = $slow[0]
            return @{ S = 'FAIL'; D = ("Running $($m.CurrentHz) Hz, the monitor supports $($m.MaxHz) Hz."); F = ("Settings > System > Display > Advanced display > Choose a refresh rate: $($m.MaxHz) Hz.") }
        }
        return @{ S = 'PASS'; D = ($desc + ' (highest available).') }
    }

    Invoke-RcCheck -Label 'Display cable on GPU' -Weight 3 -Body {
        $dgpus = @($rc.Gpus | Where-Object { $_.Kind -eq 'dGPU' })
        if ($dgpus.Count -eq 0) { return @{ S = 'INFO'; D = 'No separate graphics card found.' } }
        $mons = @(Get-RcMonitors)
        if ($mons.Count -eq 0) { return $null }
        if ($rc.IsLaptop) { return @{ S = 'INFO'; D = 'Laptop: the built-in screen goes through the CPU graphics by design.' } }
        $onIgpu = @($mons | Where-Object { (Get-RcGpuKind -Name $_.Adapter -PnpId '') -eq 'iGPU' })
        if ($onIgpu.Count -gt 0) {
            return @{ S = 'FAIL'; D = ("Monitor runs on " + $onIgpu[0].Adapter + ", not on the " + $dgpus[0].Name + "."); F = 'Move the display cable from the motherboard port to a port on the graphics card.' }
        }
        return @{ S = 'PASS'; D = ('Monitor runs on ' + $mons[0].Adapter + '.') }
    }

    Invoke-RcCheck -Label 'GPU driver age' -Weight 2 -Body {
        $main = @($rc.Gpus | Where-Object { $_.Kind -eq 'dGPU' })
        if ($main.Count -eq 0) { $main = @($rc.Gpus) }
        if ($main.Count -eq 0) { return $null }
        $g = $main[0]
        if ($null -eq $g.DriverDate) { return $null }
        $days = [int]((Get-Date) - [datetime]$g.DriverDate).TotalDays
        $dateText = ([datetime]$g.DriverDate).ToString('yyyy-MM-dd')
        $fix = 'Install the latest driver from the GPU maker (NVIDIA App, AMD Software: Adrenalin, or Intel Graphics Software). Links: DRIVER-LINKS.md in the RockTune repo.'
        if ($g.Vendor -eq 'NVIDIA') { $fix = 'Install the latest Game Ready driver from the NVIDIA App or nvidia.com/drivers.' }
        if ($g.Vendor -eq 'AMD') { $fix = 'Install the latest AMD Software: Adrenalin Edition from amd.com/support.' }
        if ($g.Vendor -eq 'Intel') { $fix = 'Install the latest Intel Arc / Iris Xe driver from intel.com (Intel Driver and Support Assistant).' }
        if ($days -gt 365) { return @{ S = 'FAIL'; D = ("$($g.Vendor) driver from $dateText ($days days old)."); F = $fix } }
        if ($days -gt 180) { return @{ S = 'WARN'; D = ("$($g.Vendor) driver from $dateText ($days days old)."); F = $fix } }
        return @{ S = 'PASS'; D = ("$($g.Vendor) driver from $dateText.") }
    }

    $nvsmi = $null
    try {
        $cmd = Get-Command -Name 'nvidia-smi' -ErrorAction SilentlyContinue
        if ($cmd) { $nvsmi = $cmd.Source }
        if (-not $nvsmi) {
            $candidate = Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe'
            if (Test-Path -LiteralPath $candidate) { $nvsmi = $candidate }
        }
    } catch {
        $nvsmi = $null
    }

    Invoke-RcCheck -Label 'Resizable BAR' -Weight 2 -Body {
        $hasNv = @($rc.Gpus | Where-Object { $_.Vendor -eq 'NVIDIA' }).Count -gt 0
        $hasAmd = @($rc.Gpus | Where-Object { $_.Vendor -eq 'AMD' -and $_.Kind -eq 'dGPU' }).Count -gt 0
        if ($hasNv -and $nvsmi) {
            $lines = @(& $nvsmi -q -d MEMORY 2>$null)
            $inBar = $false
            $totalMb = 0
            foreach ($l in $lines) {
                if ($l -match 'BAR1 Memory Usage') { $inBar = $true; continue }
                if ($inBar -and $l -match 'Total\s*:\s*(\d+)\s*MiB') { $totalMb = [int]$Matches[1]; break }
            }
            if ($totalMb -le 0) { return $null }
            if ($totalMb -le 256) {
                return @{ S = 'WARN'; D = 'Off (BAR1 window is 256 MB).'; F = 'BIOS: turn on "Above 4G Decoding" and "Re-Size BAR Support" (PCI Subsystem settings). CSM must be off.' }
            }
            return @{ S = 'PASS'; D = ("On (BAR1 window $totalMb MB).") }
        }
        if ($hasAmd) {
            return @{ S = 'INFO'; D = 'Open AMD Software > Performance > Tuning and confirm Smart Access Memory is on.' }
        }
        return @{ S = 'INFO'; D = 'Check the BIOS for "Re-Size BAR Support" and "Above 4G Decoding".' }
    }

    Invoke-RcCheck -Label 'GPU PCIe link' -Weight 2 -Body {
        if (-not $nvsmi) { return @{ S = 'INFO'; D = 'Only readable on NVIDIA cards (nvidia-smi).' } }
        $out = @(& $nvsmi --query-gpu=pcie.link.width.current,pcie.link.width.max,pcie.link.gen.max,pcie.link.gen.gpumax --format=csv,noheader,nounits 2>$null)
        if ($out.Count -eq 0) { return $null }
        $p = ($out[0] -split ',') | ForEach-Object { $_.Trim() }
        if ($p.Count -lt 4) { return $null }
        $wCur = [int]$p[0]; $wMax = [int]$p[1]; $gMax = [int]$p[2]; $gGpu = [int]$p[3]
        if ($wCur -lt $wMax) {
            return @{ S = 'FAIL'; D = ("Running x$wCur, the card supports x$wMax."); F = 'Put the graphics card in the top full-length PCIe slot, reseat it, and check that no M.2 drive shares its lanes (motherboard manual).' }
        }
        if ($gMax -lt $gGpu) {
            return @{ S = 'WARN'; D = ("Link limited to PCIe $gMax.0, the card supports $gGpu.0."); F = 'Use the top PCIe slot and avoid PCIe 3.0 riser cables. BIOS: set the PCIe slot speed to Auto.' }
        }
        return @{ S = 'PASS'; D = ("x$wCur, PCIe $gMax.0.") }
    }

    Invoke-RcCheck -Label 'GPU scheduling (HAGS)' -Weight 1 -Body {
        $v = Get-RcRegValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode'
        if ($v -eq 2) { return @{ S = 'PASS'; D = 'On. Needed for DLSS Frame Generation.' } }
        return @{ S = 'WARN'; D = 'Off.'; F = 'Settings > System > Display > Graphics > Change default graphics settings > Hardware-accelerated GPU scheduling: On. Or tick "HAGS On" in RockTune.' }
    }

    Invoke-RcCheck -Label 'Windowed game optimizations' -Weight 1 -Body {
        $v = [string](Get-RcRegValue -Path 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' -Name 'DirectXUserGlobalSettings')
        if ($v -match 'SwapEffectUpgradeEnable=0') {
            return @{ S = 'WARN'; D = 'Off. Borderless games get higher latency and no VRR.'; F = 'Settings > System > Display > Graphics > Optimizations for windowed games: On.' }
        }
        return @{ S = 'PASS'; D = 'Not turned off.' }
    }

    # ------------------------------------------------------------------
    # Storage
    # ------------------------------------------------------------------

    Write-RcSection 'STORAGE'

    Invoke-RcCheck -Label 'Windows drive' -Weight 2 -Body {
        $letter = $env:SystemDrive.Substring(0, 1)
        $info = Get-RcDriveMedia -Letter $letter
        if ($info.Media -eq 'HDD') { return @{ S = 'FAIL'; D = ("$($letter): is a hard disk."); F = 'Move Windows to an SSD (NVMe preferred). Cloning tools: Macrium Reflect or the SSD maker''s migration tool.' } }
        if ($info.Media -eq 'SSD') { return @{ S = 'PASS'; D = ("$($letter): is an SSD ($($info.Bus)).") } }
        return $null
    }

    Invoke-RcCheck -Label 'Games on SSD' -Weight 3 -Body {
        $letters = @(Get-RcGameDriveLetters)
        if ($letters.Count -eq 0) { return @{ S = 'INFO'; D = 'No Steam, Epic or Xbox library found.' } }
        $hdd = @()
        $ssd = @()
        foreach ($l in $letters) {
            try {
                $i = Get-RcDriveMedia -Letter $l
                if ($i.Media -eq 'HDD') { $hdd += ($l + ':') }
                if ($i.Media -eq 'SSD') { $ssd += ($l + ':') }
            } catch {
                Write-Verbose ('Could not read drive ' + $l)
            }
        }
        if ($hdd.Count -gt 0) {
            return @{ S = 'FAIL'; D = ('Game library on a hard disk: ' + ($hdd -join ', ') + '. Expect long loads and texture pop-in.'); F = 'Move games to an SSD: Steam > Settings > Storage > Move; Epic and Xbox apps have a Move option per game.' }
        }
        if ($ssd.Count -eq 0) { return $null }
        return @{ S = 'PASS'; D = ('Game libraries on SSD: ' + ($ssd -join ', ') + '.') }
    }

    Invoke-RcCheck -Label 'Free space on game drives' -Weight 2 -Body {
        $letters = @(Get-RcGameDriveLetters)
        $letters += $env:SystemDrive.Substring(0, 1).ToUpper()
        $letters = @($letters | Sort-Object -Unique)
        $worst = $null
        $parts = @()
        foreach ($l in $letters) {
            $d = Get-CimInstance -ClassName Win32_LogicalDisk -Filter ("DeviceID='" + $l + ":'")
            if (-not $d -or -not $d.Size) { continue }
            $freeGb = [math]::Round($d.FreeSpace / 1GB)
            $pct = [math]::Round(100 * $d.FreeSpace / $d.Size)
            $parts += ("$($l): $freeGb GB free")
            if ($null -eq $worst -or $pct -lt $worst.Pct) { $worst = [pscustomobject]@{ Letter = $l; Pct = $pct; Gb = $freeGb } }
        }
        if ($null -eq $worst) { return $null }
        $fix = 'Free space: Settings > System > Storage > Cleanup recommendations, or uninstall games you no longer play.'
        if ($worst.Pct -lt 5 -or $worst.Gb -lt 15) { return @{ S = 'FAIL'; D = ("$($worst.Letter): has $($worst.Gb) GB ($($worst.Pct)%) free. Updates and shader caches need room."); F = $fix } }
        if ($worst.Pct -lt 10 -or $worst.Gb -lt 50) { return @{ S = 'WARN'; D = ("$($worst.Letter): has $($worst.Gb) GB ($($worst.Pct)%) free."); F = $fix } }
        return @{ S = 'PASS'; D = ($parts -join ', ') + '.' }
    }

    Invoke-RcCheck -Label 'SSD TRIM' -Weight 1 -Body {
        $v = Get-RcRegValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'DisableDeleteNotification'
        if ($v -eq 1) { return @{ S = 'WARN'; D = 'TRIM is off. SSD writes slow down over time.'; F = 'Run in an admin PowerShell: fsutil behavior set DisableDeleteNotify 0' } }
        return @{ S = 'PASS'; D = 'On.' }
    }

    # ------------------------------------------------------------------
    # Windows
    # ------------------------------------------------------------------

    Write-RcSection 'WINDOWS'

    Invoke-RcCheck -Label 'Windows version' -Weight 1 -Body {
        $cv = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
        $build = [int]$cv.CurrentBuildNumber
        $ver = [string]$cv.DisplayVersion
        $name = 'Windows 11'
        if ($build -lt 22000) { $name = 'Windows 10' }
        $text = "$name $ver (build $build.$($cv.UBR))"
        if ($build -lt 22000) { return @{ S = 'WARN'; D = ($text + '. Windows 10 no longer gets updates.'); F = 'Upgrade to Windows 11 (Settings > Windows Update), or install the latest Windows 10 updates at minimum.' } }
        if ($build -lt 26100) { return @{ S = 'WARN'; D = ($text + '. This version no longer gets updates.'); F = 'Settings > Windows Update: install the latest Windows 11 feature update.' } }
        return @{ S = 'PASS'; D = $text + '.' }
    }

    Invoke-RcCheck -Label 'Pending reboot' -Weight 1 -Body {
        $pending = (Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or
        (Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
        if ($pending) { return @{ S = 'WARN'; D = 'Windows is waiting to finish an update.'; F = 'Restart the PC before you play or benchmark.' } }
        return @{ S = 'PASS'; D = 'None.' }
    }

    Invoke-RcCheck -Label 'Game Mode' -Weight 1 -Body {
        $v = Get-RcRegValue -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AutoGameModeEnabled'
        if ($v -eq 0) { return @{ S = 'WARN'; D = 'Off. Windows Update and background apps can take CPU time from the game.'; F = 'Settings > Gaming > Game Mode: On. Or tick "Game Mode On" in RockTune.' } }
        return @{ S = 'PASS'; D = 'On.' }
    }

    Invoke-RcCheck -Label 'Memory integrity (VBS)' -Weight 2 -Body {
        $hvci = $false
        $vbs = $false
        try {
            $dg = Get-CimInstance -Namespace 'root\Microsoft\Windows\DeviceGuard' -ClassName Win32_DeviceGuard -ErrorAction Stop
            $vbs = ([int]$dg.VirtualizationBasedSecurityStatus -eq 2)
            $hvci = @($dg.SecurityServicesRunning) -contains 2
        } catch {
            $e = Get-RcRegValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name 'Enabled'
            $hvci = ($e -eq 1)
            $vbs = $hvci
        }
        if ($hvci) {
            return @{ S = 'WARN'; D = 'Memory integrity is on. It costs a few percent of CPU performance in games.'; F = 'Windows Security > Device security > Core isolation details > Memory integrity: Off, then reboot. Some anti-cheats (for example FACEIT) ask for it on; turn it back on if a game requires it.' }
        }
        if ($vbs) { return @{ S = 'PASS'; D = 'Virtualization-based security runs, memory integrity is off.' } }
        return @{ S = 'PASS'; D = 'Off.' }
    }

    # ------------------------------------------------------------------
    # Power and CPU
    # ------------------------------------------------------------------

    Write-RcSection 'POWER AND CPU'

    Invoke-RcCheck -Label 'Laptop charger' -Weight 3 -Body {
        if (-not $rc.IsLaptop) { return @{ S = 'INFO'; D = 'Desktop.' } }
        $b = @(Get-CimInstance -ClassName Win32_Battery) | Select-Object -First 1
        if (-not $b) { return $null }
        if ([int]$b.BatteryStatus -eq 1) {
            return @{ S = 'FAIL'; D = ("On battery ($($b.EstimatedChargeRemaining)%). The GPU and CPU run at reduced power."); F = 'Plug in the charger that came with the laptop before you play.' }
        }
        return @{ S = 'PASS'; D = 'Plugged in.' }
    }

    Invoke-RcCheck -Label 'Power plan' -Weight 2 -Body {
        $out = [string](& powercfg /getactivescheme 2>$null)
        if ($out -notmatch '([0-9a-fA-F-]{36})') { return $null }
        $guid = $Matches[1].ToLower()
        $name = ''
        if ($out -match '\(([^)]+)\)') { $name = $Matches[1] }
        if ($guid -eq 'a1841308-3541-4fab-bc81-f71556f20b4a') {
            return @{ S = 'FAIL'; D = 'Power saver is active. The CPU is held at low clocks.'; F = 'Control Panel > Power Options: choose Balanced or High performance. Or tick "Balanced+ Power Plan" in RockTune.' }
        }
        $overlay = [string](Get-RcRegValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes' -Name 'ActiveOverlayAcPowerScheme')
        if ($overlay -eq '961cc777-2547-4f9d-8174-7d86181b8a7a') {
            return @{ S = 'WARN'; D = ("$name plan, but power mode is set to Best power efficiency."); F = 'Settings > System > Power > Power mode (plugged in): Best performance.' }
        }
        return @{ S = 'PASS'; D = ("$name.") }
    }

    Invoke-RcCheck -Label 'CPU max speed' -Weight 2 -Body {
        $q = [string](& powercfg /query SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 2>$null)
        $hex = @([regex]::Matches($q, '0x[0-9a-fA-F]{8}') | ForEach-Object { $_.Value })
        $limit = $null
        if ($hex.Count -ge 2) { $limit = [Convert]::ToInt32($hex[$hex.Count - 2], 16) }
        if ($null -ne $limit -and $limit -lt 100) {
            return @{ S = 'FAIL'; D = ("Power plan caps the CPU at $limit% (plugged in)."); F = 'Control Panel > Power Options > Change plan settings > Advanced > Processor power management > Maximum processor state: 100%.' }
        }
        $perf = Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" -ErrorAction SilentlyContinue
        if ($perf -and $null -ne $perf.PercentPerformanceLimit -and [int]$perf.PercentPerformanceLimit -lt 100) {
            return @{ S = 'WARN'; D = ("Firmware limits the CPU to $($perf.PercentPerformanceLimit)% right now: heat or power limit."); F = 'Clean dust from the cooler and fans, check the CPU cooler is mounted firmly, and on laptops use the vendor app (Armoury Crate, Legion Space, etc.) in Performance mode.' }
        }
        if ($null -eq $limit -and -not $perf) { return $null }
        return @{ S = 'PASS'; D = 'No speed cap found.' }
    }

    Invoke-RcCheck -Label 'AMD X3D V-Cache driver' -Weight 3 -Body {
        if ($cpuName -notmatch 'X3D') { return @{ S = 'INFO'; D = 'Not an X3D CPU.' } }
        $dualCcd = $cpuName -match '(79\d0X3D|99\d0X3D)'
        $svc = Get-Service -Name 'amd3dvcacheSvc' -ErrorAction SilentlyContinue
        $gameBar = Get-AppxPackage -Name 'Microsoft.XboxGamingOverlay' -ErrorAction SilentlyContinue
        if ($dualCcd -and -not $svc) {
            return @{ S = 'FAIL'; D = 'The 3D V-Cache service (amd3dvcacheSvc) is missing. Games can land on the cores without the extra cache.'; F = 'Install the latest AMD chipset driver from amd.com/support, then reboot. BIOS: CPPC and CPPC Preferred Cores on.' }
        }
        if ($dualCcd -and $svc.Status -ne 'Running') {
            return @{ S = 'FAIL'; D = ('amd3dvcacheSvc is ' + $svc.Status + '.'); F = 'Services app: set "AMD 3D V-Cache Performance Optimizer Service" to Automatic and start it. Reinstall the AMD chipset driver if it fails.' }
        }
        if ($dualCcd -and -not $gameBar) {
            return @{ S = 'FAIL'; D = 'Xbox Game Bar is removed. The V-Cache driver uses it to detect games.'; F = 'Reinstall Xbox Game Bar from the Microsoft Store (ms-windows-store://pdp/?productid=9NZKPSTSNW4P).' }
        }
        if ($dualCcd) { return @{ S = 'PASS'; D = 'V-Cache service running and Game Bar installed.' } }
        return @{ S = 'PASS'; D = 'Single-CCD X3D: every core has the extra cache.' }
    }

    # ------------------------------------------------------------------
    # Xbox and Game Pass
    # ------------------------------------------------------------------

    Write-RcSection 'XBOX AND GAME PASS'

    Invoke-RcCheck -Label 'Xbox services' -Weight 2 -Body {
        $names = @('XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc')
        $off = @(Get-Service -Name $names -ErrorAction SilentlyContinue | Where-Object { $_.StartType.ToString() -eq 'Disabled' } | ForEach-Object { $_.Name })
        if ($off.Count -gt 0) {
            return @{ S = 'FAIL'; D = ('Disabled: ' + ($off -join ', ') + '. Xbox sign-in, cloud saves or controllers can fail.'); F = 'Services app (services.msc): set each disabled Xbox service to Manual.' }
        }
        return @{ S = 'PASS'; D = 'None disabled.' }
    }

    Invoke-RcCheck -Label 'Gaming Services' -Weight 2 -Body {
        $xboxApp = Get-AppxPackage -Name 'Microsoft.GamingApp' -ErrorAction SilentlyContinue
        $gs = Get-AppxPackage -Name 'Microsoft.GamingServices' -ErrorAction SilentlyContinue
        if (-not $xboxApp) {
            if ($gs) { return @{ S = 'PASS'; D = 'Installed.' } }
            return @{ S = 'INFO'; D = 'Xbox app not installed.' }
        }
        if (-not $gs) {
            return @{ S = 'FAIL'; D = 'Xbox app is installed but Gaming Services is missing. Game Pass games will not install or start.'; F = 'Install Gaming Services from the Microsoft Store (ms-windows-store://pdp/?productid=9MWPM2CQNLHN).' }
        }
        return @{ S = 'PASS'; D = 'Installed.' }
    }

    # ------------------------------------------------------------------
    # Space used by gaming (not scored, read-only, deletes nothing)
    # ------------------------------------------------------------------

    function Format-RcSize {
        param([double]$Bytes)
        if ($Bytes -ge 1GB) { return ('{0:N1} GB' -f ($Bytes / 1GB)) }
        if ($Bytes -ge 1MB) { return ('{0:N0} MB' -f ($Bytes / 1MB)) }
        return ('{0:N0} KB' -f ($Bytes / 1KB))
    }

    # Adds up file sizes under a folder. Skips junctions and symbolic links,
    # skips folders it cannot read, and stops after $Seconds so one huge
    # folder cannot stall the run. Partial = true means the real size is larger.
    function Get-RcFolderSize {
        param([string]$Path, [double]$Seconds = 5)
        $res = [pscustomobject]@{ Bytes = [int64]0; Partial = $false; Exists = $false }
        if (-not $Path) { return $res }
        if (-not [System.IO.Directory]::Exists($Path)) { return $res }
        $res.Exists = $true
        $limitMs = [int64]($Seconds * 1000)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $reparse = [System.IO.FileAttributes]::ReparsePoint
        $stack = New-Object System.Collections.Stack
        $stack.Push((New-Object System.IO.DirectoryInfo -ArgumentList $Path))
        $total = [int64]0
        $count = 0
        while ($stack.Count -gt 0) {
            if ($sw.ElapsedMilliseconds -gt $limitMs) { $res.Partial = $true; break }
            $dir = $stack.Pop()
            try {
                foreach ($item in $dir.EnumerateFileSystemInfos()) {
                    $count++
                    if (($count % 500) -eq 0 -and $sw.ElapsedMilliseconds -gt $limitMs) { $res.Partial = $true; break }
                    if (($item.Attributes -band $reparse) -ne 0) { continue }
                    if ($item -is [System.IO.DirectoryInfo]) {
                        $stack.Push($item)
                    } else {
                        $total += $item.Length
                    }
                }
            } catch {
                $res.Partial = $true
            }
            if ($res.Partial -and $sw.ElapsedMilliseconds -gt $limitMs) { break }
        }
        $res.Bytes = $total
        return $res
    }

    function Get-RcFileSize {
        param([string]$Path)
        try {
            $f = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
            return [int64]$f.Length
        } catch {
            return $null
        }
    }

    Write-RcSection 'SPACE USED BY GAMING'
    Write-Host '  Measuring folders. Nothing is deleted. (up to a minute)' -ForegroundColor DarkGray

    $rc.Space = New-Object System.Collections.ArrayList
    $addSpace = {
        param([string]$Label, [string]$Kind, $Bytes, [bool]$Partial)
        if ($null -eq $Bytes) { return }
        if ([int64]$Bytes -lt 1MB) { return }
        [void]$rc.Space.Add([pscustomobject]@{ Label = $Label; Kind = $Kind; Bytes = [int64]$Bytes; Partial = $Partial })
    }
    $addFolder = {
        param([string]$Label, [string]$Kind, [string]$Path)
        $s = Get-RcFolderSize -Path $Path
        if ($s.Exists) { & $addSpace $Label $Kind $s.Bytes $s.Partial }
    }

    try {
        $local = $env:LOCALAPPDATA
        $progData = $env:ProgramData
        if ($local) {
            & $addFolder 'DirectX shader cache' 'shader' (Join-Path $local 'D3DSCache')
            & $addFolder 'NVIDIA DirectX shader cache' 'shader' (Join-Path $local 'NVIDIA\DXCache')
            & $addFolder 'NVIDIA OpenGL shader cache' 'shader' (Join-Path $local 'NVIDIA\GLCache')
            & $addFolder 'AMD DirectX shader cache' 'shader' (Join-Path $local 'AMD\DxCache')
            & $addFolder 'AMD DirectX 12 shader cache' 'shader' (Join-Path $local 'AMD\DxcCache')
            & $addFolder 'AMD Vulkan shader cache' 'shader' (Join-Path $local 'AMD\VkCache')
        }
        if ($progData) {
            & $addFolder 'NVIDIA shader cache (all users)' 'shader' (Join-Path $progData 'NVIDIA Corporation\NV_Cache')
        }
    } catch {
        Write-Verbose 'Shader cache sizes skipped.'
    }

    try {
        $steamLibs = @(Get-RcGameDirs | Where-Object { $_.Store -eq 'Steam' } | ForEach-Object { $_.Path } | Sort-Object -Unique)
        foreach ($lib in $steamLibs) {
            # String join, not Join-Path: Join-Path throws when a library drive is not connected.
            $apps = $lib.TrimEnd('\') + '\steamapps'
            if (-not (Test-Path -LiteralPath $apps)) { continue }
            $where = ''
            if ($lib -match '^([A-Za-z]):') { $where = ' (' + $Matches[1].ToUpper() + ':)' }
            & $addFolder ('Steam shader cache' + $where) 'shader' (Join-Path $apps 'shadercache')
            & $addFolder ('Steam unfinished downloads' + $where) 'download' (Join-Path $apps 'downloading')
            foreach ($acf in Get-ChildItem -LiteralPath $apps -Filter 'appmanifest_*.acf' -ErrorAction SilentlyContinue) {
                try {
                    $text = [string](Get-Content -LiteralPath $acf.FullName -Raw -ErrorAction Stop)
                    $name = $acf.BaseName
                    if ($text -match '"name"\s+"([^"]+)"') { $name = $Matches[1] }
                    if ($text -match '"SizeOnDisk"\s+"(\d+)"') {
                        & $addSpace ('Game: ' + $name + $where) 'game' ([int64]$Matches[1]) $false
                    }
                } catch {
                    Write-Verbose ('Skipped Steam manifest ' + $acf.Name)
                }
            }
        }
    } catch {
        Write-Verbose 'Steam library sizes skipped.'
    }

    try {
        $sysDrive = $env:SystemDrive
        if ($sysDrive) {
            & $addSpace 'Hibernation file (hiberfil.sys)' 'hiberfil' (Get-RcFileSize -Path ($sysDrive + '\hiberfil.sys')) $false
        }
        $pageFiles = @()
        try { $pageFiles = @(Get-CimInstance -ClassName Win32_PageFileUsage -ErrorAction Stop) } catch { $pageFiles = @() }
        if ($pageFiles.Count -gt 0) {
            foreach ($pf in $pageFiles) {
                & $addSpace ('Page file (' + [string]$pf.Name + ')') 'pagefile' ([int64]$pf.AllocatedBaseSize * 1MB) $false
            }
        } elseif ($sysDrive) {
            & $addSpace 'Page file (pagefile.sys)' 'pagefile' (Get-RcFileSize -Path ($sysDrive + '\pagefile.sys')) $false
        }
        if ($env:SystemRoot) {
            & $addFolder 'Windows Update downloads' 'update' (Join-Path $env:SystemRoot 'SoftwareDistribution\Download')
        }
    } catch {
        Write-Verbose 'System file sizes skipped.'
    }

    try {
        if ($rc.Space.Count -eq 0) {
            Write-Host '  Nothing found to measure.' -ForegroundColor DarkGray
        } else {
            foreach ($row in @($rc.Space | Sort-Object -Property Bytes -Descending)) {
                $sizeText = Format-RcSize -Bytes $row.Bytes
                if ($row.Partial) { $sizeText = '> ' + $sizeText + ' (partial)' }
                $color = 'Gray'
                if ($row.Kind -eq 'shader') { $color = 'DarkCyan' }
                if ($row.Kind -eq 'game') { $color = 'White' }
                Write-Host ('  ' + $sizeText.PadLeft(22) + '  ') -NoNewline -ForegroundColor Yellow
                Write-Host $row.Label -ForegroundColor $color
            }
            $kinds = @($rc.Space | ForEach-Object { $_.Kind } | Sort-Object -Unique)
            Write-Host ''
            if ($kinds -contains 'shader') {
                Write-Host '  Shader caches: do NOT delete them. Games stutter while they rebuild them.' -ForegroundColor DarkYellow
            }
            if ($kinds -contains 'download') {
                Write-Host '  Steam unfinished downloads: finish or cancel the update in Steam > Downloads.' -ForegroundColor DarkGray
            }
            if ($kinds -contains 'update') {
                Write-Host '  Windows Update downloads: Settings > System > Storage > Temporary files > Windows Update Cleanup.' -ForegroundColor DarkGray
            }
            if ($kinds -contains 'hiberfil') {
                Write-Host '  Hibernation file: "powercfg /hibernate off" in an admin prompt removes it (also turns off Fast Startup).' -ForegroundColor DarkGray
            }
            if ($kinds -contains 'pagefile') {
                Write-Host '  Page file: leave it on. Games crash with "out of memory" without it.' -ForegroundColor DarkGray
            }
        }
        Write-Host '  To see everything on a drive, use WizTree (free, in the RockTune software list).' -ForegroundColor DarkGray
    } catch {
        Write-Host '  Could not show the space table.' -ForegroundColor DarkGray
    }

    # ------------------------------------------------------------------
    # Score card
    # ------------------------------------------------------------------

    $scored = @($rc.Results | Where-Object { $_.Status -eq 'PASS' -or $_.Status -eq 'WARN' -or $_.Status -eq 'FAIL' })
    $possible = 0
    $earned = 0.0
    foreach ($r in $scored) {
        $possible += $r.Weight
        if ($r.Status -eq 'PASS') { $earned += $r.Weight }
        if ($r.Status -eq 'WARN') { $earned += $r.Weight / 2 }
    }
    $score = 0
    if ($possible -gt 0) { $score = [int][math]::Round(100 * $earned / $possible) }

    $passCount = @($rc.Results | Where-Object { $_.Status -eq 'PASS' }).Count
    $warnCount = @($rc.Results | Where-Object { $_.Status -eq 'WARN' }).Count
    $failCount = @($rc.Results | Where-Object { $_.Status -eq 'FAIL' }).Count
    $skipCount = @($rc.Results | Where-Object { $_.Status -eq 'SKIP' }).Count

    $grade = 'Tournament ready.'
    $gradeColor = 'Green'
    if ($score -lt 90) { $grade = 'Good setup. A few fixes left.'; $gradeColor = 'Green' }
    if ($score -lt 75) { $grade = 'Several settings cost you frames.'; $gradeColor = 'Yellow' }
    if ($score -lt 50) { $grade = 'Your PC loses a lot of performance to setup problems.'; $gradeColor = 'Red' }

    $barWidth = 30
    $filled = [int][math]::Round($barWidth * $score / 100)
    $bar = ('#' * $filled) + ('.' * ($barWidth - $filled))

    Write-Host ''
    Write-Host '  +----------------------------------------------+' -ForegroundColor Magenta
    Write-Host '  |                  SCORE CARD                  |' -ForegroundColor Magenta
    Write-Host '  +----------------------------------------------+' -ForegroundColor Magenta
    Write-Host ''
    Write-Host '   ' -NoNewline
    Write-Host ("$score / 100") -NoNewline -ForegroundColor $gradeColor
    Write-Host ('   [' + $bar + ']') -ForegroundColor $gradeColor
    Write-Host ('   ' + $grade) -ForegroundColor $gradeColor
    Write-Host ("   $passCount pass, $warnCount warn, $failCount fail, $skipCount skipped") -ForegroundColor DarkGray

    $todo = @($rc.Results | Where-Object { $_.Status -eq 'FAIL' -or $_.Status -eq 'WARN' } |
            Sort-Object -Property @{ Expression = { if ($_.Status -eq 'FAIL') { 0 } else { 1 } } }, @{ Expression = { $_.Weight }; Descending = $true } |
            Select-Object -First 3)

    Write-Host ''
    if ($todo.Count -eq 0) {
        Write-Host '   Nothing to fix. Go play.' -ForegroundColor Green
    } else {
        Write-Host '   TOP FIXES' -ForegroundColor Cyan
        $n = 1
        foreach ($t in $todo) {
            Write-Host ("   $n. " + $t.Label + ': ') -NoNewline -ForegroundColor White
            Write-Host $t.Detail -ForegroundColor Gray
            Write-Host ('      -> ' + $t.Fix) -ForegroundColor DarkYellow
            $n++
        }
    }
    Write-Host ''
    Write-Host '   Build a tuning script for the rest: https://rocktune.pedroferrari.com' -ForegroundColor DarkGray
    Write-Host ''

    # ------------------------------------------------------------------
    # Optional clipboard report
    # ------------------------------------------------------------------

    try {
        if (-not [Environment]::UserInteractive) { return }
        # [string] turns "no input" into '' so the -notmatch test below is a real yes/no.
        $answer = [string](Read-Host '  Copy a text report to the clipboard? [y/N]')
        if ($answer -notmatch '^(y|yes)$') { return }
        $lines = New-Object System.Collections.ArrayList
        [void]$lines.Add("RockTune Rig Check: $score / 100 - $grade")
        [void]$lines.Add($machineLine.Trim())
        foreach ($r in $rc.Results) {
            if ($r.Status -eq 'INFO') { continue }
            [void]$lines.Add(('[' + $r.Status + '] ' + $r.Label + ': ' + $r.Detail))
            if (($r.Status -eq 'WARN' -or $r.Status -eq 'FAIL') -and $r.Fix) {
                [void]$lines.Add(('       Fix: ' + $r.Fix))
            }
        }
        if ($rc.Space -and $rc.Space.Count -gt 0) {
            [void]$lines.Add('Space used by gaming (largest 10):')
            foreach ($row in @($rc.Space | Sort-Object -Property Bytes -Descending | Select-Object -First 10)) {
                $sizeText = Format-RcSize -Bytes $row.Bytes
                if ($row.Partial) { $sizeText = '> ' + $sizeText }
                [void]$lines.Add(('  ' + $sizeText + '  ' + $row.Label))
            }
        }
        [void]$lines.Add('Run it yourself: irm https://rocktune.pedroferrari.com/check.ps1 | iex')
        Set-Clipboard -Value ($lines -join [Environment]::NewLine)
        Write-Host '  Copied.' -ForegroundColor Green
    } catch {
        Write-Host '  Could not copy to the clipboard.' -ForegroundColor DarkGray
    }
}

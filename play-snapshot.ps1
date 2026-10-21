<#
.SYNOPSIS
    RockTune Play Snapshot: shows what runs in the background while you play.
.DESCRIPTION
    Start your game first, then run this script. It waits 5 seconds so you
    can switch back to the game, watches every process for 30 seconds, and
    prints the top 10 by CPU and the top 10 by disk. For known background
    apps (OneDrive, Windows Search, Defender scans, browsers, updaters, RGB
    and mouse software) it prints the fix. It changes nothing on the PC.

    Hosted one-liner:
      irm https://rocktune.pedroferrari.com/snapshot.ps1 | iex

    Local copy:
      powershell -ExecutionPolicy Bypass -File .\play-snapshot.ps1

    Documentation: https://rocktune.pedroferrari.com
    Source: https://github.com/thepedroferrari/rocktune
#>

# Everything runs inside one script block so that `irm | iex` does not leave
# functions or variables behind in the user's PowerShell session.
& {
    $seconds = 30
    $cores = 1
    try { $cores = [Math]::Max(1, [Environment]::ProcessorCount) } catch { $cores = 1 }

    $selfName = ''
    try { $selfName = (Get-Process -Id $PID -ErrorAction Stop).ProcessName.ToLower() } catch { $selfName = '' }

    # Process name (lower case, no .exe) -> what it is and how to stop it.
    # The first matching pattern wins.
    $offenders = @(
        @{ P = '^onedrive'; What = 'OneDrive sync'; Fix = 'Pause syncing while you play: OneDrive icon in the taskbar > Pause syncing.' }
        @{ P = '^(searchindexer|searchprotocolhost|searchfilterhost|searchhost)$'; What = 'Windows Search indexing'; Fix = 'RockTune option "Windows Search Off", or Settings > Privacy and security > Searching Windows > add your game folders to Excluded folders.' }
        @{ P = '^(msmpeng|mpdefendercoreservice|nissrv|mpcmdrun)$'; What = 'Microsoft Defender scan'; Fix = 'RockTune options "Defender Scans When Idle" and "Defender Skips Game Folders".' }
        @{ P = '^(widgets|widgetservice|widgetboard)$'; What = 'Windows Widgets'; Fix = 'RockTune option "Widgets Off".' }
        @{ P = 'copilot'; What = 'Copilot'; Fix = 'RockTune option "Disable Copilot".' }
        @{ P = '^(ms-teams|teams|msteams)$'; What = 'Microsoft Teams'; Fix = 'Quit Teams from its taskbar icon. Teams > Settings > General: turn off auto-start.' }
        @{ P = '^(msedge|chrome|firefox|brave|opera|opera_gx|vivaldi)$'; What = 'Web browser'; Fix = 'Close the browser, or turn on the RockTune option "Browser Background Apps Off" so it stops running after you close it.' }
        @{ P = '^(epicwebhelper|epicgameslauncher)$'; What = 'Epic Games launcher'; Fix = 'Close the Epic launcher when the game does not need it. Epic > Settings: turn off "Minimize to system tray".' }
        @{ P = '^(tiworker|trustedinstaller|wuauclt|usoclient|mousocoreworker|musnotification|musnotificationux|sihclient|wudfhost_update)$'; What = 'Windows Update'; Fix = 'An update is installing. Let it finish and restart before you play. RockTune options "Gaming Active Hours" and "Delivery Optimization Off" move updates out of play time.' }
        @{ P = '(update|updater)'; What = 'App updater'; Fix = 'An app is updating itself. It stops when done; set the app to update when you are not playing.' }
        @{ P = '^(razer|rz)'; What = 'Razer Synapse'; Fix = 'Save your settings to the device (Synapse > onboard memory), then quit Synapse and turn off its auto-start.' }
        @{ P = '^lghub'; What = 'Logitech G HUB'; Fix = 'Save your settings to the device (G HUB > onboard memory mode), then quit G HUB and turn off its auto-start.' }
        @{ P = '^(icue|corsair)'; What = 'Corsair iCUE'; Fix = 'Save your settings to the device (iCUE > device memory), then quit iCUE and turn off its auto-start.' }
        @{ P = '^(armourycrate|armourysocketserver|asus_framework|asusoptimization|rogliveservice|lightingservice)'; What = 'ASUS Armoury Crate'; Fix = 'Armoury Crate > Settings: turn off what you do not use, or uninstall it with the Armoury Crate Uninstall Tool from asus.com.' }
        @{ P = '^(backgroundtaskhost|runtimebroker)$'; What = 'Windows background apps'; Fix = 'RockTune option "Background Apps".' }
    )

    function Get-PsOffender {
        param([string]$Name)
        foreach ($o in $offenders) {
            if ($Name -match $o.P) { return $o }
        }
        return $null
    }

    function Format-PsRate {
        param([double]$BytesPerSec)
        if ($BytesPerSec -ge 1MB) { return ('{0:N1} MB/s' -f ($BytesPerSec / 1MB)) }
        return ('{0:N0} KB/s' -f ($BytesPerSec / 1KB))
    }

    # name -> @{ Name; CpuSum; CpuPeak; IoSum; Instances }
    $stats = @{}
    $samples = 0
    $method = 'none'

    function Add-PsStat {
        param([string]$Name, [double]$Cpu, [double]$Io, [int]$Instances)
        if (-not $stats.ContainsKey($Name)) {
            $stats[$Name] = [pscustomobject]@{ Name = $Name; CpuSum = 0.0; CpuPeak = 0.0; IoSum = 0.0; Instances = 0 }
        }
        $s = $stats[$Name]
        $s.CpuSum += $Cpu
        if ($Cpu -gt $s.CpuPeak) { $s.CpuPeak = $Cpu }
        $s.IoSum += $Io
        if ($Instances -gt $s.Instances) { $s.Instances = $Instances }
    }

    $art = @'
  ____  _               ____                        _           _
 |  _ \| | __ _ _   _  / ___| _ __   __ _ _ __  ___| |__   ___ | |_
 | |_) | |/ _` | | | | \___ \| '_ \ / _` | '_ \/ __| '_ \ / _ \| __|
 |  __/| | (_| | |_| |  ___) | | | | (_| | |_) \__ \ | | | (_) | |_
 |_|   |_|\__,_|\__, | |____/|_| |_|\__,_| .__/|___/_| |_|\___/ \__|
                |___/                    |_|
'@
    Write-Host ''
    Write-Host $art -ForegroundColor Magenta
    Write-Host '  RockTune Play Snapshot - what runs while you play. Changes nothing.' -ForegroundColor Cyan
    Write-Host '  https://rocktune.pedroferrari.com' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Your game should be running now. Switch back to it and play normally.' -ForegroundColor White

    # ------------------------------------------------------------------
    # Countdown
    # ------------------------------------------------------------------

    try {
        for ($i = 5; $i -ge 1; $i--) {
            Write-Host ("`r  Starting in $i... ") -NoNewline -ForegroundColor Yellow
            Start-Sleep -Seconds 1
        }
        Write-Host ''
    } catch {
        Write-Host ''
    }

    # ------------------------------------------------------------------
    # Which process is the game: the one using the most 3D GPU time
    # ------------------------------------------------------------------

    $gameName = ''
    try {
        $gpu = Get-Counter -Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -MaxSamples 1 -ErrorAction SilentlyContinue
        if ($gpu) {
            $byPid = @{}
            foreach ($cs in $gpu.CounterSamples) {
                if ($cs.InstanceName -match '^pid_(\d+)_') {
                    $p = [int]$Matches[1]
                    if (-not $byPid.ContainsKey($p)) { $byPid[$p] = 0.0 }
                    $byPid[$p] += [double]$cs.CookedValue
                }
            }
            $top = $byPid.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1
            if ($top -and $top.Value -gt 5) {
                $proc = Get-Process -Id $top.Key -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -notmatch '^(dwm|explorer|csrss)$') {
                    $gameName = $proc.ProcessName.ToLower()
                }
            }
        }
    } catch {
        $gameName = ''
    }

    # ------------------------------------------------------------------
    # Sample CPU and disk for 30 seconds
    # ------------------------------------------------------------------

    try {
        $counters = @('\Process(*)\% Processor Time', '\Process(*)\IO Data Bytes/sec')
        Get-Counter -Counter $counters -SampleInterval 1 -MaxSamples $seconds -ErrorAction SilentlyContinue | ForEach-Object {
            $cpuBy = @{}
            $ioBy = @{}
            $countBy = @{}
            foreach ($cs in $_.CounterSamples) {
                $inst = [string]$cs.InstanceName
                if ($inst -eq '_total' -or $inst -eq 'idle') { continue }
                $name = ($inst -replace '#\d+$', '').ToLower()
                if ($cs.Path -match 'processor time$') {
                    if (-not $cpuBy.ContainsKey($name)) { $cpuBy[$name] = 0.0; $countBy[$name] = 0 }
                    $cpuBy[$name] += [double]$cs.CookedValue / $cores
                    $countBy[$name]++
                } elseif ($cs.Path -match 'bytes/sec$') {
                    if (-not $ioBy.ContainsKey($name)) { $ioBy[$name] = 0.0 }
                    $ioBy[$name] += [double]$cs.CookedValue
                }
            }
            foreach ($n in $cpuBy.Keys) {
                $io = 0.0
                if ($ioBy.ContainsKey($n)) { $io = $ioBy[$n] }
                Add-PsStat -Name $n -Cpu $cpuBy[$n] -Io $io -Instances $countBy[$n]
            }
            $samples++
            Write-Host ("`r  Watching... $samples / $seconds s ") -NoNewline -ForegroundColor Yellow
        }
        if ($samples -gt 0) { $method = 'counters'; Write-Host '' }
    } catch {
        $samples = 0
    }

    # Fallback when performance counters are missing or have translated
    # names: compare CPU time and disk bytes of every process at the start
    # and at the end of the 30 seconds.
    if ($samples -eq 0) {
        try {
            $first = @{}
            foreach ($p in Get-CimInstance -ClassName Win32_Process -ErrorAction Stop) {
                $first[[int]$p.ProcessId] = $p
            }
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            for ($i = 1; $i -le $seconds; $i++) {
                Start-Sleep -Seconds 1
                Write-Host ("`r  Watching... $i / $seconds s ") -NoNewline -ForegroundColor Yellow
            }
            Write-Host ''
            $elapsed = [Math]::Max(1.0, $sw.Elapsed.TotalSeconds)
            $cpuBy = @{}
            $ioBy = @{}
            $countBy = @{}
            foreach ($p in Get-CimInstance -ClassName Win32_Process -ErrorAction Stop) {
                $id = [int]$p.ProcessId
                if ($id -eq 0 -or -not $first.ContainsKey($id)) { continue }
                $a = $first[$id]
                $name = ([string]$p.Name -replace '\.exe$', '').ToLower()
                $cpuTicks = ([double]$p.KernelModeTime + [double]$p.UserModeTime) - ([double]$a.KernelModeTime + [double]$a.UserModeTime)
                $ioBytes = ([double]$p.ReadTransferCount + [double]$p.WriteTransferCount + [double]$p.OtherTransferCount) - ([double]$a.ReadTransferCount + [double]$a.WriteTransferCount + [double]$a.OtherTransferCount)
                $cpuPct = 100.0 * $cpuTicks / ($elapsed * 10000000.0 * $cores)
                if (-not $cpuBy.ContainsKey($name)) { $cpuBy[$name] = 0.0; $ioBy[$name] = 0.0; $countBy[$name] = 0 }
                $cpuBy[$name] += [Math]::Max(0.0, $cpuPct)
                $ioBy[$name] += [Math]::Max(0.0, $ioBytes / $elapsed)
                $countBy[$name]++
            }
            foreach ($n in $cpuBy.Keys) {
                Add-PsStat -Name $n -Cpu $cpuBy[$n] -Io $ioBy[$n] -Instances $countBy[$n]
            }
            $samples = 1
            $method = 'totals'
        } catch {
            $samples = 0
        }
    }

    if ($samples -eq 0) {
        Write-Host ''
        Write-Host '  Could not read process data. Run this in Windows PowerShell on the gaming PC.' -ForegroundColor Red
        Write-Host ''
        return
    }

    try { [Console]::Beep(880, 200) } catch { Write-Verbose 'No beep.' }

    # ------------------------------------------------------------------
    # Results
    # ------------------------------------------------------------------

    $rows = @($stats.Values | ForEach-Object {
            [pscustomobject]@{
                Name      = $_.Name
                Cpu       = $_.CpuSum / $samples
                CpuPeak   = $_.CpuPeak
                Io        = $_.IoSum / $samples
                Instances = $_.Instances
            }
        })

    if (-not $gameName) {
        $guess = $rows | Where-Object { $_.Name -ne $selfName -and $_.Name -notmatch '^(system|dwm|csrss|svchost|audiodg|memory compression|registry|explorer|wmiprvse)$' -and -not (Get-PsOffender -Name $_.Name) } |
            Sort-Object -Property Cpu -Descending | Select-Object -First 1
        if ($guess) { $gameName = $guess.Name }
    }

    $background = @($rows | Where-Object { $_.Name -ne $gameName -and $_.Name -ne $selfName })

    Write-Host ''
    if ($gameName) {
        $g = $rows | Where-Object { $_.Name -eq $gameName } | Select-Object -First 1
        $gCpu = 0.0
        if ($g) { $gCpu = $g.Cpu }
        Write-Host ('  Probably your game: ' + $gameName + (' ({0:N1}% CPU). Left out of the lists below.' -f $gCpu)) -ForegroundColor Green
    }
    Write-Host ("  CPU % is a share of the whole CPU ($cores threads = 100%).") -ForegroundColor DarkGray

    $fixes = New-Object System.Collections.ArrayList

    $printRow = {
        param($Row, [string]$Value)
        $label = $Row.Name
        if ($Row.Instances -gt 1) { $label += ' (' + $Row.Instances + ' processes)' }
        $o = Get-PsOffender -Name $Row.Name
        if ($o) { $label += '  <- ' + $o.What }
        $color = 'Gray'
        if ($o) { $color = 'Yellow' }
        Write-Host ('  ' + $Value.PadLeft(16) + '  ') -NoNewline -ForegroundColor White
        Write-Host $label -ForegroundColor $color
        if ($o -and -not ($fixes -contains $o.What)) { [void]$fixes.Add($o.What) }
    }

    try {
        Write-Host ''
        Write-Host '  == TOP 10 BY CPU (average, peak)' -ForegroundColor Cyan
        foreach ($r in @($background | Sort-Object -Property Cpu -Descending | Select-Object -First 10)) {
            $v = '{0:N1}%' -f $r.Cpu
            if ($method -eq 'counters') { $v += (' ({0:N0}%)' -f $r.CpuPeak) }
            & $printRow $r $v
        }
    } catch {
        Write-Host '  Could not list CPU use.' -ForegroundColor DarkGray
    }

    try {
        Write-Host ''
        Write-Host '  == TOP 10 BY DISK (average read + write)' -ForegroundColor Cyan
        foreach ($r in @($background | Where-Object { $_.Io -ge 1KB } | Sort-Object -Property Io -Descending | Select-Object -First 10)) {
            & $printRow $r (Format-PsRate -BytesPerSec $r.Io)
        }
    } catch {
        Write-Host '  Could not list disk use.' -ForegroundColor DarkGray
    }

    try {
        $conns = @(Get-NetTCPConnection -State Established -ErrorAction Stop)
        if ($conns.Count -gt 0) {
            $pidNames = @{}
            foreach ($p in Get-Process -ErrorAction SilentlyContinue) { $pidNames[[int]$p.Id] = $p.ProcessName.ToLower() }
            $names = @{}
            foreach ($c in $conns) {
                $owner = [int]$c.OwningProcess
                if (-not $pidNames.ContainsKey($owner)) { continue }
                $n = $pidNames[$owner]
                if ($n -eq $gameName -or $n -eq $selfName) { continue }
                if (-not $names.ContainsKey($n)) { $names[$n] = 0 }
                $names[$n]++
            }
            Write-Host ''
            Write-Host '  == MOST INTERNET CONNECTIONS (open right now)' -ForegroundColor Cyan
            foreach ($e in @($names.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 5)) {
                & $printRow ([pscustomobject]@{ Name = $e.Key; Instances = 1 }) ([string]$e.Value)
            }
        }
    } catch {
        Write-Verbose 'Connection list skipped.'
    }

    Write-Host ''
    if ($fixes.Count -eq 0) {
        Write-Host '  No known background troublemakers found. Go play.' -ForegroundColor Green
    } else {
        Write-Host '  == HOW TO STOP THEM' -ForegroundColor Cyan
        foreach ($o in $offenders) {
            if ($fixes -contains $o.What) {
                Write-Host ('  ' + $o.What + ': ') -NoNewline -ForegroundColor White
                Write-Host $o.Fix -ForegroundColor DarkYellow
            }
        }
    }
    Write-Host ''
    Write-Host '  Check the rest of your setup: irm https://rocktune.pedroferrari.com/check.ps1 | iex' -ForegroundColor DarkGray
    Write-Host '  Build a tuning script: https://rocktune.pedroferrari.com' -ForegroundColor DarkGray
    Write-Host ''
}

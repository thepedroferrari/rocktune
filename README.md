# RockTune

**Windows tuning for gamers.**

RockTune builds a PowerShell script that sets Windows up for games on your hardware. It reads your CPU, GPU and network adapter, then applies the settings that change frame times, input delay and network delay: power plans, timer resolution, MSI mode, MMCSS, GPU scheduling, AMD X3D core parking, network adapter settings, and turning off overlays and background apps that run during a game. It also installs your gaming software and peripheral apps, and includes a benchmark mode so you can measure the result.

RockTune does not do general Windows cleanup such as removing built-in apps, turning off telemetry, or removing ads, Edge or OneDrive. Two well-maintained projects already do that job, listed under [Works with](#works-with).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1+-green.svg)](https://github.com/PowerShell/PowerShell)

## Recommended order

1. Run **WinUtil** or **Win11Debloat** on its default settings for general cleanup. Leave the Xbox, Game Bar, Xbox Identity Provider, Xbox TCUI and Microsoft Store boxes unticked: games need them.
2. Run **RockTune**. It checks for missing Store, Game Bar, Xbox sign-in, Xbox service and GameInput parts first, and offers to put them back.
3. Reboot.

Build your script at [rocktune.pedroferrari.com](https://rocktune.pedroferrari.com), or run it from this repository:

```powershell
git clone https://github.com/thepedroferrari/rocktune.git
cd rocktune
.\gaming-pc-setup.ps1            # run as Administrator
.\gaming-pc-setup.ps1 -DryRun    # print every change without applying it
.\gaming-pc-setup.ps1 -Undo      # put back every value RockTune recorded
```

Every run creates a System Restore point first and records each registry value, service start type and scheduled task it changes in `%ProgramData%\RockTune\`. `-Undo` restores them, including changes made by older RockTune versions.

## Works with

Both projects are free and open source, and handle general Windows cleanup better than a gaming tool can. Run one of them before RockTune, in an Administrator PowerShell window:

- **[WinUtil](https://github.com/ChrisTitusTech/winutil)** by Chris Titus Tech installs programs, applies tweaks such as turning off telemetry and removing apps, and repairs Windows Update from one window.

  ```powershell
  irm "https://christitus.com/win" | iex
  ```

- **[Win11Debloat](https://github.com/Raphire/Win11Debloat)** by Raphire removes preinstalled apps and turns off telemetry, ads and Bing search on Windows 10 and 11, with an undo for each change.

  ```powershell
  & ([scriptblock]::Create((irm "https://debloat.raphi.re/")))
  ```

If either project saves you time, give it a star on GitHub and send its maintainers bug reports and pull requests.

## AMD Ryzen X3D

RockTune detects X3D CPUs and keeps CPPC and Game Bar game detection on. The AMD 3D V-Cache driver uses Game Bar to tell which program is a game and keep it on the V-Cache cores, so RockTune reports a missing Game Bar as critical on X3D systems. Keep CPPC enabled in the BIOS and install the latest AMD chipset driver. See [DRIVER-LINKS.md](DRIVER-LINKS.md) for driver downloads and BIOS settings.

## Benchmarking

`benchmark-setup.ps1` installs and opens a free, repeatable test set so you can compare frame rate and frame times before and after tuning, without depending on one game:

- Unigine Superposition gives the same workload every run.
- CapFrameX records frame times and shows 1% and 0.1% lows, not only the average.
- LatencyMon shows which drivers cause stutter.

The script changes no settings. It asks before installing anything with winget.

```powershell
.\benchmark-setup.ps1
# or the hosted copy:
irm https://rocktune.pedroferrari.com/benchmark.ps1 | iex
```

Run each test 3 times, discard the first run, and average the other two.

## Rig Check

`rig-check.ps1` finds setup mistakes that cost frames: RAM below its rated speed (XMP or EXPO off), one RAM stick, a monitor below its highest refresh rate, the display cable in the motherboard port, old GPU drivers, Resizable BAR off, games on a hard disk, a low-power plan, a missing AMD X3D V-Cache driver, disabled Xbox services and more. It prints a score out of 100 and the top 3 fixes, with the BIOS setting, the Windows Settings path or the RockTune option for each. It changes nothing and needs no administrator rights.

It also lists the space that gaming takes on your drives: each Steam game, the DirectX, NVIDIA, AMD and Steam shader caches, unfinished Steam downloads, the hibernation and page files and Windows Update downloads. It deletes nothing. Keep the shader caches: games stutter while they rebuild them.

```powershell
irm https://rocktune.pedroferrari.com/check.ps1 | iex
```

## Play Snapshot

`play-snapshot.ps1` shows what runs in the background while you play. Start your game, run the line below, then switch back to the game. After 5 seconds it watches every process for 30 seconds and lists the top 10 by CPU and the top 10 by disk, without the game itself. For known background apps (OneDrive, Windows Search, Defender scans, browsers, Copilot, Teams, Windows Update, app updaters, Razer, Logitech, Corsair and ASUS software) it prints the RockTune option or the setting that stops them. It changes nothing.

```powershell
irm https://rocktune.pedroferrari.com/snapshot.ps1 | iex
```

## Timer tool

`timer-tool.ps1` sets the Windows timer resolution to 0.5 ms (the default is 15.6 ms) for smoother frame pacing. Start it before you play and keep it open:

```powershell
.\timer-tool.ps1
.\timer-tool.ps1 -GameProcess "dota2"   # exits when the game closes
```

Press Ctrl+C to stop it. `Get-Help .\timer-tool.ps1 -Full` explains how it works.

## Web app

The `web/` folder holds the loadout builder at [rocktune.pedroferrari.com](https://rocktune.pedroferrari.com): pick hardware and a preset, review each change and its risk level, and share the result as a link. See [web/README.md](web/README.md).

## Troubleshooting

- **Still stuttering?** Run [LatencyMon](https://www.resplendence.com/latencymon) for 5 minutes while playing, update audio drivers, try GPU scheduling on and off, and close RGB software (iCUE, Synapse, G HUB).
- **X3D performance inconsistent?** Check that the AMD chipset driver is installed and Game Bar is present. RockTune checks both.
- **Game Pass or Xbox sign-in broken after a cleanup tool?** Run `.\gaming-pc-setup.ps1`. The compatibility check finds and reinstalls the missing parts.
- Logs are in `gaming-pc-setup.log`. Open an issue on GitHub with the log attached.

## License

MIT. See [LICENSE](LICENSE).

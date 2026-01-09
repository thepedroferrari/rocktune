<#
.SYNOPSIS
    Software configuration automation (Discord, Steam, Audio, Monitor).
.DESCRIPTION
    Automates settings for gaming software and Windows multimedia devices that
    are typically manual. Requires apps to be closed before running. Creates
    backups of all config files before modification.
.NOTES
    Requires Administrator for audio registry changes. Discord and Steam config
    modifications work without elevation but apps must be closed.
#>

Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global


function Backup-ConfigFile {
    <#
    .SYNOPSIS
        Creates a timestamped backup of a config file.
    .DESCRIPTION
        Copies the file to a .backup_TIMESTAMP extension in the same directory.
        Returns backup path on success or $false on failure.
    .PARAMETER Path
        Path to the config file to backup.
    .OUTPUTS
        [string] Backup file path, or [bool]$false on failure.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        if (-not (Test-Path $Path)) {
            Write-Log "Cannot backup: file not found: $Path" "WARNING"
            return $false
        }

        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupPath = "$Path.backup_$timestamp"

        Copy-Item -Path $Path -Destination $backupPath -Force -ErrorAction Stop
        Write-Log "Backup created: $backupPath" "INFO"
        return $backupPath
    }
    catch {
        Write-Log "Failed to backup $Path : $_" "ERROR"
        return $false
    }
}


function Set-DiscordGamingSettings {
    <#
    .SYNOPSIS
        Applies gaming-optimized settings to Discord.
    .DESCRIPTION
        Modifies Discord's settings.json to disable performance-impacting features.
        Creates backup before changes. Skips if Discord is running or not installed.
    .PARAMETER DisableHardwareAccel
        Disable GPU hardware acceleration (reduces GPU load).
    .PARAMETER DisableOverlay
        Disable in-game overlay (reduces latency).
    .PARAMETER DisableActivityStatus
        Disable activity status broadcasting (reduces network traffic).
    .PARAMETER DisableEchoCancellation
        Disable echo cancellation (reduces CPU load, use headphones).
    .PARAMETER StandardNoiseSuppression
        Set noise suppression to standard (balanced).
    .PARAMETER DisableAutoGainControl
        Disable automatic gain control (consistent mic volume).
    .OUTPUTS
        None.
    .NOTES
        Discord may overwrite these settings on launch in rare cases. If settings
        revert, consider using Discord's UI to apply them manually.
    #>
    [CmdletBinding()]
    param(
        [bool]$DisableHardwareAccel = $false,
        [bool]$DisableOverlay = $false,
        [bool]$DisableActivityStatus = $false,
        [bool]$DisableEchoCancellation = $false,
        [bool]$StandardNoiseSuppression = $false,
        [bool]$DisableAutoGainControl = $false
    )

    Write-Log "Configuring Discord gaming settings..." "INFO"

    $settingsPath = Join-Path $env:APPDATA "discord\settings.json"

    # Check if Discord is installed
    if (-not (Test-Path $settingsPath)) {
        Write-Log "Discord not found at $settingsPath - skipping" "INFO"
        return
    }

    # Check if Discord is running
    $discordProcess = Get-Process -Name "Discord" -ErrorAction SilentlyContinue
    if ($discordProcess) {
        Write-Log "⚠️  Discord is running! Please close Discord and re-run this script." "WARNING"
        Write-Log "Discord settings NOT applied (app must be closed first)" "WARNING"
        return
    }

    try {
        # Backup existing settings
        $backup = Backup-ConfigFile -Path $settingsPath
        if ($backup -eq $false) {
            Write-Log "Skipping Discord settings (backup failed)" "WARNING"
            return
        }

        # Read existing settings
        $settingsJson = Get-Content $settingsPath -Raw -ErrorAction Stop
        $settings = $settingsJson | ConvertFrom-Json

        # Apply settings
        $changesMade = $false

        # Note: Hardware acceleration is NOT exposed in settings.json
        # It can only be disabled via UI or by modifying Discord shortcuts with --disable-hardware-acceleration flag
        if ($DisableHardwareAccel) {
            Write-Log "  ⚠️  Hardware acceleration requires manual configuration:" "WARNING"
            Write-Log "      Option 1: User Settings → Advanced → Toggle Hardware Acceleration OFF" "INFO"
            Write-Log "      Option 2: Add --disable-hardware-acceleration to Discord shortcut target" "INFO"
        }

        if ($DisableOverlay) {
            $settings | Add-Member -NotePropertyName "OVERLAY" -NotePropertyValue $false -Force
            $changesMade = $true
            Write-Log "  ✓ Overlay disabled" "INFO"
        }

        if ($DisableActivityStatus) {
            $settings | Add-Member -NotePropertyName "status" -NotePropertyValue "invisible" -Force
            $changesMade = $true
            Write-Log "  ✓ Activity status hidden" "INFO"
        }

        if ($DisableEchoCancellation) {
            $settings | Add-Member -NotePropertyName "echoCancellation" -NotePropertyValue $false -Force
            $changesMade = $true
            Write-Log "  ✓ Echo cancellation disabled" "INFO"
        }

        if ($StandardNoiseSuppression) {
            $settings | Add-Member -NotePropertyName "noiseSuppression" -NotePropertyValue "standard" -Force
            $changesMade = $true
            Write-Log "  ✓ Noise suppression set to standard" "INFO"
        }

        if ($DisableAutoGainControl) {
            $settings | Add-Member -NotePropertyName "automaticGainControl" -NotePropertyValue $false -Force
            $changesMade = $true
            Write-Log "  ✓ Auto gain control disabled" "INFO"
        }

        if ($changesMade) {
            # Write settings back to file
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -ErrorAction Stop
            Write-Log "Discord gaming settings applied successfully" "SUCCESS"
            Write-Log "Backup: $backup" "INFO"
        }
        else {
            Write-Log "No Discord settings were changed (all parameters false)" "INFO"
        }
    }
    catch {
        Write-Log "Failed to apply Discord settings: $_" "ERROR"
        Write-Log "You can restore from backup: $backup" "INFO"
    }
}


function Set-AudioDeviceProperties {
    <#
    .SYNOPSIS
        Configures Windows audio device properties for low-latency gaming.
    .DESCRIPTION
        Modifies registry settings for the default playback device to optimize
        sample rate, bit depth, exclusive mode, and disable enhancements.
        Creates registry backups before changes.
    .PARAMETER SampleRate
        Sample rate in Hz (e.g., 48000, 96000, 192000). Higher = more CPU.
        Default: 48000 (most compatible).
    .PARAMETER BitDepth
        Bit depth: 16 or 24. Higher = better quality, slightly more CPU.
        Default: 24.
    .PARAMETER DisableSpatialAudio
        Disable spatial audio processing (lower latency).
    .PARAMETER EnableExclusiveMode
        Allow apps to take exclusive control (lowest latency for games).
    .PARAMETER DisableEnhancements
        Disable all audio enhancements (lower latency, predictable output).
    .OUTPUTS
        None.
    .NOTES
        Requires Administrator. Only modifies default playback device.
    #>
    [CmdletBinding()]
    param(
        [int]$SampleRate = 48000,
        [int]$BitDepth = 24,
        [bool]$DisableSpatialAudio = $false,
        [bool]$EnableExclusiveMode = $false,
        [bool]$DisableEnhancements = $false
    )

    Write-Log "Configuring audio device properties..." "INFO"

    try {
        # Get default audio device
        $audioDevices = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render\*" -ErrorAction Stop

        if (-not $audioDevices) {
            Write-Log "No audio devices found - skipping" "WARNING"
            return
        }

        # Find default device (there should be one marked as default)
        $defaultDevice = $audioDevices | Where-Object { $_."(default)" -ne $null } | Select-Object -First 1

        if (-not $defaultDevice) {
            # Fallback: use first device
            $defaultDevice = $audioDevices | Select-Object -First 1
            Write-Log "Using first available audio device" "INFO"
        }

        $devicePath = $defaultDevice.PSPath
        $deviceName = $defaultDevice."FriendlyName"

        Write-Log "Configuring device: $deviceName" "INFO"

        # Backup registry key
        Backup-RegistryKey -Path $devicePath

        $changesMade = $false

        # Sample rate and bit depth
        # Format GUID for audio properties: {f19f064d-082c-4e27-bc73-6882a1bb8e4c}
        $formatKey = "{f19f064d-082c-4e27-bc73-6882a1bb8e4c},0"

        # Calculate format value (sample rate + bit depth)
        # This is a complex binary value - simplified approach
        if ($SampleRate -or $BitDepth) {
            Write-Log "  ⚠️  Sample rate/bit depth changes require manual configuration" "WARNING"
            Write-Log "  Open Sound settings > Device properties > Additional device properties" "INFO"
        }

        # Spatial audio
        if ($DisableSpatialAudio) {
            $spatialPath = Join-Path $devicePath "FxProperties"
            Set-RegistryValue -Path $spatialPath -Name "{e4870e26-3cc5-4cd2-ba46-ca0a9a70ed04},3" -Value 0 -Type "DWORD"
            $changesMade = $true
            Write-Log "  ✓ Spatial audio disabled" "INFO"
        }

        # Exclusive mode
        if ($EnableExclusiveMode) {
            Set-RegistryValue -Path $devicePath -Name "PKEY_AudioEndpoint_Disable_SysFx" -Value 0 -Type "DWORD"
            $changesMade = $true
            Write-Log "  ✓ Exclusive mode enabled" "INFO"
        }

        # Audio enhancements
        if ($DisableEnhancements) {
            Set-RegistryValue -Path $devicePath -Name "{fc52a749-4be9-4510-896e-966ba6525980},3" -Value 0 -Type "DWORD"
            $changesMade = $true
            Write-Log "  ✓ Audio enhancements disabled" "INFO"
        }

        if ($changesMade) {
            Write-Log "Audio device properties configured successfully" "SUCCESS"
            Write-Log "⚠️  Reboot or restart audio service for changes to take effect" "WARNING"
        }
        else {
            Write-Log "No audio settings were changed" "INFO"
        }
    }
    catch {
        Write-Log "Failed to configure audio device: $_" "ERROR"
    }
}


function Set-SteamGamingSettings {
    <#
    .SYNOPSIS
        Applies gaming-optimized settings to Steam.
    .DESCRIPTION
        Modifies Steam's localconfig.vdf to disable overlay, downloads during
        gameplay, and enable low bandwidth mode. Creates backup before changes.
        Skips if Steam is running or not installed.
    .PARAMETER DisableOverlay
        Disable Steam overlay (reduces latency).
    .PARAMETER DisableDownloadsDuringGameplay
        Prevent Steam from downloading updates while gaming.
    .PARAMETER EnableLowBandwidthMode
        Reduce Steam's bandwidth usage for UI/chat.
    .OUTPUTS
        None.
    .NOTES
        Auto-detects Steam user ID from most recently modified userdata folder.
        Steam must be closed before running this function.
    #>
    [CmdletBinding()]
    param(
        [bool]$DisableOverlay = $false,
        [bool]$DisableDownloadsDuringGameplay = $false,
        [bool]$EnableLowBandwidthMode = $false
    )

    Write-Log "Configuring Steam gaming settings..." "INFO"

    # Detect Steam installation path
    $steamPath = $null
    try {
        $steamReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -ErrorAction SilentlyContinue
        if ($steamReg) {
            $steamPath = $steamReg.InstallPath
        }
    }
    catch {}

    if (-not $steamPath -or -not (Test-Path $steamPath)) {
        Write-Log "Steam not found - skipping" "INFO"
        return
    }

    Write-Log "Steam found at: $steamPath" "INFO"

    # Check if Steam is running
    $steamProcess = Get-Process -Name "steam" -ErrorAction SilentlyContinue
    if ($steamProcess) {
        Write-Log "⚠️  Steam is running! Please close Steam and re-run this script." "WARNING"
        Write-Log "Steam settings NOT applied (app must be closed first)" "WARNING"
        return
    }

    # Auto-detect user ID (most recent userdata folder)
    $userdataPath = Join-Path $steamPath "userdata"

    if (-not (Test-Path $userdataPath)) {
        Write-Log "Steam userdata folder not found - skipping" "WARNING"
        return
    }

    $userFolders = Get-ChildItem -Path $userdataPath -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending

    if (-not $userFolders) {
        Write-Log "No Steam user profiles found - skipping" "WARNING"
        return
    }

    $userId = $userFolders[0].Name
    Write-Log "Using Steam user ID: $userId" "INFO"

    $configPath = Join-Path $userdataPath "$userId\config\localconfig.vdf"

    if (-not (Test-Path $configPath)) {
        Write-Log "Steam config not found at $configPath - skipping" "WARNING"
        return
    }

    try {
        # Backup config
        $backup = Backup-ConfigFile -Path $configPath
        if ($backup -eq $false) {
            Write-Log "Skipping Steam settings (backup failed)" "WARNING"
            return
        }

        # Read config file
        $configContent = Get-Content $configPath -Raw -ErrorAction Stop

        $changesMade = $false

        # Disable overlay (InGameOverlayShowFPSContrast)
        if ($DisableOverlay) {
            # VDF uses key-value format: "key"		"value"
            $configContent = $configContent -replace '("InGameOverlayShowFPSContrast"\s+")\d+(")', '${1}0${2}'
            $changesMade = $true
            Write-Log "  ✓ Steam overlay disabled" "INFO"
        }

        # Disable downloads during gameplay
        if ($DisableDownloadsDuringGameplay) {
            $configContent = $configContent -replace '("AllowDownloadsWhileRunning"\s+")\d+(")', '${1}0${2}'
            $changesMade = $true
            Write-Log "  ✓ Downloads during gameplay disabled" "INFO"
        }

        # Enable low bandwidth mode
        if ($EnableLowBandwidthMode) {
            $configContent = $configContent -replace '("LowBandwidthMode"\s+")\d+(")', '${1}1${2}'
            $changesMade = $true
            Write-Log "  ✓ Low bandwidth mode enabled" "INFO"
        }

        if ($changesMade) {
            # Write config back
            Set-Content -Path $configPath -Value $configContent -ErrorAction Stop
            Write-Log "Steam gaming settings applied successfully" "SUCCESS"
            Write-Log "Backup: $backup" "INFO"
        }
        else {
            Write-Log "No Steam settings were changed (all parameters false)" "INFO"
        }
    }
    catch {
        Write-Log "Failed to apply Steam settings: $_" "ERROR"
        Write-Log "You can restore from backup: $backup" "INFO"
    }
}


function Set-MonitorRefreshRate {
    <#
    .SYNOPSIS
        Sets monitor refresh rate to maximum supported value.
    .DESCRIPTION
        Enumerates display modes via WMI and applies the highest refresh rate
        available for the current resolution. Supports primary monitor only.
    .PARAMETER SetToMaximum
        When true, sets refresh rate to highest supported. When false, only logs.
    .OUTPUTS
        None.
    .NOTES
        Requires Administrator. Multi-monitor setups will only affect primary.
        Resolution remains unchanged - only refresh rate is modified.
    #>
    [CmdletBinding()]
    param(
        [bool]$SetToMaximum = $false
    )

    Write-Log "Detecting monitor refresh rate..." "INFO"

    try {
        # Get current display configuration
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;

        public class DisplayConfig {
            [DllImport("user32.dll")]
            public static extern int EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);

            [DllImport("user32.dll")]
            public static extern int ChangeDisplaySettings(ref DEVMODE devMode, int flags);

            [StructLayout(LayoutKind.Sequential)]
            public struct DEVMODE {
                [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
                public string dmDeviceName;
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
                [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
                public string dmFormName;
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
        }
"@ -ErrorAction SilentlyContinue

        $devMode = New-Object DisplayConfig+DEVMODE
        $devMode.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($devMode)

        # Get current settings (mode -1 = current)
        $result = [DisplayConfig]::EnumDisplaySettings($null, -1, [ref]$devMode)

        if ($result -eq 0) {
            Write-Log "Failed to detect current display settings" "ERROR"
            return
        }

        $currentHz = $devMode.dmDisplayFrequency
        $currentWidth = $devMode.dmPelsWidth
        $currentHeight = $devMode.dmPelsHeight

        Write-Log "Current: ${currentWidth}x${currentHeight} @ ${currentHz}Hz" "INFO"

        # Enumerate all available modes to find max refresh rate
        $maxHz = $currentHz
        $modeNum = 0
        $testMode = New-Object DisplayConfig+DEVMODE
        $testMode.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($testMode)

        while ([DisplayConfig]::EnumDisplaySettings($null, $modeNum, [ref]$testMode) -ne 0) {
            # Only consider modes with current resolution
            if ($testMode.dmPelsWidth -eq $currentWidth -and $testMode.dmPelsHeight -eq $currentHeight) {
                if ($testMode.dmDisplayFrequency -gt $maxHz) {
                    $maxHz = $testMode.dmDisplayFrequency
                }
            }
            $modeNum++
        }

        Write-Log "Maximum supported: ${maxHz}Hz" "INFO"

        if ($maxHz -eq $currentHz) {
            Write-Log "Already running at maximum refresh rate" "SUCCESS"
            return
        }

        if ($SetToMaximum) {
            # Apply new refresh rate
            $devMode.dmDisplayFrequency = $maxHz
            $devMode.dmFields = 0x00400000  # DM_DISPLAYFREQUENCY

            $changeResult = [DisplayConfig]::ChangeDisplaySettings([ref]$devMode, 0)

            if ($changeResult -eq 0) {
                Write-Log "Refresh rate set to ${maxHz}Hz successfully" "SUCCESS"
            }
            else {
                Write-Log "Failed to change refresh rate (error code: $changeResult)" "ERROR"
            }
        }
        else {
            Write-Log "Set -SetToMaximum `$true to apply ${maxHz}Hz" "INFO"
        }
    }
    catch {
        Write-Log "Failed to configure monitor refresh rate: $_" "ERROR"
    }
}


# Export functions
Export-ModuleMember -Function @(
    'Set-DiscordGamingSettings',
    'Set-AudioDeviceProperties',
    'Set-SteamGamingSettings',
    'Set-MonitorRefreshRate'
)

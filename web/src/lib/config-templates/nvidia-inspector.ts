import type { ConfigContext, ConfigFile } from '../config-generator'

/**
 * Generate NVIDIA Profile Inspector config file
 * Creates a base profile with optimal gaming settings that can be applied to specific games
 *
 * NOTE: .nip format is XML-based and can be imported via NVIDIA Inspector
 */
export function generateNvidiaInspectorConfig(context: ConfigContext): ConfigFile[] {
  const { persona } = context

  // Profile settings vary by persona
  const profileSettings = getProfileSettings(persona)

  const config = generateNvidiaInspectorXML(profileSettings, persona)
  const filename = `rocktune-nvidia-inspector-${persona}.nip`

  const instructions = `NVIDIA PROFILE INSPECTOR IMPORT INSTRUCTIONS

⚠️  IMPORTANT: This is for NVIDIA GPUs only
Requires NVIDIA Profile Inspector (free tool from orbmu2k)

===================================================================
STEP 1: DOWNLOAD NVIDIA PROFILE INSPECTOR
===================================================================
1. Visit: https://github.com/Orbmu2k/nvidiaProfileInspector/releases
2. Download latest nvidiaProfileInspector.zip
3. Extract to a folder (no installation needed)
4. Run nvidiaProfileInspector.exe (requires admin rights)

===================================================================
STEP 2: BACKUP CURRENT PROFILE
===================================================================
1. In NVIDIA Inspector, click "Export user defined profiles"
2. Save as backup (e.g., nvidia-backup.nip)
3. Keep this safe in case you want to revert

===================================================================
STEP 3: IMPORT ROCKTUNE PROFILE
===================================================================
1. Click "Import user defined profiles" button
2. Select: ${filename}
3. Click "Apply changes" button (top right)
4. Restart any running games

===================================================================
STEP 4: PER-GAME OPTIMIZATION (OPTIONAL)
===================================================================
The imported profile creates a "RockTune Base" profile with optimal settings.
To apply to specific games:

1. In NVIDIA Inspector, click "Profiles" dropdown
2. Search for your game (e.g., "Counter-Strike")
3. If game found:
   - Select the game profile
   - Copy the RockTune settings to this profile
4. If game NOT found:
   - Click "Create new profile"
   - Name it after your game
   - Add the game .exe path
   - Apply RockTune settings

===================================================================
PERSONA: ${persona.toUpperCase()}
===================================================================
${getPersonaStrategy(persona)}

===================================================================
KEY SETTINGS IN THIS PROFILE
===================================================================
${formatSettings(profileSettings)}

===================================================================
VERIFY SETTINGS TOOK EFFECT
===================================================================
1. Launch your game
2. Check in-game with NVIDIA overlay (Alt+Z)
3. Look for:
   - Latency indicators (if using Reflex)
   - FPS counter
   - No V-Sync artifacts

===================================================================
TROUBLESHOOTING
===================================================================
- Settings not applying? Restart game after importing
- Game crashes? Revert to backup .nip file
- Profile not found? Create new profile with game .exe
- Some settings grayed out? Driver version may not support them

RESOURCES:
- NVIDIA Inspector Guide: https://github.com/Orbmu2k/nvidiaProfileInspector
- Setting IDs Reference: https://github.com/Orbmu2k/nvidiaProfileInspector/wiki`

  return [
    {
      filename,
      content: config,
      format: 'nip',
      instructions,
    },
  ]
}

interface ProfileSettings {
  lowLatencyMode: string
  powerManagement: string
  maxFrameRate: string
  textureFiltering: string
  threadedOptimization: string
  vSync: string
  tripleBuffering: string
  preRenderedFrames: string
  gSyncCompatible: string
}

function getProfileSettings(persona: string): ProfileSettings {
  const baseSettings: ProfileSettings = {
    lowLatencyMode: '0x00000001', // On
    powerManagement: '0x00000001', // Prefer Maximum Performance
    maxFrameRate: '0x00000000', // Application controlled (set per-game)
    textureFiltering: '0x00000001', // Quality
    threadedOptimization: '0x00000001', // Auto/On
    vSync: '0x00000000', // Off (use G-SYNC instead)
    tripleBuffering: '0x00000000', // Off
    preRenderedFrames: '0x00000001', // 1 frame
    gSyncCompatible: '0x00000001', // On
  }

  // Pro gamer: Ultra-low latency
  if (persona === 'pro_gamer') {
    return {
      ...baseSettings,
      lowLatencyMode: '0x00000003', // Ultra (if driver supports)
      preRenderedFrames: '0x00000001', // 1 frame (minimum latency)
      maxFrameRate: '0x00000003', // 3 below refresh (e.g., 240Hz → 237fps)
    }
  }

  // Streamer: Balanced for streaming + gaming
  if (persona === 'streamer') {
    return {
      ...baseSettings,
      lowLatencyMode: '0x00000001', // On (not Ultra, less CPU overhead)
      preRenderedFrames: '0x00000002', // 2 frames (smoother encoding)
      powerManagement: '0x00000002', // Adaptive (reduce heat during stream)
    }
  }

  // Benchmarker: Maximum consistency
  if (persona === 'benchmarker') {
    return {
      ...baseSettings,
      powerManagement: '0x00000001', // Max performance
      preRenderedFrames: '0x00000001', // Minimum latency
      threadedOptimization: '0x00000000', // Off (reduce variables)
    }
  }

  // Gamer: Balanced
  return baseSettings
}

function getPersonaStrategy(persona: string): string {
  switch (persona) {
    case 'gamer':
      return `Focus: Balanced gaming performance
- Low Latency Mode: On (reduce input lag)
- Power Management: Maximum Performance
- V-Sync: Off (use G-SYNC/FreeSync instead)
- Pre-rendered frames: 1 (low latency)`

    case 'pro_gamer':
      return `Focus: Ultra-low latency competitive gaming
- Low Latency Mode: Ultra (NVIDIA Reflex equivalent)
- Power Management: Maximum Performance (no throttling)
- Pre-rendered frames: 1 (absolute minimum latency)
- Max Frame Rate: 3 below monitor refresh (e.g., 240Hz → 237fps)
- Every millisecond counts!`

    case 'streamer':
      return `Focus: Stable performance while streaming
- Low Latency Mode: On (not Ultra - reduces CPU load)
- Power Management: Adaptive (prevent GPU overheating during long streams)
- Pre-rendered frames: 2 (smoother frame delivery to encoder)
- Balance between gaming performance and encoding stability`

    case 'benchmarker':
      return `Focus: Consistent, reproducible performance
- Low Latency Mode: On
- Power Management: Maximum Performance (no variance)
- Threaded Optimization: Off (reduce variables)
- Minimize driver-level variability for accurate testing`

    default:
      return 'Balanced gaming configuration'
  }
}

function formatSettings(settings: ProfileSettings): string {
  return `✓ Low Latency Mode: ${
    settings.lowLatencyMode === '0x00000003'
      ? 'Ultra'
      : settings.lowLatencyMode === '0x00000001'
        ? 'On'
        : 'Off'
  }
✓ Power Management: ${
    settings.powerManagement === '0x00000001' ? 'Maximum Performance' : 'Adaptive'
  }
✓ Texture Filtering: Quality
✓ Threaded Optimization: ${settings.threadedOptimization === '0x00000001' ? 'On' : 'Off'}
✓ V-Sync: Off (use G-SYNC instead)
✓ Triple Buffering: Off
✓ Pre-rendered Frames: ${settings.preRenderedFrames}
✓ G-SYNC: Enabled`
}

function generateNvidiaInspectorXML(settings: ProfileSettings, persona: string): string {
  // NVIDIA Profile Inspector uses XML format (.nip)
  // This creates a base profile that can be applied to any game
  return `<?xml version="1.0" encoding="utf-16"?>
<ArrayOfProfile>
  <Profile>
    <ProfileName>RockTune ${persona.replace('_', ' ').toUpperCase()}</ProfileName>
    <Executeables>
      <string>Global</string>
    </Executeables>
    <Settings>
      <!-- Low Latency Mode -->
      <ProfileSetting>
        <SettingNameInfo>Maximum pre-rendered frames</SettingNameInfo>
        <SettingID>0x007FB8C8</SettingID>
        <SettingValue>${settings.preRenderedFrames}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- Power Management Mode -->
      <ProfileSetting>
        <SettingNameInfo>Power management mode</SettingNameInfo>
        <SettingID>0x10F694B0</SettingID>
        <SettingValue>${settings.powerManagement}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- Texture Filtering - Quality -->
      <ProfileSetting>
        <SettingNameInfo>Texture filtering - Quality</SettingNameInfo>
        <SettingID>0x00CE2691</SettingID>
        <SettingValue>${settings.textureFiltering}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- Threaded Optimization -->
      <ProfileSetting>
        <SettingNameInfo>Threaded optimization</SettingNameInfo>
        <SettingID>0x00598928</SettingID>
        <SettingValue>${settings.threadedOptimization}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- Vertical Sync -->
      <ProfileSetting>
        <SettingNameInfo>Vertical Sync</SettingNameInfo>
        <SettingID>0x10798C38</SettingID>
        <SettingValue>${settings.vSync}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- Triple Buffering -->
      <ProfileSetting>
        <SettingNameInfo>Triple buffering</SettingNameInfo>
        <SettingID>0x00F972B6</SettingID>
        <SettingValue>${settings.tripleBuffering}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>

      <!-- G-SYNC Compatible -->
      <ProfileSetting>
        <SettingNameInfo>G-SYNC</SettingNameInfo>
        <SettingID>0x10BFC001</SettingID>
        <SettingValue>${settings.gSyncCompatible}</SettingValue>
        <ValueType>Dword</ValueType>
      </ProfileSetting>
    </Settings>
  </Profile>
</ArrayOfProfile>

<!-- Generated by RockTune - https://rocktune.pedroferrari.com -->
<!-- Persona: ${persona} -->
<!--
  To apply to a specific game:
  1. Open NVIDIA Profile Inspector
  2. Find your game in the Profiles dropdown
  3. Copy these settings to the game's profile
  4. Or create a new profile and add the game .exe
-->
`
}

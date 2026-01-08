import { generateAfterburnerConfig } from './config-templates/afterburner'
import { generateFanControlConfig } from './config-templates/fancontrol'
import { generateNvidiaInspectorConfig } from './config-templates/nvidia-inspector'
import { generateOBSConfigs as generateOBSConfigsImpl } from './config-templates/obs'
import { generateUniFiConfig } from './config-templates/unifi'
import { TOOL_PERSONA_MAP } from './persona-config'
import type { SectionId } from './section-ids'
import { SECTION_PREFIXES } from './section-ids'
import type { ConfigTool, DnsProviderType, GpuType, HardwareProfile, PresetType } from './types'
import { CONFIG_TOOLS } from './types'

/**
 * Represents a downloadable config file for third-party software
 */
export interface ConfigFile {
  /** Filename with extension (e.g., "rocktune-obs-profile-nvidia.ini") */
  filename: string
  /** File content as string */
  content: string
  /** File format/extension */
  format: 'json' | 'xml' | 'cfg' | 'ini' | 'vdf' | 'nip' | 'txt'
  /** Step-by-step import instructions for user */
  instructions: string
}

/**
 * Context object containing user's profile and preferences
 * Used to customize config generation
 */
export interface ConfigContext {
  /** Selected persona (gamer, pro_gamer, streamer, benchmarker) */
  persona: PresetType
  /** Hardware profile (GPU, CPU, etc) */
  hardware: HardwareProfile
  /** DNS provider if selected */
  dnsProvider?: DnsProviderType
  /** ISO timestamp of generation */
  timestamp: string
}

/**
 * Map manual-steps section IDs to config tools
 * Returns the appropriate config tool for a given section, or null if no config available
 *
 * @param sectionId - Type-safe section ID
 * @returns ConfigTool if section has downloadable config, null otherwise
 */
export function getSectionConfigTool(sectionId: SectionId): ConfigTool | null {
  // Check section prefix to determine tool
  // Using startsWith for cleaner prefix matching

  // NVIDIA sections (nvidia-{persona}) -> NVIDIA Profile Inspector
  if (sectionId.startsWith(SECTION_PREFIXES.NVIDIA)) {
    return CONFIG_TOOLS.NVIDIA_INSPECTOR
  }

  // AMD/GPU tuning sections -> MSI Afterburner (fan curves, overclocking)
  if (
    sectionId.startsWith(SECTION_PREFIXES.AMD) ||
    sectionId.startsWith(SECTION_PREFIXES.GPU_TUNING)
  ) {
    return CONFIG_TOOLS.MSI_AFTERBURNER
  }

  // Cooling sections -> Fan Control
  if (
    sectionId === SECTION_PREFIXES.COOLING_ADVANCED ||
    sectionId === SECTION_PREFIXES.COOLING_SOFTWARE
  ) {
    return CONFIG_TOOLS.FAN_CONTROL
  }

  // OBS sections -> OBS config
  if (
    sectionId === SECTION_PREFIXES.OBS_OUTPUT ||
    sectionId === SECTION_PREFIXES.OBS_VIDEO ||
    sectionId === SECTION_PREFIXES.OBS_ADVANCED ||
    sectionId === SECTION_PREFIXES.OBS_SOURCES
  ) {
    return CONFIG_TOOLS.OBS
  }

  // UniFi section -> UniFi config
  if (sectionId === SECTION_PREFIXES.UBIQUITI_GAMING) {
    return CONFIG_TOOLS.UNIFI
  }

  return null
}

/**
 * Check if a tool is available for the given persona and hardware
 */
export function isToolAvailable(tool: ConfigTool, persona: PresetType, gpu: GpuType): boolean {
  // Check persona mapping
  const allowedPersonas = TOOL_PERSONA_MAP[tool]
  if (!allowedPersonas.includes(persona)) {
    return false
  }

  // Hardware-specific filtering
  if (tool === CONFIG_TOOLS.NVIDIA_INSPECTOR && gpu !== 'nvidia') {
    return false
  }

  if (tool === CONFIG_TOOLS.MSI_AFTERBURNER && gpu === 'intel') {
    // Afterburner doesn't support Intel integrated graphics
    return false
  }

  return true
}

/**
 * Main entry point for config generation
 * Returns array of config files or null if tool not applicable
 */
export function generateToolConfig(tool: ConfigTool, context: ConfigContext): ConfigFile[] | null {
  // Check if tool is applicable for this persona/hardware
  if (!isToolAvailable(tool, context.persona, context.hardware.gpu)) {
    return null
  }

  // Route to tool-specific generator
  switch (tool) {
    case CONFIG_TOOLS.OBS:
      return generateOBSConfigs(context)
    case CONFIG_TOOLS.MSI_AFTERBURNER:
      return generateAfterburnerConfigs(context)
    case CONFIG_TOOLS.FAN_CONTROL:
      return generateFanControlConfigs(context)
    case CONFIG_TOOLS.UNIFI:
      return generateUniFiConfigs(context)
    case CONFIG_TOOLS.NVIDIA_INSPECTOR:
      return generateNvidiaInspectorConfigs(context)
    default: {
      // Exhaustive check - TypeScript will error if we miss a tool
      const _exhaustive: never = tool
      return _exhaustive
    }
  }
}

// ====================================================================
// TOOL-SPECIFIC GENERATORS (Stubs - to be implemented in config-templates/)
// ====================================================================

function generateOBSConfigs(context: ConfigContext): ConfigFile[] {
  return generateOBSConfigsImpl(context)
}

function generateAfterburnerConfigs(context: ConfigContext): ConfigFile[] {
  return generateAfterburnerConfig(context)
}

function generateFanControlConfigs(context: ConfigContext): ConfigFile[] {
  return generateFanControlConfig(context)
}

function generateUniFiConfigs(context: ConfigContext): ConfigFile[] {
  return generateUniFiConfig(context)
}

function generateNvidiaInspectorConfigs(context: ConfigContext): ConfigFile[] {
  return generateNvidiaInspectorConfig(context)
}

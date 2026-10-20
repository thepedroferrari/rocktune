/**
 * Stable ID Registry for Shareable Build URLs
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CRITICAL RULES - READ BEFORE MODIFYING:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. IDs are PERMANENT - once assigned, they NEVER change meaning
 * 2. Never reuse an ID for a different value
 * 3. To deprecate: set value to null AND add entry to DEPRECATED_OPT_IDS
 *    a) In OPT_ID_TO_VALUE: set `45: null,`
 *    b) In DEPRECATED_OPT_IDS: add `{ id: 45, was: 'old_feature', label: 'Old Feature', removed: '2025-01-03' }`
 *    The audit script validates both are in sync.
 * 4. To rename: update the value string, keep the same ID
 * 5. NEW IDs: Always use next sequential ID (run: deno task share:audit)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ID ASSIGNMENT (since 2025):
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * IDs are purely SEQUENTIAL - tier-based ranges are LEGACY organization only.
 * New optimizations get the next available ID regardless of tier.
 *
 * To find next ID:
 *   cd web && deno task share:audit
 *
 * This will output: "Next available ID: 104" (or current max + 1)
 *
 * LEGACY NOTE (for context only - DO NOT use ranges for new IDs):
 * - IDs 1-49 were originally SAFE tier
 * - IDs 50-79 were originally CAUTION tier
 * - IDs 80-99 were originally RISKY tier
 * - IDs 100+ were originally LUDICROUS tier
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNC REQUIREMENT:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * After modifying this file, also update:
 * - web/public/run.ps1 ($OPT_DESCRIPTIONS and $OPT_FUNCTIONS)
 *
 * This registry enables backward-compatible shareable URLs.
 * Old URLs will always decode correctly (with graceful degradation).
 */

import type {
  CpuType,
  DnsProviderType,
  GpuType,
  MonitorSoftwareType,
  OptimizationKey,
  PeripheralType,
  PresetType,
} from './types'

export const SHARE_SCHEMA_VERSION = 1

/**
 * Deprecated ID Registry - CODE-ENFORCED, NOT COMMENTS
 *
 * When deprecating an optimization:
 * 1. Set ID to `null` in OPT_ID_TO_VALUE
 * 2. Add entry here with the ID, what it was, and when it was removed
 *
 * The audit script validates:
 * - All null entries in OPT_ID_TO_VALUE exist here
 * - No ID in this list is ever reused
 *
 * This ensures deprecation history survives minification/refactoring.
 */
const GENERAL_DEBLOAT = 'General Windows debloat: use WinUtil or Win11Debloat'

export const DEPRECATED_OPT_IDS: ReadonlyArray<{
  readonly id: number
  readonly was: string
  /** Name shown in the skip line when an old share link still lists it */
  readonly label: string
  readonly removed: string // ISO date YYYY-MM-DD
  readonly reason?: string
}> = [
  {
    id: 12,
    was: 'edge_debloat',
    label: 'Edge Debloat',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 14,
    was: 'explorer_speed',
    label: 'Explorer Speed',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 15,
    was: 'temp_purge',
    label: 'Purge Temp Files',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 18,
    was: 'classic_menu',
    label: 'Classic Context Menu',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 19,
    was: 'storage_sense',
    label: 'Storage Sense',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 22,
    was: 'explorer_cleanup',
    label: 'Explorer Cleanup',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 24,
    was: 'ps7_telemetry',
    label: 'PowerShell 7 Telemetry',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 35,
    was: 'wer_disable',
    label: 'Error Reporting Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 36,
    was: 'wifi_sense',
    label: 'WiFi Sense Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 37,
    was: 'spotlight_disable',
    label: 'Spotlight Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 38,
    was: 'feedback_disable',
    label: 'Feedback Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 39,
    was: 'clipboard_sync',
    label: 'Clipboard Sync Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 56,
    was: 'services_trim',
    label: 'Trim Services',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 57,
    was: 'disk_cleanup',
    label: 'Deep Disk Cleanup',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 58,
    was: 'wpbt_disable',
    label: 'WPBT Disable',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 80,
    was: 'privacy_tier1',
    label: 'Privacy Tier 1',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 81,
    was: 'privacy_tier2',
    label: 'Privacy Tier 2',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 82,
    was: 'privacy_tier3',
    label: 'Privacy Tier 3',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 83,
    was: 'bloatware',
    label: 'Remove Bloatware',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 115,
    was: 'start_recommended_off',
    label: 'Clean Start Menu',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 116,
    was: 'bing_search_off',
    label: 'Bing Search Off',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 117,
    was: 'windows_ads_off',
    label: 'No Ads & Nags',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
  {
    id: 120,
    was: 'onedrive_remove',
    label: 'Uninstall OneDrive',
    removed: '2026-10-21',
    reason: GENERAL_DEBLOAT,
  },
]

/**
 * Set of all deprecated IDs for quick lookup
 * Used by audit script to prevent reuse
 */
export const DEPRECATED_OPT_ID_SET: ReadonlySet<number> = new Set(
  DEPRECATED_OPT_IDS.map((d) => d.id),
)

/**
 * CPU type stable IDs
 * @example ID 1 always means 'amd_x3d', even if we rename it later
 */
export const CPU_ID_TO_VALUE: Record<number, CpuType | null> = {
  1: 'amd_x3d',
  2: 'amd',
  3: 'intel',
  // Future: 4: 'qualcomm' (ARM support)
}

export const CPU_VALUE_TO_ID: Record<CpuType, number> = {
  amd_x3d: 1,
  amd: 2,
  intel: 3,
}

/**
 * GPU type stable IDs
 */
export const GPU_ID_TO_VALUE: Record<number, GpuType | null> = {
  1: 'nvidia',
  2: 'amd',
  3: 'intel',
}

export const GPU_VALUE_TO_ID: Record<GpuType, number> = {
  nvidia: 1,
  amd: 2,
  intel: 3,
}

/**
 * DNS provider stable IDs
 */
export const DNS_ID_TO_VALUE: Record<number, DnsProviderType | null> = {
  1: 'cloudflare',
  2: 'google',
  3: 'quad9',
  4: 'opendns',
  5: 'adguard',
}

export const DNS_VALUE_TO_ID: Record<DnsProviderType, number> = {
  cloudflare: 1,
  google: 2,
  quad9: 3,
  opendns: 4,
  adguard: 5,
}

/**
 * Peripheral type stable IDs
 */
export const PERIPHERAL_ID_TO_VALUE: Record<number, PeripheralType | null> = {
  1: 'logitech',
  2: 'razer',
  3: 'corsair',
  4: 'steelseries',
  5: 'asus',
  6: 'wooting',
}

export const PERIPHERAL_VALUE_TO_ID: Record<PeripheralType, number> = {
  logitech: 1,
  razer: 2,
  corsair: 3,
  steelseries: 4,
  asus: 5,
  wooting: 6,
}

/**
 * Monitor software stable IDs
 */
export const MONITOR_ID_TO_VALUE: Record<number, MonitorSoftwareType | null> = {
  1: 'dell',
  2: 'lg',
  3: 'hp',
}

export const MONITOR_VALUE_TO_ID: Record<MonitorSoftwareType, number> = {
  dell: 1,
  lg: 2,
  hp: 3,
}

/**
 * Preset type stable IDs
 */
export const PRESET_ID_TO_VALUE: Record<number, PresetType | null> = {
  1: 'benchmarker',
  2: 'pro_gamer',
  3: 'streamer',
  4: 'gamer',
}

export const PRESET_VALUE_TO_ID: Record<PresetType, number> = {
  benchmarker: 1,
  pro_gamer: 2,
  streamer: 3,
  gamer: 4,
}

/**
 * Optimization stable IDs
 *
 * This is the largest registry (120 IDs, 23 of them retired to null).
 *
 * IMPORTANT: IDs are organized below by LEGACY tier ranges for historical
 * context only. New IDs should use the next sequential number regardless
 * of tier. Run `deno task share:audit` to find the next available ID.
 */
export const OPT_ID_TO_VALUE: Record<number, OptimizationKey | null> = {
  // ═══ LEGACY SAFE RANGE (1-49) ═══
  1: 'pagefile',
  2: 'fastboot',
  3: 'timer',
  4: 'power_plan',
  5: 'usb_power',
  6: 'pcie_power',
  7: 'dns',
  8: 'nagle',
  9: 'audio_enhancements',
  10: 'gamedvr',
  11: 'background_apps',
  12: null, // was edge_debloat
  13: 'copilot_disable',
  14: null, // was explorer_speed
  15: null, // was temp_purge
  16: 'razer_block',
  17: 'restore_point',
  18: null, // was classic_menu
  19: null, // was storage_sense
  20: 'display_perf',
  21: 'end_task',
  22: null, // was explorer_cleanup
  23: 'notifications_off',
  24: null, // was ps7_telemetry
  25: 'multiplane_overlay',
  26: 'mouse_accel',
  27: 'usb_suspend',
  28: 'keyboard_response',
  29: 'game_mode',
  30: 'min_processor_state',
  31: 'hibernation_disable',
  32: 'rss_enable',
  33: 'adapter_power',
  34: 'delivery_opt',
  35: null, // was wer_disable
  36: null, // was wifi_sense
  37: null, // was spotlight_disable
  38: null, // was feedback_disable
  39: null, // was clipboard_sync
  40: 'accessibility_shortcuts',
  41: 'audio_communications',
  42: 'audio_system_sounds',
  43: 'input_buffer',
  44: 'filesystem_perf',
  45: 'dwm_perf',

  // ═══ LEGACY CAUTION RANGE (50-79) ═══
  50: 'msi_mode',
  51: 'hpet',
  52: 'game_bar',
  53: 'hags',
  54: 'fso_disable',
  55: 'ultimate_perf',
  56: null, // was services_trim
  57: null, // was disk_cleanup
  58: null, // was wpbt_disable
  59: 'qos_gaming',
  60: 'network_throttling',
  61: 'interrupt_affinity',
  62: 'process_mitigation',
  63: 'mmcss_gaming',
  64: 'scheduler_opt',
  65: 'core_parking',
  66: 'timer_registry',
  67: 'rsc_disable',
  68: 'sysmain_disable',
  69: 'services_search_off',
  70: 'memory_gaming',
  71: 'power_throttle_off',
  72: 'priority_boost_off',

  // ═══ LEGACY RISKY RANGE (80-99) ═══
  80: null, // was privacy_tier1
  81: null, // was privacy_tier2
  82: null, // was privacy_tier3
  83: null, // was bloatware
  84: 'ipv4_prefer',
  85: 'teredo_disable',
  86: 'native_nvme',
  87: 'smt_disable',
  88: 'audio_exclusive',
  89: 'tcp_optimizer',

  // ═══ LEGACY LUDICROUS RANGE (100+) ═══
  // NOTE: These are blocked from share URLs for security
  100: 'spectre_meltdown_off',
  101: 'core_isolation_off',
  102: 'kernel_mitigations_off',
  103: 'dep_off',
  104: 'background_polling',
  105: 'amd_ulps_disable',
  106: 'nvidia_p0_state',
  107: 'network_binding_strip',
  108: 'nic_interrupt_mod',
  109: 'nic_flow_control',
  110: 'nic_energy_efficient',
  111: 'browser_background',
  112: 'scheduled_tasks_gaming',
  113: 'ai_off',
  114: 'widgets_off',
  115: null, // was start_recommended_off
  116: null, // was bing_search_off
  117: null, // was windows_ads_off
  118: 'gamebar_popup_fix',
  119: 'update_no_reboot',
  120: null, // was onedrive_remove
}

export const OPT_VALUE_TO_ID: Record<OptimizationKey, number> = Object.fromEntries(
  Object.entries(OPT_ID_TO_VALUE)
    .filter(([_, value]) => value !== null)
    .map(([id, value]) => [value, Number(id)]),
) as Record<OptimizationKey, number>

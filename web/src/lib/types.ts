import type { PersonaId } from './persona-registry'
import { isPersonaId } from './persona-registry'

declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

export type PackageKey = Brand<string, 'PackageKey'>
export type WingetId = Brand<string, 'WingetId'>

export type AppEventName =
  | 'script-change-request'
  | 'software-selection-changed'
  | 'preset-applied'
  | 'filter-changed'
  | 'search-changed'

export const CATEGORIES = [
  'launcher',
  'gaming',
  'streaming',
  'monitoring',
  'browser',
  'media',
  'utility',
  'rgb',
  'dev',
  'runtime',
  'benchmark',
] as const

export type Category = (typeof CATEGORIES)[number]

function isStringEnumValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

export interface SoftwarePackage {
  readonly id: WingetId
  readonly name: string
  readonly category: Category
  readonly icon?: string
  readonly emoji?: string
  readonly desc?: string
  readonly selected?: boolean
}

export type SoftwareCatalog = Readonly<Record<PackageKey, SoftwarePackage>>

export function isPackageKey(catalog: SoftwareCatalog, key: string): key is PackageKey {
  return key in catalog
}

export const CPU_TYPES = {
  AMD_X3D: 'amd_x3d',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type CpuType = (typeof CPU_TYPES)[keyof typeof CPU_TYPES]

const CPU_TYPE_VALUES = Object.values(CPU_TYPES) as CpuType[]

export const GPU_TYPES = {
  NVIDIA: 'nvidia',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type GpuType = (typeof GPU_TYPES)[keyof typeof GPU_TYPES]

const GPU_TYPE_VALUES = Object.values(GPU_TYPES) as GpuType[]

export const DNS_PROVIDERS = {
  CLOUDFLARE: 'cloudflare',
  GOOGLE: 'google',
  QUAD9: 'quad9',
  OPENDNS: 'opendns',
  ADGUARD: 'adguard',
} as const satisfies Record<string, string>

export type DnsProviderType = (typeof DNS_PROVIDERS)[keyof typeof DNS_PROVIDERS]

export const PERIPHERAL_TYPES = {
  LOGITECH: 'logitech',
  RAZER: 'razer',
  CORSAIR: 'corsair',
  STEELSERIES: 'steelseries',
  ASUS: 'asus',
  WOOTING: 'wooting',
} as const satisfies Record<string, string>

export type PeripheralType = (typeof PERIPHERAL_TYPES)[keyof typeof PERIPHERAL_TYPES]

const PERIPHERAL_TYPE_VALUES = Object.values(PERIPHERAL_TYPES) as PeripheralType[]

export const MONITOR_SOFTWARE_TYPES = {
  DELL: 'dell',
  LG: 'lg',
  HP: 'hp',
} as const satisfies Record<string, string>

export type MonitorSoftwareType =
  (typeof MONITOR_SOFTWARE_TYPES)[keyof typeof MONITOR_SOFTWARE_TYPES]

const MONITOR_SOFTWARE_VALUES = Object.values(MONITOR_SOFTWARE_TYPES) as MonitorSoftwareType[]

export interface HardwareProfile {
  readonly cpu: CpuType
  readonly gpu: GpuType
  readonly peripherals: readonly PeripheralType[]
  readonly monitorSoftware: readonly MonitorSoftwareType[]
}

export function isCpuType(value: unknown): value is CpuType {
  return isStringEnumValue(CPU_TYPE_VALUES, value)
}

export function isGpuType(value: unknown): value is GpuType {
  return isStringEnumValue(GPU_TYPE_VALUES, value)
}

export function isPeripheralType(value: unknown): value is PeripheralType {
  return isStringEnumValue(PERIPHERAL_TYPE_VALUES, value)
}

export function isMonitorSoftwareType(value: unknown): value is MonitorSoftwareType {
  return isStringEnumValue(MONITOR_SOFTWARE_VALUES, value)
}

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const satisfies Record<string, string>

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

export const FILTER_ALL = 'all' as const
export const FILTER_SELECTED = 'selected' as const
export const FILTER_RECOMMENDED = 'recommended' as const
export type FilterValue =
  | Category
  | typeof FILTER_ALL
  | typeof FILTER_SELECTED
  | typeof FILTER_RECOMMENDED

export function isFilterAll(filter: FilterValue): filter is typeof FILTER_ALL {
  return filter === FILTER_ALL
}

export function isFilterSelected(filter: FilterValue): filter is typeof FILTER_SELECTED {
  return filter === FILTER_SELECTED
}

export function isFilterRecommended(filter: FilterValue): filter is typeof FILTER_RECOMMENDED {
  return filter === FILTER_RECOMMENDED
}

export const OPTIMIZATION_TIERS = {
  SAFE: 'safe',
  CAUTION: 'caution',
  RISKY: 'risky',
  LUDICROUS: 'ludicrous',
} as const

export type OptimizationTier = (typeof OPTIMIZATION_TIERS)[keyof typeof OPTIMIZATION_TIERS]

/** Evidence confidence levels for optimization claims */
export const EVIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[keyof typeof EVIDENCE_LEVELS]

/** Evidence metadata for optimization claims */
export interface OptimizationEvidence {
  /** Confidence level based on available research */
  readonly level: EvidenceLevel
  /** Optional reference URLs for claims */
  readonly sources?: readonly string[]
  /** Warning note for system-dependent optimizations */
  readonly note?: string
}

/**
 * Metadata describing how a manual step is automated by the generated script.
 * Enables full transparency: users can see what the script does AND how to do it manually.
 */
export interface AutomatedBy {
  /** True if this step is automated by the generated PowerShell script */
  readonly script: boolean
  /** PowerShell module name (e.g., "performance.psm1") */
  readonly module?: string
  /** PowerShell function name (e.g., "Enable-MSIMode") */
  readonly function?: string
  /** Registry path if this is a registry tweak */
  readonly registryPath?: string
  /** Registry key name */
  readonly registryKey?: string
  /** Registry value (can be number, string, or binary data description) */
  readonly registryValue?: unknown
  /** Registry value type (DWORD, String, Binary, etc.) */
  readonly registryType?: 'DWORD' | 'String' | 'Binary' | 'QWORD' | 'MultiString' | 'ExpandString'
  /** bcdedit command if this is a boot config change */
  readonly bcdedit?: string
  /** powercfg command if this is a power plan setting */
  readonly powercfg?: string
  /** Service name if this disables/enables a Windows service */
  readonly service?: string
  /** Scheduled task path if this disables a task */
  readonly scheduledTask?: string
  /** AppX package name if this removes bloatware */
  readonly appxPackage?: string
  /** Brief description of what the script does */
  readonly scriptAction?: string
}

/** Breaking changes that an optimization may cause */
export interface BreakingChange {
  /** What feature/functionality breaks */
  readonly feature: string
  /** Brief description of the impact */
  readonly impact: string
}

/**
 * Effectiveness ranking tiers (S-F tier list style)
 * Used to communicate how useful each optimization is for gaming
 */
export const EFFECTIVENESS_RANKS = {
  S: 'S', // Extremely useful - proven, measurable impact
  A: 'A', // Useful - strong evidence, widely recommended
  B: 'B', // Fairly useful - good for most gamers
  C: 'C', // Potentially useful - depends on setup
  D: 'D', // In certain cases - niche use cases
  E: 'E', // Rarely useful - marginal or risky
  F: 'F', // Not useful for gaming - just system preference
} as const

export type EffectivenessRank = (typeof EFFECTIVENESS_RANKS)[keyof typeof EFFECTIVENESS_RANKS]

/** Human-readable label for each effectiveness rank */
export const RANK_LABELS: Record<EffectivenessRank, string> = {
  S: 'Extremely useful',
  A: 'Useful',
  B: 'Fairly useful',
  C: 'Potentially useful',
  D: 'In certain cases',
  E: 'Rarely useful',
  F: 'Not useful for gaming, just system preferences',
} as const

const SAFE_OPTIMIZATIONS = {
  PAGEFILE: 'pagefile',
  FASTBOOT: 'fastboot',
  TIMER: 'timer',
  POWER_PLAN: 'power_plan',
  USB_POWER: 'usb_power',
  PCIE_POWER: 'pcie_power',
  DNS: 'dns',
  NAGLE: 'nagle',
  AUDIO_ENHANCEMENTS: 'audio_enhancements',
  GAMEDVR: 'gamedvr',
  BACKGROUND_APPS: 'background_apps',
  EDGE_DEBLOAT: 'edge_debloat',
  COPILOT_DISABLE: 'copilot_disable',
  EXPLORER_SPEED: 'explorer_speed',
  TEMP_PURGE: 'temp_purge',
  RAZER_BLOCK: 'razer_block',
  RESTORE_POINT: 'restore_point',
  CLASSIC_MENU: 'classic_menu',
  STORAGE_SENSE: 'storage_sense',
  DISPLAY_PERF: 'display_perf',
  END_TASK: 'end_task',
  EXPLORER_CLEANUP: 'explorer_cleanup',
  NOTIFICATIONS_OFF: 'notifications_off',
  PS7_TELEMETRY: 'ps7_telemetry',
  MULTIPLANE_OVERLAY: 'multiplane_overlay',
  MOUSE_ACCEL: 'mouse_accel',
  USB_SUSPEND: 'usb_suspend',
  KEYBOARD_RESPONSE: 'keyboard_response',
  GAME_MODE: 'game_mode',
  MIN_PROCESSOR_STATE: 'min_processor_state',
  HIBERNATION_DISABLE: 'hibernation_disable',
  RSS_ENABLE: 'rss_enable',
  ADAPTER_POWER: 'adapter_power',
  DELIVERY_OPT: 'delivery_opt',
  WER_DISABLE: 'wer_disable',
  WIFI_SENSE: 'wifi_sense',
  SPOTLIGHT_DISABLE: 'spotlight_disable',
  FEEDBACK_DISABLE: 'feedback_disable',
  CLIPBOARD_SYNC: 'clipboard_sync',

  ACCESSIBILITY_SHORTCUTS: 'accessibility_shortcuts',
  AUDIO_COMMUNICATIONS: 'audio_communications',
  AUDIO_SYSTEM_SOUNDS: 'audio_system_sounds',

  INPUT_BUFFER: 'input_buffer',
  FILESYSTEM_PERF: 'filesystem_perf',
  DWM_PERF: 'dwm_perf',
  BACKGROUND_POLLING: 'background_polling',

  NIC_INTERRUPT_MOD: 'nic_interrupt_mod',
  NIC_FLOW_CONTROL: 'nic_flow_control',
  NIC_ENERGY_EFFICIENT: 'nic_energy_efficient',
  BROWSER_BACKGROUND: 'browser_background',
} as const

const CAUTION_OPTIMIZATIONS = {
  MSI_MODE: 'msi_mode',
  HPET: 'hpet',
  GAME_BAR: 'game_bar',
  HAGS: 'hags',
  FSO_DISABLE: 'fso_disable',
  ULTIMATE_PERF: 'ultimate_perf',
  SERVICES_TRIM: 'services_trim',
  DISK_CLEANUP: 'disk_cleanup',

  WPBT_DISABLE: 'wpbt_disable',
  QOS_GAMING: 'qos_gaming',
  NETWORK_THROTTLING: 'network_throttling',
  INTERRUPT_AFFINITY: 'interrupt_affinity',
  PROCESS_MITIGATION: 'process_mitigation',

  MMCSS_GAMING: 'mmcss_gaming',
  SCHEDULER_OPT: 'scheduler_opt',
  CORE_PARKING: 'core_parking',
  TIMER_REGISTRY: 'timer_registry',
  RSC_DISABLE: 'rsc_disable',
  SYSMAIN_DISABLE: 'sysmain_disable',

  SERVICES_SEARCH_OFF: 'services_search_off',
  SCHEDULED_TASKS_GAMING: 'scheduled_tasks_gaming',

  MEMORY_GAMING: 'memory_gaming',
  POWER_THROTTLE_OFF: 'power_throttle_off',
  PRIORITY_BOOST_OFF: 'priority_boost_off',

  // FR33THY: GPU-specific optimizations
  AMD_ULPS_DISABLE: 'amd_ulps_disable',
} as const

const RISKY_OPTIMIZATIONS = {
  // FR33THY: Force NVIDIA GPU to maximum P0 power state
  NVIDIA_P0_STATE: 'nvidia_p0_state',
  PRIVACY_TIER1: 'privacy_tier1',
  PRIVACY_TIER2: 'privacy_tier2',
  PRIVACY_TIER3: 'privacy_tier3',
  BLOATWARE: 'bloatware',
  IPV4_PREFER: 'ipv4_prefer',
  TEREDO_DISABLE: 'teredo_disable',
  NATIVE_NVME: 'native_nvme',

  SMT_DISABLE: 'smt_disable',
  AUDIO_EXCLUSIVE: 'audio_exclusive',
  TCP_OPTIMIZER: 'tcp_optimizer',

  // FR33THY: Network binding strip - disables unnecessary protocols
  NETWORK_BINDING_STRIP: 'network_binding_strip',
} as const

const LUDICROUS_OPTIMIZATIONS = {
  SPECTRE_MELTDOWN_OFF: 'spectre_meltdown_off',
  CORE_ISOLATION_OFF: 'core_isolation_off',

  KERNEL_MITIGATIONS_OFF: 'kernel_mitigations_off',
  DEP_OFF: 'dep_off',
} as const

export const OPTIMIZATION_KEYS = {
  ...SAFE_OPTIMIZATIONS,
  ...CAUTION_OPTIMIZATIONS,
  ...RISKY_OPTIMIZATIONS,
  ...LUDICROUS_OPTIMIZATIONS,
} as const

export type OptimizationKey = (typeof OPTIMIZATION_KEYS)[keyof typeof OPTIMIZATION_KEYS]

export type SafeOptimization = (typeof SAFE_OPTIMIZATIONS)[keyof typeof SAFE_OPTIMIZATIONS]
export type CautionOptimization = (typeof CAUTION_OPTIMIZATIONS)[keyof typeof CAUTION_OPTIMIZATIONS]
export type RiskyOptimization = (typeof RISKY_OPTIMIZATIONS)[keyof typeof RISKY_OPTIMIZATIONS]
export type LudicrousOptimization =
  (typeof LUDICROUS_OPTIMIZATIONS)[keyof typeof LUDICROUS_OPTIMIZATIONS]

const OPTIMIZATION_KEY_VALUES = Object.values(OPTIMIZATION_KEYS) as OptimizationKey[]

export function isOptimizationKey(value: unknown): value is OptimizationKey {
  return isStringEnumValue(OPTIMIZATION_KEY_VALUES, value)
}

export interface AppState {
  readonly software: SoftwareCatalog
  readonly selectedSoftware: ReadonlySet<PackageKey>
  readonly currentFilter: FilterValue
  readonly searchTerm: string
  readonly currentView: ViewMode
}

/**
 * Persona/Preset type - re-exported from persona-registry for forward compatibility
 * Import from persona-registry.ts for new code
 */
export type PresetType = PersonaId

/**
 * Type guard for PresetType - delegates to persona-registry
 */
export function isPresetType(value: unknown): value is PresetType {
  return isPersonaId(value)
}

export interface Preset {
  readonly name: PresetType
  readonly hardware: Partial<HardwareProfile>
  readonly optimizations: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

export const SCRIPT_FILENAME = 'rocktune-setup.ps1' as const

export interface ScriptConfig {
  readonly generated: string
  readonly hardware: HardwareProfile
  readonly optimizations: readonly OptimizationKey[]
  readonly packages: readonly WingetId[]
}

export const CATEGORY_SVG_ICONS = {
  launcher:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
  gaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m8 0h.01m2-2h.01"/></svg>',
  streaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><circle cx="2" cy="20" r="1"/></svg>',
  monitoring:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  media:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  utility:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  rgb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  runtime:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>',
  benchmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20v-6m6 6v-4m-12 4V10m12-6 2 2-2 2m-4-2h4M6 6H2m4 0 2 2M6 6l2-2"/></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
} as const satisfies Record<Category | 'default', string>

export const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org' as const

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

export type Prettify<T> = { [K in keyof T]: T[K] } & {}

// ====================================================================
// CONFIG FILE GENERATION
// ====================================================================

/**
 * Supported config tools for third-party software
 * ONLY includes tools that support importing config files
 * (Discord and Steam excluded - no config import support)
 */
export const CONFIG_TOOLS = {
  OBS: 'obs',
  MSI_AFTERBURNER: 'msi_afterburner',
  FAN_CONTROL: 'fan_control',
  UNIFI: 'unifi',
  NVIDIA_INSPECTOR: 'nvidia_inspector',
} as const satisfies Record<string, string>

export type ConfigTool = (typeof CONFIG_TOOLS)[keyof typeof CONFIG_TOOLS]

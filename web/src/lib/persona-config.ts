import { OPTIMIZATIONS } from './optimizations'
import type { PersonaId } from './persona-registry'
import type { ConfigTool, OptimizationKey } from './types'

/**
 * PERSONA CONFIGURATION: Inheritance Pattern
 *
 * This module implements a base + overrides pattern for persona configurations.
 * Instead of fully specifying each persona (200+ LOC), we define:
 * - BASE: Common optimizations for all personas
 * - ADDITIONS: What makes each persona unique
 * - EXCLUSIONS: What each persona explicitly removes
 *
 * Benefits:
 * - Visual diff: See exactly what makes pro_gamer different from gamer
 * - DRY: Update base affects all personas
 * - Maintainability: 7-line base + 5-line override vs 50-line full spec
 */

// ====================================================================
// BASE CONFIGURATION (Applied to ALL personas)
// ====================================================================

/**
 * Base optimizations applied to ALL personas
 * These are the "minimal_default" baseline
 */
const BASE_OPTIMIZATIONS: readonly OptimizationKey[] = [
  'pagefile',
  'fastboot',
  'restore_point',
  'power_plan',
  'usb_power',
  'pcie_power',
  'audio_enhancements',
  'game_mode',
] as const

// ====================================================================
// PERSONA ADDITIONS (Sparse - only what's unique)
// ====================================================================

/**
 * Persona-specific additions to base configuration
 * Only list what's DIFFERENT from the base
 */
const PERSONA_ADDITIONS: Record<PersonaId, readonly OptimizationKey[]> = {
  /**
   * GAMER: Balanced gaming performance
   * Base + common gaming optimizations
   */
  gamer: [
    'dns',
    'nagle',
    'nic_interrupt_mod',
    'nic_flow_control',
    'nic_energy_efficient',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'browser_background',
    'audio_communications',
    'timer',
    'end_task',
    'delivery_opt',
    'feedback_disable',
  ],

  /**
   * PRO GAMER: Ultra-low latency competitive gaming
   * Gamer + CAUTION tier optimizations for maximum performance
   */
  pro_gamer: [
    // Core optimizations
    'timer',
    'notifications_off',
    'usb_suspend',
    'dns',
    'nagle',
    'nic_interrupt_mod',
    'nic_flow_control',
    'nic_energy_efficient',
    'mouse_accel',
    'background_polling',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'browser_background',
    'audio_communications',
    'audio_system_sounds',
    'accessibility_shortcuts',
    // CAUTION tier (test recommended)
    'msi_mode',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'services_search_off',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
    'end_task',
    'mmcss_gaming',
    'timer_registry',
    'min_processor_state',
    'delivery_opt',
    'feedback_disable',
    'rss_enable',
  ],

  /**
   * STREAMER: Stable performance while streaming
   * Gamer - gamedvr (breaks OBS) + streaming-safe settings
   */
  streamer: [
    'dns',
    'nagle',
    'nic_interrupt_mod',
    'nic_flow_control',
    'nic_energy_efficient',
    'edge_debloat',
    'copilot_disable',
    'browser_background',
    'audio_communications',
    'delivery_opt',
    'feedback_disable',
    'timer',
    // NOTE: NO gamedvr - breaks OBS capture
    // NOTE: NO aggressive power settings - adaptive for streaming
  ],

  /**
   * BENCHMARKER: Maximum performance for testing
   * ALL optimizations - handled specially in getPersonaOptimizations()
   * Empty array here to avoid circular dependency with OPTIMIZATIONS
   */
  benchmarker: [],
} as const satisfies Record<PersonaId, readonly OptimizationKey[]>

// ====================================================================
// PERSONA EXCLUSIONS (Explicit removals from base)
// ====================================================================

/**
 * Optimizations to REMOVE from the final configuration
 * Used when a persona needs to exclude something from additions
 */
const PERSONA_EXCLUSIONS: Partial<Record<PersonaId, readonly OptimizationKey[]>> = {
  /**
   * STREAMER exclusions:
   * - gamedvr: Breaks OBS/capture software
   */
  streamer: ['gamedvr'],
} as const

// ====================================================================
// SPECIAL PERSONA CONSTANTS
// ====================================================================

/**
 * Persona that requires all optimizations (kitchen sink approach)
 * Extracted constant to avoid magic string comparison
 */
const BENCHMARKER_PERSONA: PersonaId = 'benchmarker'

// ====================================================================
// CONFIGURATION MERGE HELPERS
// ====================================================================

/**
 * Extract all optimization keys from the OPTIMIZATIONS array
 * Used for benchmarker persona (kitchen sink approach)
 *
 * Time complexity: O(n) where n = number of optimizations
 * Space complexity: O(n) for the new array
 */
function extractAllOptimizationKeys(): readonly OptimizationKey[] {
  return OPTIMIZATIONS.map((opt) => opt.key)
}

/**
 * Check if persona requires all optimizations
 * Extracted predicate for single responsibility
 */
function shouldIncludeAllOptimizations(persona: PersonaId): boolean {
  return persona === BENCHMARKER_PERSONA
}

/**
 * Creates an exclusion filter predicate using Set for O(1) lookups
 * Returns a function that checks if an optimization is NOT in the exclusions list
 *
 * PERFORMANCE: Uses Set for O(1) membership check vs Array.includes() O(n)
 * - Before: O(n²) for filtering (n items × n lookups)
 * - After: O(n) for filtering (n items × O(1) lookups)
 * - For pro_gamer with 40+ optimizations: 40x faster!
 */
function createExclusionFilter(
  exclusions: readonly OptimizationKey[],
): (opt: OptimizationKey) => boolean {
  const exclusionSet = new Set(exclusions)
  return (opt: OptimizationKey) => !exclusionSet.has(opt)
}

/**
 * Merges base, additions, and exclusions into final optimization list
 * Follows AlgoExpert principle: "Break down complex functions"
 *
 * Algorithm:
 * 1. Concatenate base + additions: O(n + m)
 * 2. Create exclusion Set: O(k)
 * 3. Filter using Set: O(n) with O(1) lookups
 * Total: O(n + m + k) where n=base, m=additions, k=exclusions
 */
function mergeOptimizationLists(
  base: readonly OptimizationKey[],
  additions: readonly OptimizationKey[],
  exclusions: readonly OptimizationKey[],
): readonly OptimizationKey[] {
  const merged = [...base, ...additions]
  const exclusionFilter = createExclusionFilter(exclusions)
  return merged.filter(exclusionFilter)
}

// ====================================================================
// PUBLIC API
// ====================================================================

/**
 * Get final optimizations for a persona using inheritance pattern
 * Merges: base + additions - exclusions
 *
 * Special case: benchmarker gets ALL optimizations (kitchen sink approach)
 *
 * Time complexity: O(n) where n = total optimizations
 * Space complexity: O(n) for the merged array
 *
 * @param persona - PersonaId to get optimizations for
 * @returns Readonly array of optimization keys for the persona
 */
export function getPersonaOptimizations(persona: PersonaId): readonly OptimizationKey[] {
  if (shouldIncludeAllOptimizations(persona)) {
    return extractAllOptimizationKeys()
  }

  const base = BASE_OPTIMIZATIONS
  const additions = PERSONA_ADDITIONS[persona] ?? []
  const exclusions = PERSONA_EXCLUSIONS[persona] ?? []

  return mergeOptimizationLists(base, additions, exclusions)
}

// ====================================================================
// TOOL AVAILABILITY MAPPING
// ====================================================================

/**
 * Maps config tools to applicable personas
 * Determines which downloadable configs are available for each persona
 */
export const TOOL_PERSONA_MAP: Record<ConfigTool, readonly PersonaId[]> = {
  obs: ['streamer'],
  msi_afterburner: ['gamer', 'pro_gamer', 'benchmarker'],
  fan_control: ['gamer', 'pro_gamer', 'benchmarker'],
  unifi: ['pro_gamer'],
  nvidia_inspector: ['gamer', 'pro_gamer', 'benchmarker', 'streamer'],
} as const satisfies Record<ConfigTool, readonly PersonaId[]>

// ====================================================================
// NEXT STEPS GUIDANCE (Per-Persona)
// ====================================================================

/**
 * Curated next steps shown after script completion
 * Persona-specific guidance for post-script optimization
 */
export const PERSONA_NEXT_STEPS: Record<PersonaId, readonly string[]> = {
  gamer: [
    'DISPLAY: Set refresh rate to max (Settings > Display > Advanced)',
    'GPU: Low Latency Mode = On, Power = Max Performance',
    'DISCORD: Disable Hardware Acceleration (Settings > Advanced)',
    'INPUT LAG: Cap FPS 3% below refresh (e.g., 139 for 144Hz) to keep GPU < 95%',
    'G-SYNC: V-Sync ON in NVCP, OFF in-game. FPS cap prevents tearing + low latency',
  ],
  pro_gamer: [
    'DISPLAY: Set refresh rate to max (Settings > Display > Advanced)',
    'FPS CAP: Use in-game limiter > Reflex > RTSS > NVCP (in-game is fastest)',
    'GPU HEADROOM: Keep utilization < 95% — at 99% input lag spikes significantly',
    'REFLEX: Only enable if GPU at 99%+. If capped below 95%, turn Reflex OFF',
    'RGB: Disable all RGB software overlays',
    'TIMER: Use option [2] in the menu to run timer before gaming',
    'G-SYNC: V-Sync ON in NVCP + cap FPS 3% below refresh = zero tearing + low latency',
    'NETWORK: Test bufferbloat at waveform.com — if grade < B, enable SQM on router',
  ],
  streamer: [
    'OBS: Set encoder to NVENC/AMF, Quality preset',
    'OBS: Enable Game Capture over Display Capture',
    'AUDIO: Configure VoiceMeeter for stream/game split',
    'GPU: Enable capture mode in NVIDIA/AMD settings',
    'INPUT LAG: Cap FPS to keep GPU < 95% — leaves headroom for encoding',
    'REFLEX: Keep ON while streaming if GPU-bound, OFF if you have headroom',
  ],
  benchmarker: [
    'CAPFRAMEX: Capture baseline before/after for comparisons',
    'LATENCYMON: Verify DPC latency < 500us, no red flags',
    'HWINFO: Log temps/power during benchmark runs',
    'TIMER: Use option [2] in the menu for accurate frametime capture',
    'METHODOLOGY: Test at fixed FPS cap, measure 1% lows and frametimes',
    'GPU HEADROOM: Compare results at 99% vs 90% GPU utilization',
  ],
} as const satisfies Record<PersonaId, readonly string[]>

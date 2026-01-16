/**
 * Tests for types.ts
 * Verifies type guards and validation functions
 */

import { assertEquals, assertFalse } from 'jsr:@std/assert'
import {
  CATEGORIES,
  CPU_TYPES,
  DNS_PROVIDERS,
  EVIDENCE_LEVELS,
  FILTER_ALL,
  FILTER_RECOMMENDED,
  FILTER_SELECTED,
  GPU_TYPES,
  MONITOR_SOFTWARE_TYPES,
  OPTIMIZATION_KEYS,
  OPTIMIZATION_TIERS,
  PERIPHERAL_TYPES,
  VIEW_MODES,
  isCpuType,
  isFilterAll,
  isFilterRecommended,
  isFilterSelected,
  isGpuType,
  isMonitorSoftwareType,
  isOptimizationKey,
  isPackageKey,
  isPeripheralType,
  isPresetType,
  type SoftwareCatalog,
} from './types.ts'

// =============================================================================
// CPU TYPE VALIDATION
// =============================================================================

Deno.test('isCpuType - Returns true for valid CPU types', () => {
  assertEquals(isCpuType('amd_x3d'), true)
  assertEquals(isCpuType('amd'), true)
  assertEquals(isCpuType('intel'), true)
})

Deno.test('isCpuType - Returns false for invalid values', () => {
  assertFalse(isCpuType('invalid'))
  assertFalse(isCpuType('AMD')) // case sensitive
  assertFalse(isCpuType(''))
  assertFalse(isCpuType(null))
  assertFalse(isCpuType(undefined))
  assertFalse(isCpuType(123))
  assertFalse(isCpuType({}))
  assertFalse(isCpuType([]))
})

Deno.test('CPU_TYPES - Contains expected values', () => {
  assertEquals(CPU_TYPES.AMD_X3D, 'amd_x3d')
  assertEquals(CPU_TYPES.AMD, 'amd')
  assertEquals(CPU_TYPES.INTEL, 'intel')
})

// =============================================================================
// GPU TYPE VALIDATION
// =============================================================================

Deno.test('isGpuType - Returns true for valid GPU types', () => {
  assertEquals(isGpuType('nvidia'), true)
  assertEquals(isGpuType('amd'), true)
  assertEquals(isGpuType('intel'), true)
})

Deno.test('isGpuType - Returns false for invalid values', () => {
  assertFalse(isGpuType('invalid'))
  assertFalse(isGpuType('NVIDIA')) // case sensitive
  assertFalse(isGpuType(''))
  assertFalse(isGpuType(null))
  assertFalse(isGpuType(undefined))
})

Deno.test('GPU_TYPES - Contains expected values', () => {
  assertEquals(GPU_TYPES.NVIDIA, 'nvidia')
  assertEquals(GPU_TYPES.AMD, 'amd')
  assertEquals(GPU_TYPES.INTEL, 'intel')
})

// =============================================================================
// PERIPHERAL TYPE VALIDATION
// =============================================================================

Deno.test('isPeripheralType - Returns true for valid peripheral types', () => {
  assertEquals(isPeripheralType('logitech'), true)
  assertEquals(isPeripheralType('razer'), true)
  assertEquals(isPeripheralType('corsair'), true)
  assertEquals(isPeripheralType('steelseries'), true)
  assertEquals(isPeripheralType('asus'), true)
  assertEquals(isPeripheralType('wooting'), true)
})

Deno.test('isPeripheralType - Returns false for invalid values', () => {
  assertFalse(isPeripheralType('invalid'))
  assertFalse(isPeripheralType('Logitech')) // case sensitive
  assertFalse(isPeripheralType(''))
  assertFalse(isPeripheralType(null))
})

Deno.test('PERIPHERAL_TYPES - Contains all expected brands', () => {
  assertEquals(Object.keys(PERIPHERAL_TYPES).length, 6)
  assertEquals(PERIPHERAL_TYPES.LOGITECH, 'logitech')
  assertEquals(PERIPHERAL_TYPES.RAZER, 'razer')
  assertEquals(PERIPHERAL_TYPES.CORSAIR, 'corsair')
  assertEquals(PERIPHERAL_TYPES.STEELSERIES, 'steelseries')
  assertEquals(PERIPHERAL_TYPES.ASUS, 'asus')
  assertEquals(PERIPHERAL_TYPES.WOOTING, 'wooting')
})

// =============================================================================
// MONITOR SOFTWARE TYPE VALIDATION
// =============================================================================

Deno.test('isMonitorSoftwareType - Returns true for valid monitor software types', () => {
  assertEquals(isMonitorSoftwareType('dell'), true)
  assertEquals(isMonitorSoftwareType('lg'), true)
  assertEquals(isMonitorSoftwareType('hp'), true)
})

Deno.test('isMonitorSoftwareType - Returns false for invalid values', () => {
  assertFalse(isMonitorSoftwareType('invalid'))
  assertFalse(isMonitorSoftwareType('Dell')) // case sensitive
  assertFalse(isMonitorSoftwareType(''))
  assertFalse(isMonitorSoftwareType(null))
})

Deno.test('MONITOR_SOFTWARE_TYPES - Contains expected brands', () => {
  assertEquals(Object.keys(MONITOR_SOFTWARE_TYPES).length, 3)
  assertEquals(MONITOR_SOFTWARE_TYPES.DELL, 'dell')
  assertEquals(MONITOR_SOFTWARE_TYPES.LG, 'lg')
  assertEquals(MONITOR_SOFTWARE_TYPES.HP, 'hp')
})

// =============================================================================
// FILTER TYPE VALIDATION
// =============================================================================

Deno.test('isFilterAll - Returns true only for FILTER_ALL', () => {
  assertEquals(isFilterAll(FILTER_ALL), true)
  assertEquals(isFilterAll('all'), true)
  assertFalse(isFilterAll(FILTER_SELECTED))
  assertFalse(isFilterAll(FILTER_RECOMMENDED))
  assertFalse(isFilterAll('launcher'))
})

Deno.test('isFilterSelected - Returns true only for FILTER_SELECTED', () => {
  assertEquals(isFilterSelected(FILTER_SELECTED), true)
  assertEquals(isFilterSelected('selected'), true)
  assertFalse(isFilterSelected(FILTER_ALL))
  assertFalse(isFilterSelected(FILTER_RECOMMENDED))
  assertFalse(isFilterSelected('gaming'))
})

Deno.test('isFilterRecommended - Returns true only for FILTER_RECOMMENDED', () => {
  assertEquals(isFilterRecommended(FILTER_RECOMMENDED), true)
  assertEquals(isFilterRecommended('recommended'), true)
  assertFalse(isFilterRecommended(FILTER_ALL))
  assertFalse(isFilterRecommended(FILTER_SELECTED))
  assertFalse(isFilterRecommended('utility'))
})

// =============================================================================
// OPTIMIZATION KEY VALIDATION
// =============================================================================

Deno.test('isOptimizationKey - Returns true for valid optimization keys', () => {
  // Safe tier
  assertEquals(isOptimizationKey('pagefile'), true)
  assertEquals(isOptimizationKey('fastboot'), true)
  assertEquals(isOptimizationKey('timer'), true)
  assertEquals(isOptimizationKey('power_plan'), true)

  // Caution tier
  assertEquals(isOptimizationKey('msi_mode'), true)
  assertEquals(isOptimizationKey('hpet'), true)

  // Risky tier
  assertEquals(isOptimizationKey('privacy_tier1'), true)
  assertEquals(isOptimizationKey('bloatware'), true)

  // Ludicrous tier
  assertEquals(isOptimizationKey('spectre_meltdown_off'), true)
  assertEquals(isOptimizationKey('core_isolation_off'), true)
})

Deno.test('isOptimizationKey - Returns false for invalid values', () => {
  assertFalse(isOptimizationKey('invalid'))
  assertFalse(isOptimizationKey('PAGEFILE')) // case sensitive
  assertFalse(isOptimizationKey(''))
  assertFalse(isOptimizationKey(null))
  assertFalse(isOptimizationKey(undefined))
  assertFalse(isOptimizationKey(123))
})

Deno.test('OPTIMIZATION_KEYS - Contains all tiers', () => {
  // Check safe optimizations
  assertEquals(OPTIMIZATION_KEYS.PAGEFILE, 'pagefile')
  assertEquals(OPTIMIZATION_KEYS.FASTBOOT, 'fastboot')

  // Check caution optimizations
  assertEquals(OPTIMIZATION_KEYS.MSI_MODE, 'msi_mode')
  assertEquals(OPTIMIZATION_KEYS.HPET, 'hpet')

  // Check risky optimizations
  assertEquals(OPTIMIZATION_KEYS.PRIVACY_TIER1, 'privacy_tier1')
  assertEquals(OPTIMIZATION_KEYS.BLOATWARE, 'bloatware')

  // Check ludicrous optimizations
  assertEquals(OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF, 'spectre_meltdown_off')
  assertEquals(OPTIMIZATION_KEYS.CORE_ISOLATION_OFF, 'core_isolation_off')
})

// =============================================================================
// PACKAGE KEY VALIDATION
// =============================================================================

Deno.test('isPackageKey - Returns true for keys in catalog', () => {
  const catalog: SoftwareCatalog = {
    'Steam.Steam': {
      id: 'Steam.Steam',
      name: 'Steam',
      category: 'launcher',
    },
    'Discord.Discord': {
      id: 'Discord.Discord',
      name: 'Discord',
      category: 'gaming',
    },
  } as SoftwareCatalog

  assertEquals(isPackageKey(catalog, 'Steam.Steam'), true)
  assertEquals(isPackageKey(catalog, 'Discord.Discord'), true)
})

Deno.test('isPackageKey - Returns false for keys not in catalog', () => {
  const catalog: SoftwareCatalog = {
    'Steam.Steam': {
      id: 'Steam.Steam',
      name: 'Steam',
      category: 'launcher',
    },
  } as SoftwareCatalog

  assertFalse(isPackageKey(catalog, 'Invalid.Package'))
  assertFalse(isPackageKey(catalog, ''))
  assertFalse(isPackageKey(catalog, 'steam.steam')) // case sensitive
})

Deno.test('isPackageKey - Handles empty catalog', () => {
  const emptyCatalog: SoftwareCatalog = {}

  assertFalse(isPackageKey(emptyCatalog, 'Steam.Steam'))
  assertFalse(isPackageKey(emptyCatalog, ''))
})

// =============================================================================
// PRESET TYPE VALIDATION
// =============================================================================

Deno.test('isPresetType - Returns true for valid preset types', () => {
  assertEquals(isPresetType('gamer'), true)
  assertEquals(isPresetType('pro_gamer'), true)
  assertEquals(isPresetType('streamer'), true)
  assertEquals(isPresetType('benchmarker'), true)
})

Deno.test('isPresetType - Returns false for invalid values', () => {
  assertFalse(isPresetType('invalid'))
  assertFalse(isPresetType('GAMER')) // case sensitive
  assertFalse(isPresetType(''))
  assertFalse(isPresetType(null))
  assertFalse(isPresetType(undefined))
})

// =============================================================================
// CONSTANT INTEGRITY TESTS
// =============================================================================

Deno.test('CATEGORIES - Contains all expected categories', () => {
  const expectedCategories = [
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
  ]

  assertEquals(CATEGORIES.length, expectedCategories.length)
  for (const category of expectedCategories) {
    assertEquals(CATEGORIES.includes(category as (typeof CATEGORIES)[number]), true)
  }
})

Deno.test('DNS_PROVIDERS - Contains expected providers', () => {
  assertEquals(DNS_PROVIDERS.CLOUDFLARE, 'cloudflare')
  assertEquals(DNS_PROVIDERS.GOOGLE, 'google')
  assertEquals(DNS_PROVIDERS.QUAD9, 'quad9')
  assertEquals(DNS_PROVIDERS.OPENDNS, 'opendns')
  assertEquals(DNS_PROVIDERS.ADGUARD, 'adguard')
  assertEquals(Object.keys(DNS_PROVIDERS).length, 5)
})

Deno.test('VIEW_MODES - Contains expected modes', () => {
  assertEquals(VIEW_MODES.GRID, 'grid')
  assertEquals(VIEW_MODES.LIST, 'list')
  assertEquals(Object.keys(VIEW_MODES).length, 2)
})

Deno.test('OPTIMIZATION_TIERS - Contains expected tiers', () => {
  assertEquals(OPTIMIZATION_TIERS.SAFE, 'safe')
  assertEquals(OPTIMIZATION_TIERS.CAUTION, 'caution')
  assertEquals(OPTIMIZATION_TIERS.RISKY, 'risky')
  assertEquals(OPTIMIZATION_TIERS.LUDICROUS, 'ludicrous')
  assertEquals(Object.keys(OPTIMIZATION_TIERS).length, 4)
})

Deno.test('EVIDENCE_LEVELS - Contains expected levels', () => {
  assertEquals(EVIDENCE_LEVELS.HIGH, 'high')
  assertEquals(EVIDENCE_LEVELS.MEDIUM, 'medium')
  assertEquals(EVIDENCE_LEVELS.LOW, 'low')
  assertEquals(Object.keys(EVIDENCE_LEVELS).length, 3)
})

// =============================================================================
// TYPE GUARD EDGE CASES
// =============================================================================

Deno.test('Type guards handle various falsy values', () => {
  const falsyValues = [null, undefined, '', 0, false, Number.NaN, [], {}]

  for (const value of falsyValues) {
    assertFalse(isCpuType(value))
    assertFalse(isGpuType(value))
    assertFalse(isPeripheralType(value))
    assertFalse(isMonitorSoftwareType(value))
    assertFalse(isOptimizationKey(value))
    assertFalse(isPresetType(value))
  }
})

Deno.test('Type guards handle whitespace strings', () => {
  assertFalse(isCpuType(' '))
  assertFalse(isCpuType('  intel  '))
  assertFalse(isGpuType(' nvidia '))
  assertFalse(isPeripheralType('logitech '))
})

Deno.test('Type guards handle similar but invalid strings', () => {
  // Misspellings
  assertFalse(isCpuType('intell'))
  assertFalse(isGpuType('nvidea'))
  assertFalse(isPeripheralType('logitec'))

  // Partial matches
  assertFalse(isCpuType('int'))
  assertFalse(isGpuType('nv'))
  assertFalse(isPeripheralType('log'))
})

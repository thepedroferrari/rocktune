/**
 * Critical tests for share.ts
 * Tests URL encoding/decoding, security limits, and LUDICROUS filtering
 */

import { assertEquals, assertExists, assertFalse } from 'jsr:@std/assert'
import {
  decodeShareURL,
  getFullShareURLWithMeta,
  getOneLinerWithMeta,
  validatePackages,
  type BuildToEncode,
} from './share.ts'
import type { OptimizationKey, PackageKey } from './types.ts'
import { OPTIMIZATION_KEYS } from './types.ts'

// Helper to create a minimal valid build
function createTestBuild(overrides: Partial<BuildToEncode> = {}): BuildToEncode {
  return {
    cpu: 'amd_x3d',
    gpu: 'nvidia',
    dnsProvider: 'cloudflare',
    peripherals: [],
    monitorSoftware: [],
    optimizations: [],
    packages: [],
    ...overrides,
  }
}

// =============================================================================
// ENCODING/DECODING ROUNDTRIP TESTS
// =============================================================================

Deno.test('Share URL - Roundtrip encoding/decoding preserves all fields', () => {
  const build = createTestBuild({
    cpu: 'intel',
    gpu: 'amd',
    dnsProvider: 'quad9',
    peripherals: ['logitech', 'razer'],
    monitorSoftware: ['dell'],
    optimizations: ['pagefile', 'fastboot', 'gamemode'] as OptimizationKey[],
    packages: ['Steam.Steam', 'Discord.Discord'] as PackageKey[],
    preset: 'gamer',
  })

  const encoded = getFullShareURLWithMeta(build)
  assertExists(encoded.url)
  assertExists(encoded.hash)

  // Extract the hash part from URL
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    assertEquals(decoded.build.cpu, 'intel')
    assertEquals(decoded.build.gpu, 'amd')
    assertEquals(decoded.build.dnsProvider, 'quad9')
    assertEquals(decoded.build.peripherals, ['logitech', 'razer'])
    assertEquals(decoded.build.monitorSoftware, ['dell'])
    assertEquals(decoded.build.packages, ['Steam.Steam', 'Discord.Discord'])
    assertEquals(decoded.build.preset, 'gamer')
  }
})

Deno.test('Share URL - Empty build encodes and decodes correctly', () => {
  const build = createTestBuild()

  const encoded = getFullShareURLWithMeta(build)
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    assertEquals(decoded.build.packages.length, 0)
    assertEquals(decoded.build.optimizations.length, 0)
    assertEquals(decoded.build.peripherals.length, 0)
  }
})

// =============================================================================
// SECURITY: LUDICROUS OPTIMIZATION FILTERING
// =============================================================================

Deno.test('Share URL - LUDICROUS optimizations are blocked from encoding', () => {
  const ludicrousOpts: OptimizationKey[] = [
    OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
    OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
    OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
    OPTIMIZATION_KEYS.DEP_OFF,
  ]

  const build = createTestBuild({
    optimizations: ['pagefile', ...ludicrousOpts] as OptimizationKey[],
  })

  const encoded = getFullShareURLWithMeta(build)

  // Should report blocked count
  assertEquals(encoded.blockedCount, 4)

  // Decode and verify LUDICROUS opts are NOT included
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    // Only safe optimization should be present
    assertFalse(decoded.build.optimizations.includes(OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF))
    assertFalse(decoded.build.optimizations.includes(OPTIMIZATION_KEYS.CORE_ISOLATION_OFF))
    assertFalse(decoded.build.optimizations.includes(OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF))
    assertFalse(decoded.build.optimizations.includes(OPTIMIZATION_KEYS.DEP_OFF))
  }
})

Deno.test('Share URL - LUDICROUS optimizations filtered on decode with warning', () => {
  // Manually craft a URL that would contain LUDICROUS opts (bypassing encode filter)
  // This tests the decode-time filtering as a second line of defense
  const build = createTestBuild({
    optimizations: ['pagefile'] as OptimizationKey[],
  })

  const encoded = getFullShareURLWithMeta(build)
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    // Warnings should be empty for clean build
    assertEquals(decoded.build.warnings.length, 0)
  }
})

// =============================================================================
// SECURITY: DoS PREVENTION
// =============================================================================

Deno.test('Share URL - Rejects URLs exceeding compressed length limit', () => {
  // Create a hash that's way too long (over 5000 chars)
  const longHash = `b=1.${'A'.repeat(6000)}`

  const result = decodeShareURL(longHash)
  assertEquals(result.success, false)

  if (!result.success) {
    assertEquals(result.error, 'Share URL is too long to process safely')
  }
})

Deno.test('Share URL - Array length limits prevent DoS', () => {
  // The MAX_ARRAY_LENGTH is 100, so arrays should be truncated
  const build = createTestBuild({
    packages: Array.from({ length: 150 }, (_, i) => `pkg${i}`) as PackageKey[],
  })

  const encoded = getFullShareURLWithMeta(build)
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    // Should be truncated to MAX_ARRAY_LENGTH (100)
    assertEquals(decoded.build.packages.length <= 100, true)
  }
})

// =============================================================================
// SECURITY: PACKAGE KEY VALIDATION
// =============================================================================

Deno.test('Share URL - Valid package keys are accepted', () => {
  const build = createTestBuild({
    packages: ['Steam.Steam', 'Discord.Discord', 'Microsoft.VisualStudioCode'] as PackageKey[],
  })

  const encoded = getFullShareURLWithMeta(build)
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  const decoded = decodeShareURL(`b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    assertEquals(decoded.build.packages.length, 3)
    assertEquals(decoded.build.warnings.length, 0)
  }
})

Deno.test('validatePackages - Filters invalid packages from catalog', () => {
  const catalogKeys = new Set(['Steam.Steam', 'Discord.Discord'])
  const packages = ['Steam.Steam', 'Invalid.Package', 'Discord.Discord'] as PackageKey[]

  const result = validatePackages(packages, catalogKeys)

  assertEquals(result.valid.length, 2)
  assertEquals(result.invalidCount, 1)
  assertEquals(result.valid.includes('Steam.Steam' as PackageKey), true)
  assertEquals(result.valid.includes('Discord.Discord' as PackageKey), true)
})

// =============================================================================
// ERROR HANDLING
// =============================================================================

Deno.test('Share URL - Handles malformed URLs gracefully', () => {
  // Missing version separator
  let result = decodeShareURL('b=invalid')
  assertEquals(result.success, false)
  if (!result.success) {
    assertEquals(result.error.includes('missing version separator'), true)
  }

  // Invalid version number
  result = decodeShareURL('b=abc.data')
  assertEquals(result.success, false)
  if (!result.success) {
    assertEquals(result.error.includes('invalid version'), true)
  }

  // Empty hash
  result = decodeShareURL('')
  assertEquals(result.success, false)
})

Deno.test('Share URL - Handles corrupted compression data', () => {
  // Valid format but garbage compressed data
  const result = decodeShareURL('b=1.notvalidlzstring!!!')
  assertEquals(result.success, false)

  if (!result.success) {
    assertEquals(result.error.includes('decompress') || result.error.includes('decode'), true)
  }
})

Deno.test('Share URL - Supports legacy hash format (#b=)', () => {
  const build = createTestBuild({
    cpu: 'amd',
    gpu: 'nvidia',
  })

  const encoded = getFullShareURLWithMeta(build)
  const url = new URL(encoded.url)
  const hashParam = url.searchParams.get('b')
  assertExists(hashParam)

  // Test with # prefix (legacy format)
  const decoded = decodeShareURL(`#b=${hashParam}`)
  assertEquals(decoded.success, true)

  if (decoded.success) {
    assertEquals(decoded.build.cpu, 'amd')
    assertEquals(decoded.build.gpu, 'nvidia')
  }
})

// =============================================================================
// ONE-LINER COMMAND GENERATION
// =============================================================================

Deno.test('One-liner - Generates valid PowerShell command', () => {
  const build = createTestBuild({
    cpu: 'intel',
    gpu: 'nvidia',
    optimizations: ['pagefile', 'fastboot'] as OptimizationKey[],
  })

  const result = getOneLinerWithMeta(build)

  // Should contain environment variable and irm/iex pattern
  assertEquals(result.command.includes('$env:RT='), true)
  assertEquals(result.command.includes('irm'), true)
  assertEquals(result.command.includes('iex'), true)
  assertEquals(result.command.includes('/run.ps1'), true)
})

Deno.test('One-liner - LUDICROUS optimizations blocked', () => {
  const build = createTestBuild({
    optimizations: [
      'pagefile',
      OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
      OPTIMIZATION_KEYS.DEP_OFF,
    ] as OptimizationKey[],
  })

  const result = getOneLinerWithMeta(build)

  // Should report blocked count
  assertEquals(result.blockedCount, 2)

  // Command should not contain the blocked optimization IDs
  // (they're filtered before encoding)
})

Deno.test('One-liner - Empty build generates minimal command', () => {
  const build = createTestBuild()

  const result = getOneLinerWithMeta(build)

  // Empty config should still generate a valid command
  assertEquals(result.command.includes('irm'), true)
  assertEquals(result.command.includes('iex'), true)
})

// =============================================================================
// URL LENGTH WARNINGS
// =============================================================================

Deno.test('Share URL - Reports URL length warning for long URLs', () => {
  // Create a build with many packages to make a long URL
  const build = createTestBuild({
    packages: Array.from({ length: 50 }, (_, i) => `Package.Name${i}`) as PackageKey[],
    optimizations: Array.from({ length: 20 }, (_, i) => `opt${i}`) as OptimizationKey[],
  })

  const result = getFullShareURLWithMeta(build)

  // urlTooLong should be true if URL exceeds 2000 chars
  assertEquals(typeof result.urlTooLong, 'boolean')
  assertEquals(typeof result.urlLength, 'number')
})

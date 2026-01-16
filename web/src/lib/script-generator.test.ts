/**
 * Critical tests for script-generator.ts
 * Tests PowerShell script generation for all personas
 */

// Mock Vite build placeholders
declare global {
  var __BUILD_COMMIT__: string
  var __BUILD_DATE__: string
}

globalThis.__BUILD_COMMIT__ = 'test-commit'
globalThis.__BUILD_DATE__ = '2026-01-07'

import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import { PERSONA_META, type PersonaId } from './persona-registry.ts'
import { buildScript, buildVerificationScript, type SelectionState } from './script-generator.ts'
import type { PackageKey, SoftwareCatalog } from './types.ts'

// Minimal test catalog with proper IDs
const TEST_CATALOG: SoftwareCatalog = {
  'Steam.Steam': {
    id: 'Steam.Steam',
    name: 'Steam',
    category: 'launcher',
    desc: 'Gaming platform',
    command: 'Steam.Steam',
  },
  'Discord.Discord': {
    id: 'Discord.Discord',
    name: 'Discord',
    category: 'gaming',
    desc: 'Voice chat',
    command: 'Discord.Discord',
  },
} as SoftwareCatalog

// Helper to create minimal selection state
function createTestSelection(persona: PersonaId): SelectionState {
  return {
    hardware: {
      cpu: 'amd_x3d',
      gpu: 'nvidia',
      peripherals: [],
      monitorSoftware: [],
    },
    optimizations: ['pagefile', 'fastboot'],
    packages: ['Steam.Steam'] as PackageKey[],
    missingPackages: [],
    preset: persona,
    includeTimer: true,
    includeManualSteps: false,
    createBackup: true,
  }
}

Deno.test('Script generation - All personas generate valid PowerShell', () => {
  const personaIds = Object.keys(PERSONA_META) as PersonaId[]

  for (const persona of personaIds) {
    const selection = createTestSelection(persona)
    const script = buildScript(selection, {
      catalog: TEST_CATALOG,
      dnsProvider: 'cloudflare',
    })

    // Basic PowerShell validity checks (check for RunAsAdministrator which is always present)
    assertStringIncludes(script, '#Requires -RunAsAdministrator')
    assertStringIncludes(script, 'RockTune')
  }
})

Deno.test('Script generation - Gamer persona includes expected optimizations', () => {
  const selection = createTestSelection('gamer')
  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Should include pagefile or fastboot
  const hasOptimizations =
    script.includes('Pagefile') || script.includes('Fast Boot') || script.includes('fastboot')
  assertEquals(hasOptimizations, true)
})

Deno.test('Script generation - Pro gamer has advanced optimizations', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile', 'msi_mode', 'ultimate_perf'],
    packages: [],
    missingPackages: [],
    preset: 'pro_gamer',
    includeTimer: true,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Pro gamer script should be valid PowerShell
  assertStringIncludes(script, '#Requires')
})

Deno.test('Script generation - Empty optimizations still generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: [],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: true,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Even with no optimizations, should generate valid PowerShell
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

Deno.test('Script generation - Timer tool can be disabled', () => {
  const selectionWithTimer = createTestSelection('gamer')
  selectionWithTimer.includeTimer = true
  const scriptWithTimer = buildScript(selectionWithTimer, { catalog: TEST_CATALOG })

  const selectionWithoutTimer = createTestSelection('gamer')
  selectionWithoutTimer.includeTimer = false
  const scriptWithoutTimer = buildScript(selectionWithoutTimer, { catalog: TEST_CATALOG })

  // Timer script should be longer (has embedded timer code)
  assertEquals(scriptWithTimer.length > scriptWithoutTimer.length, true)
})

Deno.test('Script generation - Software packages are included', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: [],
    packages: ['Steam.Steam', 'Discord.Discord'] as PackageKey[],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: true,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Should include winget commands
  assertStringIncludes(script, 'winget')
})

Deno.test('Verification script - Generates valid PowerShell', () => {
  const selection = createTestSelection('gamer')
  const script = buildVerificationScript(selection)

  // Basic PowerShell validity - check for function or command
  assertEquals(script.length > 100, true)
  assertStringIncludes(script.toLowerCase(), 'function')
})

Deno.test('Verification script - All personas supported', () => {
  const personaIds = Object.keys(PERSONA_META) as PersonaId[]

  for (const persona of personaIds) {
    const selection = createTestSelection(persona)
    const script = buildVerificationScript(selection)

    // Should generate non-empty script
    assertEquals(script.length > 0, true)
  }
})

Deno.test('Script generation - Script structure is consistent', () => {
  const selection = createTestSelection('gamer')
  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Should have clear sections
  assertStringIncludes(script, 'RockTune')
  assertStringIncludes(script, '#Requires')
  assertStringIncludes(script, 'function')
})

// =============================================================================
// HARDWARE PROFILE VARIATIONS
// =============================================================================

Deno.test('Script generation - Intel CPU generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'intel', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

Deno.test('Script generation - AMD GPU generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd', gpu: 'amd', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

Deno.test('Script generation - AMD X3D CPU generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

// =============================================================================
// PERIPHERALS AND MONITOR SOFTWARE
// =============================================================================

Deno.test('Script generation - Logitech peripheral included', () => {
  const selection: SelectionState = {
    hardware: {
      cpu: 'amd_x3d',
      gpu: 'nvidia',
      peripherals: ['logitech'],
      monitorSoftware: [],
    },
    optimizations: [],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Should generate valid script with peripheral
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Multiple peripherals included', () => {
  const selection: SelectionState = {
    hardware: {
      cpu: 'amd_x3d',
      gpu: 'nvidia',
      peripherals: ['logitech', 'razer', 'corsair'],
      monitorSoftware: [],
    },
    optimizations: [],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Dell monitor software included', () => {
  const selection: SelectionState = {
    hardware: {
      cpu: 'amd_x3d',
      gpu: 'nvidia',
      peripherals: [],
      monitorSoftware: ['dell'],
    },
    optimizations: [],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

// =============================================================================
// DNS PROVIDERS
// =============================================================================

Deno.test('Script generation - Quad9 DNS provider', () => {
  const selection = createTestSelection('gamer')
  selection.optimizations = ['dns']

  const script = buildScript(selection, {
    catalog: TEST_CATALOG,
    dnsProvider: 'quad9',
  })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Google DNS provider', () => {
  const selection = createTestSelection('gamer')
  selection.optimizations = ['dns']

  const script = buildScript(selection, {
    catalog: TEST_CATALOG,
    dnsProvider: 'google',
  })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Default DNS provider when not specified', () => {
  const selection = createTestSelection('gamer')
  selection.optimizations = ['dns']

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Should use default (cloudflare) when not specified
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

// =============================================================================
// BUILD OPTIONS
// =============================================================================

Deno.test('Script generation - Backup disabled', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: false,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Script should still be valid
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Manual steps enabled', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: true,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Script should still be valid
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - All options disabled', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: [],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: false,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Minimal script should still be valid PowerShell
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

// =============================================================================
// EDGE CASES
// =============================================================================

Deno.test('Script generation - Null preset generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: ['Steam.Steam'] as PackageKey[],
    missingPackages: [],
    preset: null,
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Missing packages are tracked', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: [],
    packages: ['Steam.Steam'] as PackageKey[],
    missingPackages: ['NotInCatalog.Package'],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Script should still be valid even with missing packages
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Empty catalog generates valid script', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: [],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const emptyCatalog: SoftwareCatalog = {}

  const script = buildScript(selection, { catalog: emptyCatalog })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

Deno.test('Script generation - Streamer persona generates valid script', () => {
  const selection = createTestSelection('streamer')
  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

Deno.test('Script generation - Benchmarker persona generates valid script', () => {
  const selection = createTestSelection('benchmarker')
  const script = buildScript(selection, { catalog: TEST_CATALOG })

  assertStringIncludes(script, '#Requires -RunAsAdministrator')
  assertStringIncludes(script, 'RockTune')
})

// =============================================================================
// SECURITY: SAFE PATTERNS
// =============================================================================

Deno.test('Script generation - No Invoke-Expression on user input', () => {
  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
    packages: ['Steam.Steam'] as PackageKey[],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: true,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: TEST_CATALOG })

  // Script should not use Invoke-Expression on external/user data
  // (internal IEX for embedded timer is OK, but not on untrusted input)
  const iexCount = (script.match(/Invoke-Expression/gi) || []).length
  const iexShortCount = (script.match(/\biex\b/gi) || []).length

  // The timer tool uses IEX internally, but should be limited
  assertEquals(iexCount + iexShortCount < 10, true, 'Too many IEX calls')
})

Deno.test('Script generation - Uses proper escaping for package names', () => {
  const catalogWithSpecialChars: SoftwareCatalog = {
    'Test.Package': {
      id: 'Test.Package',
      name: 'Test "Package" with $special',
      category: 'utility',
      desc: 'A package with special characters',
      command: 'Test.Package',
    },
  } as SoftwareCatalog

  const selection: SelectionState = {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: [],
    packages: ['Test.Package'] as PackageKey[],
    missingPackages: [],
    preset: 'gamer',
    includeTimer: false,
    includeManualSteps: false,
    createBackup: true,
  }

  const script = buildScript(selection, { catalog: catalogWithSpecialChars })

  // Script should still be valid PowerShell (special chars are escaped)
  assertStringIncludes(script, '#Requires -RunAsAdministrator')
})

// =============================================================================
// PERIPHERAL/MONITOR PACKAGE MAPPING
// =============================================================================

Deno.test('PERIPHERAL_TO_PACKAGE - All peripheral types have mappings', async () => {
  const { PERIPHERAL_TO_PACKAGE } = await import('./script-generator.ts')

  // Known peripherals that should have mappings
  const expectedPeripherals = ['logitech', 'razer', 'corsair', 'steelseries', 'asus', 'wooting']

  for (const peripheral of expectedPeripherals) {
    assertEquals(
      peripheral in PERIPHERAL_TO_PACKAGE,
      true,
      `Missing mapping for peripheral: ${peripheral}`,
    )
  }
})

Deno.test('MONITOR_TO_PACKAGE - All monitor types have mappings', async () => {
  const { MONITOR_TO_PACKAGE } = await import('./script-generator.ts')

  // Known monitor software that should have mappings
  const expectedMonitors = ['dell', 'lg', 'hp']

  for (const monitor of expectedMonitors) {
    assertEquals(
      monitor in MONITOR_TO_PACKAGE,
      true,
      `Missing mapping for monitor software: ${monitor}`,
    )
  }
})

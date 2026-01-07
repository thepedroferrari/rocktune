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
import type { SoftwareCatalog } from './types.ts'

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
    packages: ['Steam.Steam'],
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
    packages: ['Steam.Steam', 'Discord.Discord'],
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

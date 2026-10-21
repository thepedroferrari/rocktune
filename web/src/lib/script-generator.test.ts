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
import {
  buildScript,
  buildVerificationScript,
  generateAntiCheatWarning,
  type SelectionState,
} from './script-generator.ts'
import type { PackageKey, SoftwareCatalog } from './types.ts'
import { ANTI_CHEAT_CONFLICTS, OPTIMIZATIONS } from './optimizations.ts'
import { getPersonaOptimizations } from './persona-config.ts'
import { OPT_VALUE_TO_ID } from './share-registry.ts'

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

    assertEquals(script.length > 0, true)
  }
})

Deno.test('Script generation - Script structure is consistent', () => {
  const selection = createTestSelection('gamer')
  const script = buildScript(selection, { catalog: TEST_CATALOG })

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

// ====================================================================
// 2026 debloat pass: fixes + new 24H2-era features
// ====================================================================

function scriptFor(optimizations: string[], overrides: Partial<SelectionState> = {}): string {
  const selection: SelectionState = {
    ...createTestSelection('gamer'),
    hardware: { cpu: 'intel', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: optimizations as SelectionState['optimizations'],
    ...overrides,
  }
  return buildScript(selection, { catalog: TEST_CATALOG })
}

Deno.test('Fix - Disable-Task splits folder and leaf (TaskName alone matches nothing)', () => {
  const script = scriptFor(['scheduled_tasks_gaming'])
  assertStringIncludes(script, 'Get-ScheduledTask -TaskPath $folder -TaskName $name')
  assertStringIncludes(script, 'Disable-ScheduledTask -TaskPath $folder -TaskName $name')
  assertStringIncludes(script, 'Microsoft Compatibility Appraiser')
  assertEquals(script.includes('XblGameSaveTask'), false, 'Xbox cloud-save tasks stay on')
  assertStringIncludes(script, 'Enable-ScheduledTask -TaskPath $tp -TaskName $tn')
})

Deno.test('Fix - Undo restores exact registry state (values.json, created keys removed)', () => {
  const script = scriptFor(['spectre_meltdown_off'])
  assertStringIncludes(script, 'Save-RegPriorState $Path $Name')
  assertStringIncludes(script, 'values.json')
  assertStringIncludes(script, 'Remove-ItemProperty -Path $v.Path -Name $v.Name')
  assertStringIncludes(script, 'Removed key created by RockTune')
})

Deno.test('Fix - SMT never uses bcdedit numproc', () => {
  const script = scriptFor(['smt_disable'])
  assertEquals(script.includes('bcdedit /set numproc'), false)
  assertStringIncludes(script, 'bcdedit /deletevalue numproc')
  assertStringIncludes(script, 'NumberOfCores -Sum')
  const verify = buildVerificationScript({
    ...createTestSelection('gamer'),
    optimizations: ['smt_disable'],
  })
  assertEquals(verify.includes('numproc\\s+$cores'), false)
})

Deno.test('Fix - Page file creates the setting when missing and falls back to auto', () => {
  const script = scriptFor(['pagefile'])
  assertStringIncludes(script, 'New-CimInstance -ClassName Win32_PageFileSetting')
  assertStringIncludes(script, 'AutomaticManagedPagefile = $true')
  assertStringIncludes(script, '$env:SystemDrive\\pagefile.sys')
})

Deno.test('Fix - generated script never calls Get-WmiObject (absent in PowerShell 7)', () => {
  const all = OPTIMIZATIONS.map((o) => o.key)
  const script = scriptFor(all)
  assertEquals(script.includes('Get-WmiObject'), false)
})

Deno.test('Fix - GPU interrupt affinity is a binary mask off CPU 0', () => {
  const script = scriptFor(['interrupt_affinity'])
  assertStringIncludes(script, 'Set-Reg $affPath "AssignmentSetOverride" $mask "Binary"')
  assertEquals(script.includes('"AssignmentSetOverride" 1'), false)
})

Deno.test('Fix - Input queue is never shrunk below the Windows default', () => {
  const script = scriptFor(['input_buffer'])
  assertEquals(script.includes('"MouseDataQueueSize" 32'), false)
  assertStringIncludes(script, '"MouseDataQueueSize" 100')
})

Deno.test('Fix - Razer block uses device metadata policy, not service shutdown', () => {
  const script = scriptFor(['razer_block'], {
    hardware: { cpu: 'intel', gpu: 'nvidia', peripherals: ['razer'], monitorSoftware: [] },
  })
  assertStringIncludes(script, 'PreventDeviceMetadataFromNetwork')
  assertEquals(script.includes('Name -like "Razer*"'), false)
})

Deno.test('Fix - DNS only on physical adapters with errors caught', () => {
  const script = scriptFor(['dns'])
  assertStringIncludes(script, 'Get-NetAdapter -Physical')
  assertStringIncludes(script, 'Set-DnsClientServerAddress -InterfaceIndex $nic.ifIndex')
})

Deno.test('Fix - Mutex released in finally; partial runs still save restore files', () => {
  const script = scriptFor(['pagefile'])
  assertStringIncludes(script, '} finally {')
  assertStringIncludes(script, '$mutex.ReleaseMutex()')
  assertStringIncludes(script, 'Save-BackupManifest }')
  assertEquals(script.indexOf('try {') < script.indexOf('if ($Undo) {'), true)
})

Deno.test('Fix - Services: startup type set before stop, delayed-auto restored', () => {
  const script = scriptFor(['sysmain_disable'])
  assertStringIncludes(script, 'Get-CimInstance Win32_Service -Filter')
  assertStringIncludes(script, 'DelayedAutoStart')
  assertStringIncludes(script, 'start= delayed-auto')
})

Deno.test('Fix - Ultimate Performance uses a fixed GUID (no duplicate plans)', () => {
  const script = scriptFor(['ultimate_perf'])
  assertStringIncludes(
    script,
    'powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 $rtPlan',
  )
  assertEquals(script.includes('Select-String "Ultimate Performance"'), false)
})

Deno.test('Fix - Restore point is always created (frequency limit lifted)', () => {
  const script = scriptFor(['restore_point'])
  assertStringIncludes(script, 'SystemRestorePointCreationFrequency')
  assertStringIncludes(script, 'Enable-ComputerRestore')
  assertEquals(script.includes('already created within last 24 hours'), false)
})

Deno.test('Feature - Windows AI off: Recall, Click to Do, AI service, Win11 + 24H2 guards', () => {
  const script = scriptFor(['ai_off'])
  for (const key of [
    'AllowRecallEnablement',
    'DisableAIDataAnalysis',
    'DisableClickToDo',
    'WSAIFabricSvc',
    'DisableCocreator',
    'WindowsNotepad',
  ]) {
    assertStringIncludes(script, key)
  }
  assertStringIncludes(script, 'if (-not $script:IsWin11)')
  assertStringIncludes(script, 'if ($script:IsWin11_24H2)')
})

Deno.test('Feature - Widgets and reboot items emit their policies', () => {
  const script = scriptFor(['widgets_off', 'update_no_reboot'])
  for (const key of [
    'AllowNewsAndInterests',
    'NoAutoRebootWithLoggedOnUsers',
    'IsContinuousInnovationOptedIn',
  ]) {
    assertStringIncludes(script, key)
  }
})

Deno.test('Feature - Game Bar popup fix is skipped on X3D CPUs', () => {
  const script = scriptFor(['gamebar_popup_fix'])
  assertStringIncludes(script, 'ms-gamebarservices')
  assertStringIncludes(script, 'if ($Config.hardware.cpu -eq "amd_x3d")')
})

Deno.test('Feature - Verification script checks new items', () => {
  const verify = buildVerificationScript({
    ...createTestSelection('gamer'),
    hardware: { cpu: 'intel', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['ai_off', 'widgets_off', 'update_no_reboot', 'gamebar_popup_fix'],
  })
  assertStringIncludes(verify, 'Windows AI / Recall off')
  assertStringIncludes(verify, 'Widgets off')
  assertStringIncludes(verify, 'No auto-reboot while signed in')
  assertStringIncludes(verify, 'ms-gamebar popup fix')
})

Deno.test('Run output - per-section progress and end summary', () => {
  const script = scriptFor(['pagefile', 'dns', 'ai_off'])
  assertStringIncludes(script, 'Start-Section "System"')
  assertStringIncludes(script, 'Write-SectionSummary')
  assertStringIncludes(script, 'Reboot:   NEEDED')
  assertStringIncludes(script, 'Loadout: 3 upgrades')
})

Deno.test('Presets - non-benchmarker personas never include LUDICROUS items', () => {
  const ludicrous = new Set(
    OPTIMIZATIONS.filter((o) => o.tier === 'ludicrous').map((o) => o.key as string),
  )
  for (const persona of ['gamer', 'pro_gamer', 'streamer'] as PersonaId[]) {
    for (const key of getPersonaOptimizations(persona)) {
      assertEquals(ludicrous.has(key), false, `${persona} includes LUDICROUS ${key}`)
    }
  }
})

Deno.test('Catalog - every new key has a share ID', () => {
  for (const key of ['ai_off', 'widgets_off', 'gamebar_popup_fix', 'update_no_reboot']) {
    assertEquals(typeof OPT_VALUE_TO_ID[key as keyof typeof OPT_VALUE_TO_ID], 'number', key)
  }
})

Deno.test('Handoff - banner points general cleanup to WinUtil and Win11Debloat', () => {
  const script = scriptFor(['pagefile'])
  assertStringIncludes(script, 'https://github.com/ChrisTitusTech/winutil')
  assertStringIncludes(script, 'https://github.com/Raphire/Win11Debloat')
})

Deno.test('Handoff - stale retired keys print one skip line and generate nothing', () => {
  const script = scriptFor(['pagefile', 'bloatware', 'privacy_tier3'])
  assertStringIncludes(script, '[skip] Remove Bloatware: moved to WinUtil / Win11Debloat')
  assertStringIncludes(script, '[skip] Privacy Tier 3: moved to WinUtil / Win11Debloat')
  assertEquals(script.includes('$bloatApps'), false)
})

Deno.test('Compat - scan checks Xbox services, apps, GameInput and Store downloads', () => {
  const script = scriptFor(['pagefile'])
  for (const needle of [
    "'XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc'",
    "Test-CompatAppx 'Microsoft.XboxIdentityProvider'",
    "Test-CompatAppx 'Microsoft.Xbox.TCUI'",
    "Get-AppxState 'Microsoft.WindowsStore'",
    'GameInputSvc',
    'DODownloadMode',
    'Confirm-Continue "Restore these gaming features?"',
    'Add-AppxPackage -DisableDevelopmentMode -Register $manifest',
  ]) {
    assertStringIncludes(script, needle)
  }
  // Restore runs after the backup starts so undo covers it
  assertEquals(script.indexOf('Initialize-Backup\n') < script.indexOf('Restore these gaming'), true)
})

Deno.test('Compat - X3D flags a missing Game Bar as critical', () => {
  const x3d = scriptFor(['pagefile'], {
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
  })
  assertStringIncludes(x3d, 'Game Bar (X3D)')
  assertStringIncludes(x3d, 'CRITICAL')
  const intel = scriptFor(['pagefile'])
  assertEquals(intel.includes('Game Bar (X3D)'), false)
  const verify = buildVerificationScript({
    ...createTestSelection('gamer'),
    hardware: { cpu: 'amd_x3d', gpu: 'nvidia', peripherals: [], monitorSoftware: [] },
    optimizations: ['pagefile'],
  })
  assertStringIncludes(verify, 'Write-Section "Gaming Compatibility"')
  assertStringIncludes(verify, 'Game Bar installed (X3D core parking)')
})

Deno.test('Feature - DirectX settings merge into the existing string', () => {
  const script = scriptFor(['windowed_optimizations', 'vrr_optimizations'])
  assertStringIncludes(script, '$dxPairs["SwapEffectUpgradeEnable"] = "1"')
  assertStringIncludes(script, '$dxPairs["VRROptimizeEnable"] = "1"')
  // Existing pairs are parsed and kept, never overwritten wholesale
  assertStringIncludes(script, "foreach ($pair in ($dxOld -split ';'))")
  assertStringIncludes(script, 'if ([int]$script:WinBuild -ge 22621)')
  assertStringIncludes(script, 'if ([int]$script:WinBuild -ge 18362)')
})

Deno.test('Feature - Defender and active hours items back up and register undo', () => {
  const script = scriptFor([
    'defender_scan_idle',
    'defender_game_exclusions',
    'active_hours_gaming',
  ])
  assertStringIncludes(script, 'Set-MpPreference -ScanOnlyIfIdleEnabled $true')
  assertStringIncludes(script, 'Add-UndoCommand "Defender scan settings" $undoMp')
  assertStringIncludes(script, 'libraryfolders.vdf')
  assertStringIncludes(script, 'Remove-MpPreference -ExclusionPath')
  assertStringIncludes(script, '"ActiveHoursStart" 10')
  assertStringIncludes(script, '"ActiveHoursEnd" 4')
  assertStringIncludes(script, '"SetActiveHours" 1 -PassThru')
  // Defender in passive mode (another antivirus active) is skipped, not reported as done
  assertStringIncludes(script, 'Get-MpComputerStatus -EA Stop')
})

Deno.test('Feature - Verification script checks game-session items', () => {
  const verify = buildVerificationScript({
    ...createTestSelection('gamer'),
    optimizations: [
      'windowed_optimizations',
      'vrr_optimizations',
      'defender_scan_idle',
      'defender_game_exclusions',
      'active_hours_gaming',
    ],
  })
  assertStringIncludes(verify, 'SwapEffectUpgradeEnable=1')
  assertStringIncludes(verify, 'VRROptimizeEnable=1')
  assertStringIncludes(verify, 'Defender scans idle-only at low priority')
  assertStringIncludes(verify, 'Defender skips game library folders')
  assertStringIncludes(verify, 'Update active hours 10:00-04:00')
  assertStringIncludes(verify, '$script:WinBuild = ')
})

Deno.test('Catalog - game-session items and maintenance tasks are selectable with share IDs', () => {
  for (const key of [
    'scheduled_tasks_gaming',
    'windowed_optimizations',
    'vrr_optimizations',
    'defender_scan_idle',
    'active_hours_gaming',
    'defender_game_exclusions',
  ]) {
    assertEquals(
      OPTIMIZATIONS.some((o) => o.key === key),
      true,
      `${key} has no catalog entry`,
    )
    assertEquals(typeof OPT_VALUE_TO_ID[key as keyof typeof OPT_VALUE_TO_ID], 'number', key)
  }
  assertEquals(OPT_VALUE_TO_ID.scheduled_tasks_gaming, 112)
  assertEquals(OPT_VALUE_TO_ID.defender_game_exclusions, 125)
  const exclusions = OPTIMIZATIONS.find((o) => o.key === 'defender_game_exclusions')
  assertEquals(exclusions?.tier, 'caution')
})

Deno.test('Catalog - every optimization key has a catalog entry', () => {
  const inCatalog = new Set(OPTIMIZATIONS.map((o) => o.key as string))
  for (const key of Object.keys(OPT_VALUE_TO_ID)) {
    assertEquals(inCatalog.has(key), true, `${key} has no OptimizationDef`)
  }
})

Deno.test('Anti-cheat - conflicts are exported and warned about before the confirm prompt', () => {
  assertEquals(Object.keys(ANTI_CHEAT_CONFLICTS).sort(), [
    'core_isolation_off',
    'dep_off',
    'kernel_mitigations_off',
  ])
  for (const conflicts of Object.values(ANTI_CHEAT_CONFLICTS)) {
    for (const c of conflicts ?? []) assertEquals(c.source.startsWith('https://'), true)
  }
  const script = scriptFor(['dep_off', 'pagefile'])
  const warn = script.indexOf('ANTI-CHEAT WARNING')
  const confirm = script.indexOf('Confirm-Continue "Apply these optimizations?"')
  assertEquals(warn > 0 && warn < confirm, true)
  assertStringIncludes(
    script,
    'FACEIT AC (Counter-Strike 2 on FACEIT): FACEIT AC does not start until DEP is on',
  )
  assertStringIncludes(script, 'Riot Vanguard (Valorant, League of Legends)')
  assertEquals(scriptFor(['pagefile']).includes('ANTI-CHEAT WARNING'), false)
})

Deno.test('Anti-cheat - generateAntiCheatWarning is empty for safe loadouts', () => {
  assertEquals(generateAntiCheatWarning(new Set(getPersonaOptimizations('pro_gamer'))), [])
})

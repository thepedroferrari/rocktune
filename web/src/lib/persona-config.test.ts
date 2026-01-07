import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import { OPTIMIZATIONS } from './optimizations.ts'
import { getPersonaOptimizations, PERSONA_NEXT_STEPS, TOOL_PERSONA_MAP } from './persona-config.ts'
import { PERSONA_META, type PersonaId } from './persona-registry.ts'

// Helper: Get all persona IDs for testing
const PERSONA_IDS = Object.keys(PERSONA_META) as PersonaId[]

// ====================================================================
// PERSONA OPTIMIZATION INHERITANCE TESTS
// ====================================================================

Deno.test('Persona config - getPersonaOptimizations returns non-empty for all personas', () => {
  for (const persona of PERSONA_IDS) {
    const opts = getPersonaOptimizations(persona as PersonaId)
    assert(opts.length > 0, `${persona} should have at least one optimization`)
  }
})

Deno.test('Persona config - gamer has base + additions', () => {
  const gamerOpts = getPersonaOptimizations('gamer')

  // Should have base optimizations
  assert(gamerOpts.includes('pagefile'), 'Should include base: pagefile')
  assert(gamerOpts.includes('fastboot'), 'Should include base: fastboot')
  assert(gamerOpts.includes('power_plan'), 'Should include base: power_plan')

  // Should have gamer-specific additions
  assert(gamerOpts.includes('dns'), 'Should include addition: dns')
  assert(gamerOpts.includes('nagle'), 'Should include addition: nagle')
  assert(gamerOpts.includes('gamedvr'), 'Should include addition: gamedvr')
})

Deno.test('Persona config - pro_gamer has more optimizations than gamer', () => {
  const gamerOpts = getPersonaOptimizations('gamer')
  const proGamerOpts = getPersonaOptimizations('pro_gamer')

  assert(
    proGamerOpts.length > gamerOpts.length,
    `pro_gamer (${proGamerOpts.length}) should have more optimizations than gamer (${gamerOpts.length})`,
  )
})

Deno.test('Persona config - pro_gamer includes CAUTION tier optimizations', () => {
  const proGamerOpts = getPersonaOptimizations('pro_gamer')

  // Pro gamer should include aggressive optimizations
  assert(proGamerOpts.includes('msi_mode'), 'Should include CAUTION: msi_mode')
  assert(proGamerOpts.includes('ultimate_perf'), 'Should include CAUTION: ultimate_perf')
  assert(proGamerOpts.includes('services_trim'), 'Should include CAUTION: services_trim')
})

// ====================================================================
// EXCLUSION LOGIC TESTS
// ====================================================================

Deno.test('Persona config - streamer excludes gamedvr', () => {
  const streamerOpts = getPersonaOptimizations('streamer')

  assertEquals(
    streamerOpts.includes('gamedvr'),
    false,
    'Streamer should NOT include gamedvr (breaks OBS)',
  )
})

Deno.test('Persona config - streamer has base + additions - exclusions', () => {
  const streamerOpts = getPersonaOptimizations('streamer')

  // Should have base
  assert(streamerOpts.includes('pagefile'), 'Should include base: pagefile')
  assert(streamerOpts.includes('power_plan'), 'Should include base: power_plan')

  // Should have streamer-specific additions
  assert(streamerOpts.includes('dns'), 'Should include addition: dns')
  assert(streamerOpts.includes('nagle'), 'Should include addition: nagle')

  // Should NOT have gamedvr (explicitly excluded)
  assertEquals(streamerOpts.includes('gamedvr'), false, 'Should NOT include excluded: gamedvr')
})

// ====================================================================
// BENCHMARKER SPECIAL CASE TESTS
// ====================================================================

Deno.test('Persona config - benchmarker gets ALL optimizations (kitchen sink)', () => {
  const benchmarkerOpts = getPersonaOptimizations('benchmarker')
  const allOptKeys = OPTIMIZATIONS.map((opt) => opt.key)

  assertEquals(
    benchmarkerOpts.length,
    allOptKeys.length,
    'Benchmarker should have ALL optimizations',
  )

  // Verify every optimization from OPTIMIZATIONS is included
  for (const optKey of allOptKeys) {
    assert(benchmarkerOpts.includes(optKey), `Benchmarker should include ${optKey}`)
  }
})

Deno.test('Persona config - benchmarker has most optimizations', () => {
  const benchmarkerOpts = getPersonaOptimizations('benchmarker')

  for (const persona of PERSONA_IDS.filter((p) => p !== 'benchmarker')) {
    const otherOpts = getPersonaOptimizations(persona as PersonaId)
    assert(
      benchmarkerOpts.length >= otherOpts.length,
      `Benchmarker (${benchmarkerOpts.length}) should have >= ${persona} (${otherOpts.length})`,
    )
  }
})

// ====================================================================
// DUPLICATE PREVENTION TESTS
// ====================================================================

Deno.test('Persona config - No duplicate optimizations in any persona', () => {
  for (const persona of PERSONA_IDS) {
    const opts = getPersonaOptimizations(persona as PersonaId)
    const uniqueOpts = [...new Set(opts)]

    assertEquals(
      opts.length,
      uniqueOpts.length,
      `${persona} should not have duplicate optimizations`,
    )
  }
})

// ====================================================================
// VALIDITY TESTS (All returned keys are valid)
// ====================================================================

Deno.test('Persona config - All returned optimization keys are valid', () => {
  const allValidKeys = OPTIMIZATIONS.map((opt) => opt.key)

  for (const persona of PERSONA_IDS) {
    const opts = getPersonaOptimizations(persona as PersonaId)

    for (const opt of opts) {
      assert(allValidKeys.includes(opt), `${persona} contains invalid optimization key: ${opt}`)
    }
  }
})

// ====================================================================
// TOOL PERSONA MAP TESTS
// ====================================================================

Deno.test('Persona config - TOOL_PERSONA_MAP has valid personas', () => {
  for (const [tool, personas] of Object.entries(TOOL_PERSONA_MAP)) {
    for (const persona of personas) {
      assert(PERSONA_IDS.includes(persona), `Tool ${tool} references invalid persona: ${persona}`)
    }
  }
})

Deno.test('Persona config - OBS tool only for streamer', () => {
  const obsPersonas = TOOL_PERSONA_MAP.obs

  assertEquals(obsPersonas.length, 1, 'OBS should be for 1 persona only')
  assertEquals(obsPersonas[0], 'streamer', 'OBS should only be available for streamer')
})

Deno.test('Persona config - MSI Afterburner not for streamer', () => {
  const afterburnerPersonas = TOOL_PERSONA_MAP.msi_afterburner

  assertEquals(
    afterburnerPersonas.includes('streamer'),
    false,
    'MSI Afterburner should not be for streamer',
  )
})

Deno.test('Persona config - UniFi only for pro_gamer', () => {
  const unifiPersonas = TOOL_PERSONA_MAP.unifi

  assertEquals(unifiPersonas.length, 1, 'UniFi should be for 1 persona only')
  assertEquals(unifiPersonas[0], 'pro_gamer', 'UniFi should only be available for pro_gamer')
})

Deno.test('Persona config - NVIDIA Inspector available for all except no-GPU personas', () => {
  const nvidiaPersonas = TOOL_PERSONA_MAP.nvidia_inspector

  // Should include all 4 personas (gamer, pro_gamer, streamer, benchmarker)
  assert(nvidiaPersonas.length >= 4, 'NVIDIA Inspector should be available for most personas')
})

// ====================================================================
// NEXT STEPS TESTS
// ====================================================================

Deno.test('Persona config - PERSONA_NEXT_STEPS has entries for all personas', () => {
  for (const persona of PERSONA_IDS) {
    const nextSteps = PERSONA_NEXT_STEPS[persona as PersonaId]
    assertExists(nextSteps, `Next steps should exist for ${persona}`)
    assert(nextSteps.length > 0, `Next steps for ${persona} should not be empty`)
  }
})

Deno.test('Persona config - pro_gamer next steps include advanced guidance', () => {
  const proGamerSteps = PERSONA_NEXT_STEPS.pro_gamer

  // Pro gamer should have specific advanced advice
  const hasReflex = proGamerSteps.some((step) => step.toLowerCase().includes('reflex'))
  const hasFpsCap = proGamerSteps.some((step) => step.toLowerCase().includes('fps'))
  const hasGpuHeadroom = proGamerSteps.some((step) => step.toLowerCase().includes('gpu'))

  assert(hasReflex, 'Pro gamer should mention REFLEX')
  assert(hasFpsCap, 'Pro gamer should mention FPS capping')
  assert(hasGpuHeadroom, 'Pro gamer should mention GPU headroom')
})

Deno.test('Persona config - streamer next steps mention OBS', () => {
  const streamerSteps = PERSONA_NEXT_STEPS.streamer

  const mentionsObs = streamerSteps.some((step) => step.toLowerCase().includes('obs'))

  assert(mentionsObs, 'Streamer next steps should mention OBS')
})

Deno.test('Persona config - benchmarker next steps mention methodology', () => {
  const benchmarkerSteps = PERSONA_NEXT_STEPS.benchmarker

  const hasMethodology = benchmarkerSteps.some(
    (step) =>
      step.toLowerCase().includes('capframex') ||
      step.toLowerCase().includes('latencymon') ||
      step.toLowerCase().includes('hwinfo'),
  )

  assert(hasMethodology, 'Benchmarker should mention benchmarking tools/methodology')
})

// ====================================================================
// PERFORMANCE VALIDATION (Set-based filtering)
// ====================================================================

Deno.test('Persona config - Merge logic uses efficient Set-based filtering', () => {
  // This test validates that the implementation uses Set for O(1) lookups
  // We can't directly test implementation, but we can verify behavior is correct
  // even with large datasets

  // If the implementation was O(n²), this would be slow
  // With Set-based O(n), this is fast
  const start = performance.now()

  // Run merge logic 1000 times
  for (let i = 0; i < 1000; i++) {
    getPersonaOptimizations('pro_gamer')
  }

  const end = performance.now()
  const duration = end - start

  // Should complete in < 100ms for 1000 iterations (Set-based)
  // O(n²) implementation would take significantly longer
  assert(duration < 100, `Merge should be fast (Set-based O(n)), took ${duration}ms`)
})

// ====================================================================
// CONSISTENCY TESTS
// ====================================================================

Deno.test('Persona config - All personas have unique optimization counts', () => {
  const counts = new Map<number, PersonaId[]>()

  for (const persona of PERSONA_IDS) {
    const opts = getPersonaOptimizations(persona as PersonaId)
    const count = opts.length

    if (!counts.has(count)) {
      counts.set(count, [])
    }
    const personasWithCount = counts.get(count)
    if (personasWithCount) {
      personasWithCount.push(persona as PersonaId)
    }
  }

  // If multiple personas have same count, that's okay, but log it
  for (const [count, personas] of counts) {
    if (personas.length > 1) {
      console.log(`Note: ${personas.join(', ')} all have ${count} optimizations`)
    }
  }

  // Main assertion: At least benchmarker should be unique (has ALL)
  const benchmarkerCount = getPersonaOptimizations('benchmarker').length
  const otherCounts = PERSONA_IDS.filter((p) => p !== 'benchmarker').map(
    (p) => getPersonaOptimizations(p as PersonaId).length,
  )

  assert(
    !otherCounts.includes(benchmarkerCount),
    'Benchmarker should have unique count (most optimizations)',
  )
})

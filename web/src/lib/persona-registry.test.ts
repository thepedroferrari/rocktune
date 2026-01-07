import { assertEquals, assertExists } from 'jsr:@std/assert@1'
import type { PersonaId } from './persona-registry.ts'
import { isPersonaId, PERSONA_META } from './persona-registry.ts'

// ====================================================================
// BASIC LOADING & STRUCTURE
// ====================================================================

Deno.test('Persona registry - All personas from JSON loaded', () => {
  const personaIds = Object.keys(PERSONA_META) as PersonaId[]
  assertEquals(personaIds.length, 4, 'Should have exactly 4 personas')
  assertEquals(Object.keys(PERSONA_META).length, 4, 'PERSONA_META should have 4 entries')
})

Deno.test('Persona registry - IDs match expected', () => {
  // Order might vary, so we check for set equality
  const expected = ['gamer', 'pro_gamer', 'streamer', 'benchmarker']
  const actual = Object.keys(PERSONA_META) as PersonaId[]

  assertEquals(actual.sort(), expected.sort(), 'Persona IDs should match expected')
})

// ====================================================================
// METADATA VALIDATION
// ====================================================================

Deno.test('Persona registry - Metadata available for all personas', () => {
  const personaIds = Object.keys(PERSONA_META) as PersonaId[]
  for (const id of personaIds) {
    const meta = PERSONA_META[id]
    assertExists(meta, `Metadata should exist for ${id}`)
    assertExists(meta.display_name, `Display name should exist for ${id}`)
    assertExists(meta.best_for, `Best for description should exist for ${id}`)
    assertExists(meta.card_badge, `Card badge should exist for ${id}`)
    assertExists(meta.card_icon, `Card icon should exist for ${id}`)
    assertExists(meta.mindset, `Mindset should exist for ${id}`)
  }
})

Deno.test('Persona registry - All personas have required fields', () => {
  for (const persona of Object.values(PERSONA_META)) {
    assertExists(persona.id, 'Persona should have id')
    assertExists(persona.display_name, 'Persona should have display_name')
    assertExists(persona.risk, 'Persona should have risk level')
    assertEquals(typeof persona.intensity, 'number', 'Persona should have numeric intensity')
    assertExists(persona.primary_goals, 'Persona should have primary_goals array')
    assertExists(persona.recommended_software, 'Persona should have recommended_software')
  }
})

// ====================================================================
// TYPE GUARDS
// ====================================================================

Deno.test('Persona registry - isPersonaId returns true for valid IDs', () => {
  assertEquals(isPersonaId('gamer'), true)
  assertEquals(isPersonaId('pro_gamer'), true)
  assertEquals(isPersonaId('streamer'), true)
  assertEquals(isPersonaId('benchmarker'), true)
})

Deno.test('Persona registry - isPersonaId returns false for invalid IDs', () => {
  assertEquals(isPersonaId('invalid'), false)
  assertEquals(isPersonaId(''), false)
  assertEquals(isPersonaId(null), false)
  assertEquals(isPersonaId(undefined), false)
  assertEquals(isPersonaId(123), false)
})

// ====================================================================
// TYPE SAFETY (COMPILE-TIME CHECKS)
// ====================================================================

Deno.test('Persona registry - Type safety is enforced at runtime', () => {
  // This test verifies that invalid persona IDs are caught
  // TypeScript should prevent invalid IDs at compile time in strict mode
  // But we verify runtime guards also work

  // Runtime check via isPersonaId should catch invalid values
  assertEquals(isPersonaId('invalid'), false)
  assertEquals(isPersonaId('definitely_not_valid'), false)

  // Valid personas should pass
  assertEquals(isPersonaId('gamer'), true)
  assertEquals(isPersonaId('pro_gamer'), true)
})

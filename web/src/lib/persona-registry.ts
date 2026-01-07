import { z } from 'zod'
import personasDoc from '../../docs/personas.json' with { type: 'json' }

/**
 * SINGLE SOURCE OF TRUTH: Persona Registry
 *
 * This module validates personas.json at runtime and extracts TypeScript types.
 * All other modules should import PersonaId from here, not define it themselves.
 *
 * Key design: personas.json → Zod validation → TypeScript types (not vice versa)
 */

// ====================================================================
// ZOD SCHEMAS
// ====================================================================

const PersonaSoftwareSchema = z.object({
  key: z.string(),
  reason: z.string(),
})

const PersonaSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  card_badge: z.string(),
  card_icon: z.string(),
  card_blurb: z.string(),
  best_for: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  intensity: z.number(),
  overhead_label: z.string(),
  latency_label: z.string(),
  mindset: z.string(),
  primary_goals: z.array(z.string()),
  constraints: z.array(z.string()),
  recommended_software: z.array(PersonaSoftwareSchema),
  optional_software: z.array(PersonaSoftwareSchema),
  avoid_software: z.array(PersonaSoftwareSchema),
})

const PersonaDocSchema = z.object({
  meta: z.object({
    version: z.string(),
    source: z.string(),
    philosophy: z.string(),
  }),
  personas: z.array(PersonaSchema),
})

// ====================================================================
// RUNTIME VALIDATION
// ====================================================================

// Parse and validate at module load time
const validated = PersonaDocSchema.parse(personasDoc)

// ====================================================================
// EXPORTED CONSTANTS & TYPES
// ====================================================================

/**
 * Array of all persona IDs from personas.json
 * Example: ['pro_gamer', 'gamer', 'streamer', 'benchmarker']
 * Internal use only - use Object.keys(PERSONA_META) for external access
 */
const PERSONA_IDS = validated.personas.map((p) => p.id) as readonly string[]

/**
 * Persona ID union type - auto-generated from JSON
 * Example: 'gamer' | 'pro_gamer' | 'streamer' | 'benchmarker'
 */
export type PersonaId = (typeof PERSONA_IDS)[number]

/**
 * Inferred persona type from Zod schema
 */
export type Persona = z.infer<typeof PersonaSchema>

/**
 * Metadata record: persona ID → full persona object
 * Enables O(1) lookup by persona ID
 */
export const PERSONA_META: Record<PersonaId, Persona> = Object.fromEntries(
  validated.personas.map((p) => [p.id as PersonaId, p]),
) as Record<PersonaId, Persona>

// ====================================================================
// TYPE GUARDS & PREDICATES
// ====================================================================

/**
 * Type guard: Check if value is a string
 * Extracted predicate following AlgoExpert principle: "Extract the eligibility predicate"
 */
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Predicate: Check if string is a known persona ID
 * O(n) time where n = number of personas (currently 4, so effectively O(1))
 */
function isKnownPersonaId(id: string): boolean {
  return PERSONA_IDS.includes(id)
}

/**
 * Check if a value is a valid PersonaId
 * Type guard for runtime validation
 *
 * Composed of two predicates:
 * 1. isString - Type check
 * 2. isKnownPersonaId - Value check
 */
export function isPersonaId(value: unknown): value is PersonaId {
  return isString(value) && isKnownPersonaId(value)
}

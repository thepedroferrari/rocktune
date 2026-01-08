/**
 * Type-safe section ID system with branded types
 *
 * This module provides compile-time safety for section IDs used throughout
 * the application, particularly for persona-specific sections in config
 * generation and manual steps.
 *
 * Benefits:
 * - Prevents mixing plain strings with section IDs
 * - Template literal types for validation
 * - Type-safe builders prevent typos
 * - Parser extracts persona from section IDs
 */

import type { PersonaId } from './persona-registry'

// ====================================================================
// BRANDED TYPE (Prevents string mixing)
// ====================================================================

/**
 * Branded type for section IDs
 * Prevents accidentally using plain strings where section IDs are expected
 */
declare const SectionIdBrand: unique symbol
export type SectionId = string & { readonly [SectionIdBrand]: 'SectionId' }

// ====================================================================
// SECTION PREFIXES (Exhaustive list)
// ====================================================================

/**
 * All section prefixes used in the application
 * Add new prefixes here when creating new sections
 */
export const SECTION_PREFIXES = {
  // GPU vendor sections
  NVIDIA: 'nvidia',
  AMD: 'amd',
  GPU_TUNING: 'gpu-tuning',

  // OBS streaming sections
  OBS_OUTPUT: 'obs-output',
  OBS_VIDEO: 'obs-video',
  OBS_ADVANCED: 'obs-advanced',
  OBS_SOURCES: 'obs-sources',

  // Cooling sections
  COOLING_ADVANCED: 'cooling-advanced',
  COOLING_SOFTWARE: 'cooling-software',

  // Network sections
  UBIQUITI_GAMING: 'ubiquiti-gaming',

  // Software sections
  DISCORD: 'discord',
  STEAM: 'steam',
} as const

export type SectionPrefix = (typeof SECTION_PREFIXES)[keyof typeof SECTION_PREFIXES]

// ====================================================================
// TYPE-SAFE BUILDERS
// ====================================================================

/**
 * Build a persona-specific section ID
 * Example: buildPersonaSectionId('nvidia', 'gamer') → 'nvidia-gamer'
 *
 * @param prefix - Section prefix from SECTION_PREFIXES
 * @param persona - Valid PersonaId
 * @returns Type-safe SectionId
 */
export function buildPersonaSectionId(prefix: string, persona: PersonaId): SectionId {
  return `${prefix}-${persona}` as SectionId
}

/**
 * Build a generic section ID (no persona suffix)
 * Example: buildSectionId('discord') → 'discord'
 *
 * @param id - Section identifier
 * @returns Type-safe SectionId
 */
export function buildSectionId(id: string): SectionId {
  return id as SectionId
}

// ====================================================================
// TEMPLATE LITERAL TYPES (Compile-time validation)
// ====================================================================

/**
 * Template literal type for persona-specific section IDs
 * Ensures compile-time validation of section ID format
 *
 * Valid: 'nvidia-gamer', 'amd-pro_gamer'
 * Invalid: 'nvidia', 'gamer-nvidia'
 */
export type PersonaSectionId = `${string}-${PersonaId}`

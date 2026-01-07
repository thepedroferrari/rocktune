import { assertEquals } from 'jsr:@std/assert@1'
import type { SectionId } from './section-ids.ts'
import { buildPersonaSectionId, buildSectionId, SECTION_PREFIXES } from './section-ids.ts'

// ====================================================================
// SECTION ID BUILDERS
// ====================================================================

Deno.test('Section IDs - buildPersonaSectionId creates valid format', () => {
  assertEquals(buildPersonaSectionId(SECTION_PREFIXES.NVIDIA, 'gamer'), 'nvidia-gamer')
  assertEquals(buildPersonaSectionId(SECTION_PREFIXES.AMD, 'pro_gamer'), 'amd-pro_gamer')
  assertEquals(
    buildPersonaSectionId(SECTION_PREFIXES.OBS_OUTPUT, 'streamer'),
    'obs-output-streamer',
  )
})

Deno.test('Section IDs - buildSectionId creates generic section ID', () => {
  assertEquals(buildSectionId('discord'), 'discord' as SectionId)
  assertEquals(buildSectionId('steam'), 'steam' as SectionId)
  assertEquals(buildSectionId('cooling-advanced'), 'cooling-advanced' as SectionId)
})

// ====================================================================
// SECTION PREFIXES VALIDATION
// ====================================================================

Deno.test('Section IDs - SECTION_PREFIXES contains expected prefixes', () => {
  assertEquals(SECTION_PREFIXES.NVIDIA, 'nvidia')
  assertEquals(SECTION_PREFIXES.AMD, 'amd')
  assertEquals(SECTION_PREFIXES.GPU_TUNING, 'gpu-tuning')
  assertEquals(SECTION_PREFIXES.OBS_OUTPUT, 'obs-output')
  assertEquals(SECTION_PREFIXES.OBS_VIDEO, 'obs-video')
  assertEquals(SECTION_PREFIXES.OBS_ADVANCED, 'obs-advanced')
  assertEquals(SECTION_PREFIXES.OBS_SOURCES, 'obs-sources')
  assertEquals(SECTION_PREFIXES.COOLING_ADVANCED, 'cooling-advanced')
  assertEquals(SECTION_PREFIXES.UBIQUITI_GAMING, 'ubiquiti-gaming')
  assertEquals(SECTION_PREFIXES.DISCORD, 'discord')
  assertEquals(SECTION_PREFIXES.STEAM, 'steam')
})

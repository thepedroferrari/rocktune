/**
 * Build decoder for Netlify Edge Functions
 * Simplified version of share.ts decoder for server-side use
 */

import { decompressFromEncodedURIComponent } from 'https://esm.sh/lz-string@1.5.0'

/**
 * Decoded build data for OG image generation
 */
export interface DecodedBuildData {
  cpu: string
  gpu: string
  preset: string | null
  presetLabel: string
  presetSubtitle: string
  presetRarity: string
  optimizationCount: number
  packageCount: number
  highlights: string[]
}

/**
 * CPU/GPU labels
 */
const CPU_LABELS: Record<number, string> = {
  1: 'AMD X3D',
  2: 'AMD',
  3: 'Intel',
}

const GPU_LABELS: Record<number, string> = {
  1: 'NVIDIA',
  2: 'AMD',
  3: 'Intel',
}

/**
 * Preset metadata
 */
const PRESET_META: Record<
  number,
  {
    id: string
    label: string
    subtitle: string
    rarity: string
    highlights: string[]
  }
> = {
  1: {
    id: 'benchmarker',
    label: 'Benchmarker',
    subtitle: 'Full telemetry runs',
    rarity: 'legendary',
    highlights: ['Full telemetry', 'Repeatable runs', 'Deep diagnostics'],
  },
  2: {
    id: 'pro_gamer',
    label: 'Pro Gamer',
    subtitle: 'Match focus',
    rarity: 'epic',
    highlights: ['Lower input lag', 'Stable frame times', 'Minimal background noise'],
  },
  3: {
    id: 'streamer',
    label: 'Streamer',
    subtitle: 'Capture-ready',
    rarity: 'rare',
    highlights: ['Capture-safe performance', 'Clean audio chain', 'Smooth frame pacing'],
  },
  4: {
    id: 'gamer',
    label: 'Gamer',
    subtitle: 'Balanced build',
    rarity: 'uncommon',
    highlights: ['Smoother frame times', 'Stable daily driver', 'Low overhead'],
  },
}

const DEFAULT_HIGHLIGHTS = ['Lower input lag', 'Smoother frame times', 'Cleaner background load']

/**
 * Decode build from URL query parameter
 */
export function decodeBuildFromQuery(
  param: string,
): { success: true; data: DecodedBuildData } | { success: false; error: string } {
  try {
    // Remove 'b=' prefix if present
    let cleanParam = param
    if (cleanParam.startsWith('b=')) {
      cleanParam = cleanParam.slice(2)
    }

    // Parse version
    const dotIndex = cleanParam.indexOf('.')
    if (dotIndex === -1) {
      return { success: false, error: 'Invalid format: missing version' }
    }

    const version = Number.parseInt(cleanParam.slice(0, dotIndex), 10)
    if (version !== 1) {
      return { success: false, error: `Unsupported version: ${version}` }
    }

    // Decompress data
    const compressed = cleanParam.slice(dotIndex + 1)
    const json = decompressFromEncodedURIComponent(compressed)
    if (!json) {
      return { success: false, error: 'Failed to decompress data' }
    }

    // Parse JSON
    const data = JSON.parse(json) as {
      v: number
      c?: number
      g?: number
      r?: number
      o?: number[]
      s?: string[]
    }

    // Extract data with defaults
    const cpuId = data.c ?? 1
    const gpuId = data.g ?? 1
    const presetId = data.r
    const optimizationCount = data.o?.length ?? 0
    const packageCount = data.s?.length ?? 0

    // Get preset metadata
    let preset: string | null = null
    let presetLabel = 'Custom Build'
    let presetSubtitle = 'Personalized loadout'
    let presetRarity = 'common'
    let highlights = DEFAULT_HIGHLIGHTS

    if (presetId && PRESET_META[presetId]) {
      const meta = PRESET_META[presetId]
      preset = meta.id
      presetLabel = meta.label
      presetSubtitle = meta.subtitle
      presetRarity = meta.rarity
      highlights = meta.highlights
    }

    return {
      success: true,
      data: {
        cpu: CPU_LABELS[cpuId] ?? 'AMD X3D',
        gpu: GPU_LABELS[gpuId] ?? 'NVIDIA',
        preset,
        presetLabel,
        presetSubtitle,
        presetRarity,
        optimizationCount,
        packageCount,
        highlights: highlights.slice(0, 3),
      },
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: message }
  }
}

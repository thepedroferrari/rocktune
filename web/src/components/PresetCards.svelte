<script lang="ts">
/**
 * PresetCards - Holographic preset card grid
 *
 * Displays battle profile presets with holographic card effects.
 * Each preset configures optimizations and software selections.
 */

import type { PresetType } from '$lib/types'
import type { PresetConfig } from '$lib/presets'
// biome-ignore lint/correctness/noUnusedImports: All imports are used in Svelte template
import { PRESETS, PRESET_ORDER, PRESET_META, getPresetTierBreakdown } from '$lib/presets'
// biome-ignore lint/correctness/noUnusedImports: PresetCard is used in Svelte template
import PresetCard from './PresetCard.svelte'

interface Props {
  activePreset?: PresetType | null
  onPresetSelect?: (preset: PresetType, config: PresetConfig) => void
}

// biome-ignore lint/correctness/noUnusedVariables: activePreset is used in Svelte template
const { activePreset = null, onPresetSelect }: Props = $props()

function _handleSelect(preset: PresetType) {
  onPresetSelect?.(preset, PRESETS[preset])
}
</script>

<div class="presets-scroll-container">
  <div class="presets">
    {#each PRESET_ORDER as preset (preset)}
      {@const meta = PRESET_META[preset]}
      {@const config = PRESETS[preset]}
      {@const tierBreakdown = getPresetTierBreakdown(preset)}
      <PresetCard
        {preset}
        label={meta.label}
        description={meta.description}
        bestFor={meta.bestFor}
        traits={meta.traits}
        rarity={meta.rarity}
        intensity={meta.intensity}
        riskLevel={meta.risk}
        overheadLabel={meta.overheadLabel}
        latencyLabel={meta.latencyLabel}
        softwareCount={config.software.length}
        optimizationCount={config.opts.length}
        {tierBreakdown}
        active={activePreset === preset}
        onSelect={_handleSelect}
      />
    {/each}
  </div>
</div>



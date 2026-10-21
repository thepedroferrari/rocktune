<script lang="ts">
/**
 * PresetCards - Holographic preset card grid
 *
 * Displays battle profile presets with holographic card effects.
 * Each preset configures optimizations and software selections.
 */

import type { PresetConfig } from '$lib/presets'
import { getPresetTierBreakdown, PRESET_META, PRESET_ORDER, PRESETS } from '$lib/presets'
import type { PresetType } from '$lib/types'
import PresetCard from './PresetCard.svelte'

interface Props {
  activePreset?: PresetType | null
  onPresetSelect?: (preset: PresetType, config: PresetConfig) => void
}

const { activePreset = null, onPresetSelect }: Props = $props()

function handleSelect(preset: PresetType) {
  onPresetSelect?.(preset, PRESETS[preset])
}

/** Roving tabindex: the checked radio, or the first one when none is checked, is the tab stop. */
const tabStop = $derived(activePreset ?? PRESET_ORDER[0])

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown'])
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp'])

/** WAI-ARIA radio group: arrow keys move focus (wrapping) and check the focused radio. */
function handleKeydown(event: KeyboardEvent) {
  const step = NEXT_KEYS.has(event.key) ? 1 : PREV_KEYS.has(event.key) ? -1 : 0
  if (step === 0) return
  const group = event.currentTarget as HTMLElement
  const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
  const current = radios.indexOf(document.activeElement as HTMLElement)
  if (current === -1) return
  event.preventDefault()
  const next = radios[(current + step + radios.length) % radios.length]
  next.focus()
  const preset = next.dataset.preset as PresetType | undefined
  if (preset) handleSelect(preset)
}
</script>

<div class="presets-scroll-container">
  <div class="presets" role="radiogroup" aria-label="Preset selection" tabindex="-1" onkeydown={handleKeydown}>
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
        tabbable={tabStop === preset}
        onSelect={handleSelect}
      />
    {/each}
  </div>
</div>

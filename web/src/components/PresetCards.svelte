<script lang="ts">
  /**
   * PresetCards - Holographic preset card grid
   *
   * Displays battle profile presets with holographic card effects.
   * Each preset configures optimizations and software selections.
   */

  import PresetCard from "./PresetCard.svelte";
  import type { PresetType } from "$lib/types";
  import type { PresetConfig } from "$lib/presets";
  import { PRESET_META, PRESET_ORDER, PRESETS } from "$lib/presets";

  interface Props {
    activePreset?: PresetType | null;
    onPresetSelect?: (preset: PresetType, config: PresetConfig) => void;
  }

  let { activePreset = null, onPresetSelect }: Props = $props();

  function handleSelect(preset: PresetType) {
    onPresetSelect?.(preset, PRESETS[preset]);
  }
</script>

<div class="presets-scroll-container">
  <div class="presets">
    {#each PRESET_ORDER as preset (preset)}
      {@const meta = PRESET_META[preset]}
      {@const config = PRESETS[preset]}
      <PresetCard
        {preset}
        label={meta.label}
        description={meta.description}
        rarity={meta.rarity}
        intensity={meta.intensity}
        riskLevel={meta.risk}
        overheadLabel={meta.overheadLabel}
        latencyLabel={meta.latencyLabel}
        softwareCount={config.software.length}
        optimizationCount={config.opts.length}
        active={activePreset === preset}
        onSelect={handleSelect}
      />
    {/each}
  </div>
</div>

<style>
  .presets-scroll-container {
    width: 100%;
    padding: var(--space-sm, 0.5rem) 0 var(--space-lg, 1.5rem);
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-xl, 2rem);
    padding: var(--space-xl, 2rem) var(--space-lg, 1.5rem);
    perspective: 1200px;
    max-width: 1000px;
    margin: 0 auto;
  }

  /* When a card is active, dim others */
  .presets:has(:global(.preset-card.active))
    :global(.preset-card:not(.active)) {
    filter: grayscale(0.5) brightness(0.7);
    transform: scale(0.94);
    opacity: 0.75;
    transition: filter 0.3s ease, transform 0.3s ease, opacity 0.3s ease;
  }

  .presets:has(:global(.preset-card.active))
    :global(.preset-card:not(.active):hover) {
    filter: grayscale(0) brightness(1);
    transform: scale(1);
    opacity: 1;
  }

  @media (max-width: 1100px) {
    .presets {
      gap: var(--space-lg, 1.5rem);
      padding-left: var(--space-md, 1rem);
      padding-right: var(--space-md, 1rem);
      max-width: 900px;
    }
  }

  @media (max-width: 900px) {
    .presets {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-lg, 1.5rem);
      max-width: 500px;
    }
  }

  @media (max-width: 640px) {
    .presets {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-md, 1rem);
      padding-left: var(--space-sm, 0.5rem);
      padding-right: var(--space-sm, 0.5rem);
    }
  }
</style>

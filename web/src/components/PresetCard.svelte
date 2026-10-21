<script lang="ts">
import type { TierBreakdown } from '$lib/presets'
import type { PresetType } from '$lib/types'

interface Props {
  preset: PresetType
  label: string
  description?: string
  bestFor?: string
  rarity?: 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common'
  intensity?: number
  riskLevel?: 'low' | 'medium' | 'high'
  overheadLabel?: string
  latencyLabel?: string
  traits?: readonly string[]
  softwareCount: number
  optimizationCount?: number
  tierBreakdown?: TierBreakdown
  active?: boolean
  /** Whether this radio is the group's tab stop (roving tabindex). */
  tabbable?: boolean
  onSelect: (preset: PresetType) => void
}

const {
  preset,
  label,
  description = '',
  bestFor = '',
  rarity = 'common',
  intensity = 50,
  riskLevel = 'low',
  overheadLabel = '',
  latencyLabel = '',
  traits = [],
  softwareCount,
  optimizationCount = 0,
  tierBreakdown,
  active = false,
  tabbable = true,
  onSelect,
}: Props = $props()

const riskLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const
const riskText = $derived(
  riskLevel === 'low'
    ? preset === 'gamer' || preset === 'streamer'
      ? 'Safe'
      : preset === 'pro_gamer'
        ? 'Low'
        : riskLabels[riskLevel]
    : riskLabels[riskLevel],
)

function handleClick() {
  onSelect(preset)
}
</script>

<button
  type="button"
  class="preset-card"
  class:active
  role="radio"
  aria-checked={active}
  tabindex={tabbable ? 0 : -1}
  aria-label={label}
  data-preset={preset}
  data-rarity={rarity}
  onclick={handleClick}
>
    <div class="preset-card__front">
      <div class="preset-card__header">
        <h3 class="preset-card__title">{label}</h3>
      </div>

      <div class="preset-card__body">
        <div class="preset-card__info">
          {#if bestFor}
            <span class="info-label">Best for</span>
            <span class="info-audience">{bestFor}</span>
          {/if}
          {#if description}
            <p class="info-desc">{description}</p>
          {/if}
        </div>
      </div>

      <div class="preset-card__bar">
        <div
          class="bar-fill"
          style:--fill={`${intensity}%`}
          role="progressbar"
          aria-valuenow={intensity}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Build intensity"
        ></div>
      </div>

      <dl class="preset-card__stats">
        {#if overheadLabel}
          <dt class="stat-label">Overhead</dt>
          <dd class="stat-value">{overheadLabel}</dd>
        {/if}
        {#if latencyLabel}
          <dt class="stat-label">Latency</dt>
          <dd class="stat-value">{latencyLabel}</dd>
        {/if}
        <dt class="stat-label">Tweaks</dt>
        {#if tierBreakdown}
          <dd class="stat-value stat-value--breakdown">
            {#if tierBreakdown.risky > 0}
              <span class="tier-count tier-count--risky" title="Risky"
                >{tierBreakdown.risky}</span
              >
            {/if}
            {#if tierBreakdown.caution > 0}
              <span class="tier-count tier-count--caution" title="Caution"
                >{tierBreakdown.caution}</span
              >
            {/if}
            <span class="tier-count tier-count--safe" title="Safe"
              >{tierBreakdown.safe}</span
            >
          </dd>
        {:else}
          <dd class="stat-value">{optimizationCount}</dd>
        {/if}
        <dt class="stat-label">Software</dt>
        <dd class="stat-value">{softwareCount}</dd>
        <dt class="stat-label">Risk</dt>
        <dd class="stat-value stat-value--risk-{riskLevel}">{riskText}</dd>
      </dl>
    </div>
</button>

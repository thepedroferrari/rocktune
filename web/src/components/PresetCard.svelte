<script lang="ts">
/**
 * PresetCard - Holographic battle profile card
 *
 * Features:
 * - Spring physics for smooth 3D tilt effect
 * - Holographic shine/glare layers
 * - Rarity-based color schemes
 * - Intensity bar for risk visualization
 */

import { adjust, clamp, round, Spring, SPRING_PRESETS } from '../utils/spring'
import type { PresetType } from '$lib/types'
import type { TierBreakdown } from '$lib/presets'

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
  onSelect: (preset: PresetType) => void
}

// biome-ignore lint/correctness/noUnusedVariables: All props are used in Svelte template
const {
  preset,
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  label,
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  description = '',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  bestFor = '',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template attribute
  rarity = 'common',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  intensity = 50,
  riskLevel = 'low',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  overheadLabel = '',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  latencyLabel = '',
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  traits = [],
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  softwareCount,
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  optimizationCount = 0,
  // biome-ignore lint/correctness/noUnusedVariables: Used in template
  tierBreakdown,
  // biome-ignore lint/correctness/noUnusedVariables: Used in template attribute
  active = false,
  onSelect,
}: Props = $props()

const riskLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const
const _riskText = $derived(
  riskLevel === 'low'
    ? preset === 'gamer' || preset === 'streamer'
      ? 'Safe'
      : preset === 'pro_gamer'
        ? 'Low'
        : riskLabels[riskLevel]
    : riskLabels[riskLevel],
)

const rotator: HTMLElement | undefined = $state()
const springRotate = new Spring({ x: 0, y: 0 }, SPRING_PRESETS.INTERACTIVE)
const springGlare = new Spring({ x: 50, y: 50, o: 0 }, SPRING_PRESETS.INTERACTIVE)
const springBackground = new Spring({ x: 50, y: 50 }, SPRING_PRESETS.INTERACTIVE)

let interacting = $state(false)
let animationId: number | null = null

let _pointerX = $state('50%')
let _pointerY = $state('50%')
let _pointerFromCenter = $state('0')
let _pointerFromTop = $state('0.5')
let _pointerFromLeft = $state('0.5')
let _cardOpacity = $state('0')
let _rotateX = $state('0deg')
let _rotateY = $state('0deg')
let _backgroundX = $state('50%')
let _backgroundY = $state('50%')
let _transform = $state('')

function applyStyles() {
  const glareX = springGlare.current.x
  const glareY = springGlare.current.y
  const glareO = springGlare.current.o ?? 0

  const pfc = clamp(Math.sqrt((glareY - 50) ** 2 + (glareX - 50) ** 2) / 50, 0, 1)
  const pft = glareY / 100
  const pfl = glareX / 100

  _pointerX = `${round(glareX)}%`
  _pointerY = `${round(glareY)}%`
  _pointerFromCenter = round(pfc).toString()
  _pointerFromTop = round(pft).toString()
  _pointerFromLeft = round(pfl).toString()
  _cardOpacity = round(glareO).toString()
  _rotateX = `${round(springRotate.current.x)}deg`
  _rotateY = `${round(springRotate.current.y)}deg`
  _backgroundX = `${round(springBackground.current.x)}%`
  _backgroundY = `${round(springBackground.current.y)}%`

  _transform = `rotateY(${round(springRotate.current.x)}deg) rotateX(${round(
    springRotate.current.y,
  )}deg)`
}

function animate() {
  springRotate.update()
  springGlare.update()
  springBackground.update()
  applyStyles()

  const settled =
    springRotate.isSettled() && springGlare.isSettled() && springBackground.isSettled()

  if (!settled || interacting) {
    animationId = requestAnimationFrame(animate)
  } else {
    animationId = null
  }
}

function startAnimation() {
  if (animationId === null) {
    animationId = requestAnimationFrame(animate)
  }
}

function _handlePointerMove(e: PointerEvent) {
  if (!rotator) return
  const rect = rotator.getBoundingClientRect()

  const absolute = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }

  const percent = {
    x: clamp(round((100 / rect.width) * absolute.x)),
    y: clamp(round((100 / rect.height) * absolute.y)),
  }

  const center = {
    x: percent.x - 50,
    y: percent.y - 50,
  }

  springBackground.set({
    x: adjust(percent.x, 0, 100, 37, 63),
    y: adjust(percent.y, 0, 100, 33, 67),
  })

  springRotate.set({
    x: round(center.x / 3.5),
    y: round(-(center.y / 3.5)),
  })

  springGlare.set({
    x: round(percent.x),
    y: round(percent.y),
    o: 1,
  })

  startAnimation()
}

function _handlePointerEnter() {
  interacting = true
  const { stiffness, damping } = SPRING_PRESETS.INTERACTIVE
  springRotate.stiffness = stiffness
  springRotate.damping = damping
  springGlare.stiffness = stiffness
  springGlare.damping = damping
  springBackground.stiffness = stiffness
  springBackground.damping = damping
  startAnimation()
}

function _handlePointerLeave() {
  interacting = false
  const { stiffness, damping } = SPRING_PRESETS.GENTLE

  springRotate.stiffness = stiffness
  springRotate.damping = damping
  springRotate.set({ x: 0, y: 0 })

  springGlare.stiffness = stiffness
  springGlare.damping = damping
  springGlare.set({ x: 50, y: 50, o: 0 })

  springBackground.stiffness = stiffness
  springBackground.damping = damping
  springBackground.set({ x: 50, y: 50 })

  startAnimation()
}

function _handleClick() {
  onSelect(preset)
}

$effect(() => {
  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  }
})
</script>

<button
  type="button"
  class="preset-card"
  class:active
  class:interacting
  data-preset={preset}
  data-rarity={rarity}
  style:--pointer-x={_pointerX}
  style:--pointer-y={_pointerY}
  style:--pointer-from-center={_pointerFromCenter}
  style:--pointer-from-top={_pointerFromTop}
  style:--pointer-from-left={_pointerFromLeft}
  style:--card-opacity={_cardOpacity}
  style:--rotate-x={_rotateX}
  style:--rotate-y={_rotateY}
  style:--background-x={_backgroundX}
  style:--background-y={_backgroundY}
  onclick={_handleClick}
>
  <div
    bind:this={rotator}
    class="preset-card__rotator"
    style:transform={_transform}
    onpointermove={_handlePointerMove}
    onpointerenter={_handlePointerEnter}
    onpointerleave={_handlePointerLeave}
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
        <div class="bar-fill" style:--fill={`${intensity}%`}></div>
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
              <span class="tier-count tier-count--risky" title="Risky">{tierBreakdown.risky}</span>
            {/if}
            {#if tierBreakdown.caution > 0}
              <span class="tier-count tier-count--caution" title="Caution">{tierBreakdown.caution}</span>
            {/if}
            <span class="tier-count tier-count--safe" title="Safe">{tierBreakdown.safe}</span>
          </dd>
        {:else}
          <dd class="stat-value">{optimizationCount}</dd>
        {/if}
        <dt class="stat-label">Software</dt>
        <dd class="stat-value">{softwareCount}</dd>
        <dt class="stat-label">Risk</dt>
        <dd class="stat-value stat-value--risk-{riskLevel}">{_riskText}</dd>
      </dl>
    </div>

    
    <div class="preset-card__shine"></div>
    <div class="preset-card__glare"></div>
  </div>
</button>



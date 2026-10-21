<script lang="ts">
import type { Category, PackageKey, SoftwarePackage } from '$lib/types'
import { CATEGORY_SVG_ICONS, SIMPLE_ICONS_CDN } from '$lib/types'

interface Props {
  key: PackageKey
  pkg: SoftwarePackage
  selected: boolean
  onToggle: (key: PackageKey) => void
}

const { key, pkg, selected, onToggle }: Props = $props()

// Unique ID for checkbox-label association
const inputId = $derived(`pkg-${key}`)

type LogoType = 'sprite' | 'cdn' | 'emoji' | 'fallback'
const logoType: LogoType = $derived.by(() => {
  if (pkg.icon) {
    return pkg.icon.endsWith('.svg') || pkg.icon.startsWith('icons/') ? 'sprite' : 'cdn'
  }
  return pkg.emoji ? 'emoji' : 'fallback'
})

const spriteId = $derived(pkg.icon?.replace('icons/', '').replace('.svg', '') ?? '')
const cdnUrl = $derived(`${SIMPLE_ICONS_CDN}/${pkg.icon}/white`)

function getCategoryIcon(category: Category): string {
  return CATEGORY_SVG_ICONS[category] ?? CATEGORY_SVG_ICONS.default
}

let iconFailed = $state(false)
</script>

{#snippet renderIcon()}
  {#if logoType === "sprite"}
    <svg
      class="sprite-icon"
      aria-hidden="true"
    >
      <use href="/icons/sprite.svg#{spriteId}"></use>
    </svg>
  {:else if logoType === "cdn"}
    {#if iconFailed}
      <svg
        class="sprite-icon fallback-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <use href="/icons/sprite.svg#fallback"></use>
      </svg>
    {:else}
      <img
        src={cdnUrl}
        alt=""
        width="44"
        height="44"
        loading="lazy"
        onerror={() => { iconFailed = true }}
      />
    {/if}
  {:else if logoType === "emoji"}
    <span
      class="emoji-icon"
      aria-hidden="true">{pkg.emoji}</span
    >
  {:else}
    {@html getCategoryIcon(pkg.category)}
  {/if}
{/snippet}

<div
  class="software-card"
  class:selected
  data-key={key}
  data-category={pkg.category}
  title="{pkg.desc ?? pkg.category} (winget: {pkg.id})"
>
  <input
    type="checkbox"
    id={inputId}
    checked={selected}
    onchange={() => onToggle(key)}
    class="sr-only"
    aria-describedby="{inputId}-desc"
  />

  <label for={inputId} class="card-label">
    <figure class="logo">
      {@render renderIcon()}
    </figure>
    <span class="name">{pkg.name}</span>
    <span id="{inputId}-desc" class="sr-only">{pkg.desc ?? pkg.category}</span>
  </label>

  <span class="list-desc">{pkg.desc ?? ""}</span>
  <span class="list-category">{pkg.category}</span>
</div>

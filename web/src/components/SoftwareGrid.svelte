<script lang="ts">
import { app, getFiltered, toggleSoftware } from '$lib/state.svelte'
import type { PackageKey } from '$lib/types'
// biome-ignore lint/correctness/noUnusedImports: SoftwareCard is used in Svelte template
import SoftwareCard from './SoftwareCard.svelte'

interface Props {
  class?: string
}

// biome-ignore lint/correctness/noUnusedVariables: className used in template
const { class: className = '' }: Props = $props()

const _filtered = $derived(getFiltered())
const _selectedSet = $derived(app.selected)

const gridEl: HTMLDivElement | undefined = $state()
let columnsPerRow = $state(6)
let resizeRaf: number | null = null

$effect(() => {
  if (!gridEl) return

  let pendingWidth = 0

  const updateColumns = (gridWidth: number) => {
    const minCardWidth = 120
    const gap = 16
    const nextColumns = Math.max(1, Math.floor((gridWidth + gap) / (minCardWidth + gap)))

    if (nextColumns !== columnsPerRow) {
      columnsPerRow = nextColumns
    }
  }

  const scheduleUpdate = (gridWidth: number) => {
    pendingWidth = gridWidth
    if (resizeRaf !== null) return
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null
      updateColumns(pendingWidth)
    })
  }

  scheduleUpdate(gridEl.clientWidth)

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    scheduleUpdate(entry.contentRect.width)
  })
  observer.observe(gridEl)

  return () => {
    observer.disconnect()
    if (resizeRaf !== null) {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = null
    }
  }
})

function _getOverlayPosition(index: number): 'right' | 'left' {
  const columnIndex = index % columnsPerRow

  return columnIndex >= columnsPerRow - 2 ? 'left' : 'right'
}

function _handleToggle(key: PackageKey) {
  toggleSoftware(key)
}
</script>

<div
  bind:this={gridEl}
  id="software-grid"
  class="software-grid {className}"
  class:list-view={app.view === 'list'}
>
  {#each _filtered as [key, pkg], index (key)}
    <SoftwareCard
      {key}
      {pkg}
      selected={_selectedSet.has(key)}
      onToggle={_handleToggle}
      overlayPosition={_getOverlayPosition(index)}
    />
  {/each}

  {#if _filtered.length === 0}
    <div class="empty-state">
      {#if app.search}
        <p>No software matches "{app.search}"</p>
      {:else}
        <p>No software in this category</p>
      {/if}
    </div>
  {/if}
</div>

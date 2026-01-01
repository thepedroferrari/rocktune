<script lang="ts">
  import { app, getFiltered, toggleSoftware } from '$lib/state.svelte'
  import type { PackageKey } from '$lib/types'
  import SoftwareCard from './SoftwareCard.svelte'

  interface Props {
    class?: string
  }

  let { class: className = '' }: Props = $props()

  
  let filtered = $derived(getFiltered())
  let selectedSet = $derived(app.selected)

  
  let gridEl: HTMLDivElement | undefined = $state()
  let columnsPerRow = $state(6) 

  
  $effect(() => {
    if (!gridEl) return

    const updateColumns = () => {
      const gridWidth = gridEl!.clientWidth
      
      const minCardWidth = 120
      const gap = 16
      
      columnsPerRow = Math.floor((gridWidth + gap) / (minCardWidth + gap))
    }

    updateColumns()

    const observer = new ResizeObserver(updateColumns)
    observer.observe(gridEl)

    return () => observer.disconnect()
  })

  
  
  function getOverlayPosition(index: number): 'right' | 'left' {
    const columnIndex = index % columnsPerRow
    
    return columnIndex >= columnsPerRow - 2 ? 'left' : 'right'
  }

  function handleToggle(key: PackageKey) {
    toggleSoftware(key)
  }
</script>

<div
  bind:this={gridEl}
  id="software-grid"
  class="software-grid {className}"
  class:list-view={app.view === 'list'}
>
  {#each filtered as [key, pkg], index (key)}
    <SoftwareCard
      {key}
      {pkg}
      selected={selectedSet.has(key)}
      onToggle={handleToggle}
      overlayPosition={getOverlayPosition(index)}
    />
  {/each}

  {#if filtered.length === 0}
    <div class="empty-state">
      {#if app.search}
        <p>No software matches "{app.search}"</p>
      {:else}
        <p>No software in this category</p>
      {/if}
    </div>
  {/if}
</div>



<script lang="ts">
import { app, getFiltered, toggleSoftware } from '$lib/state.svelte'
import type { PackageKey } from '$lib/types'
import SoftwareCard from './SoftwareCard.svelte'

interface Props {
  class?: string
}

const { class: className = '' }: Props = $props()

const filtered = $derived(getFiltered())
const selectedSet = $derived(app.selected)

function handleToggle(key: PackageKey) {
  toggleSoftware(key)
}
</script>

<div
  id="software-grid"
  class="software-grid {className}"
  class:list-view={app.view === "list"}
>
  {#each filtered as [key, pkg] (key)}
    <SoftwareCard
      {key}
      {pkg}
      selected={selectedSet.has(key)}
      onToggle={handleToggle}
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

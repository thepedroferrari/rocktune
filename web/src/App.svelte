<script lang="ts">
  /**
   * RockTune App - Root Svelte Component
   *
   * Arsenal section rendered by Svelte. Mounted inside #software section in index.html.
   */

  import { onMount } from 'svelte'
  import { app, setSoftware, getSelectedCount, getTotalCount } from '$lib/state.svelte'
  import { getRecommendedPreset } from '$lib/presets'
  import { safeParseCatalog, isParseSuccess, formatZodErrors } from './schemas'
  import type { SoftwareCatalog } from '$lib/types'
  import SoftwareGrid from './components/SoftwareGrid.svelte'
  import Filters from './components/Filters.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)

  // Derived counts for display
  let selectedCount = $derived(getSelectedCount())
  let totalCount = $derived(getTotalCount())
  let recommendedPreset = $derived(getRecommendedPreset(app.activePreset))

  async function loadCatalog(): Promise<SoftwareCatalog> {
    const response = await fetch('/catalog.json')
    if (!response.ok) {
      throw new Error(`Failed to load catalog: HTTP ${response.status}`)
    }

    const rawData: unknown = await response.json()
    const result = safeParseCatalog(rawData)

    if (!isParseSuccess(result)) {
      throw new Error(`Invalid catalog format: ${formatZodErrors(result.error)}`)
    }

    // Cast validated data to app's branded types (structurally identical)
    return result.data as unknown as SoftwareCatalog
  }

  async function hydrateCatalog() {
    loading = true
    error = null

    try {
      const catalog = await loadCatalog()
      setSoftware(catalog)

      // Signal that catalog is ready - UI controllers wait for this
      window.dispatchEvent(new CustomEvent('catalog-loaded'))
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load catalog'
      console.error('[RockTune] Catalog load error:', error)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void hydrateCatalog()
  })
</script>

<!-- Arsenal content rendered inside #software section from index.html -->
<div class="step-header">
  <div class="step-header__left">
    <h2><span class="step-num">4</span> Arsenal</h2>
    <p class="step-desc">
      All packages installed via <abbr title="Windows Package Manager">winget</abbr>
    </p>
  </div>
  <div class="step-header__right">
    <span class="counter">
      <span id="software-counter">{selectedCount}</span> / {totalCount} selected
    </span>
  </div>
</div>

{#if loading}
  <div class="loading-state">Loading software catalog...</div>
{:else if error}
  <div class="error-state">
    <p>{error}</p>
    <button type="button" onclick={hydrateCatalog}>Retry</button>
  </div>
{:else}
  <Filters {recommendedPreset} />
  <SoftwareGrid />
{/if}

<!-- Dev indicator -->
<div class="svelte-ready-indicator" aria-hidden="true"></div>

<style>
  .svelte-ready-indicator {
    position: fixed;
    bottom: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: #00ff88;
    border-radius: 50%;
    opacity: 0.6;
    z-index: 9999;
    pointer-events: none;
  }

  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .step-header__left h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    color: var(--text);
  }

  .step-desc {
    margin: 0;
    color: var(--text-dim);
    font-size: 0.875rem;
  }

  .counter {
    color: var(--text-dim);
    font-size: 0.875rem;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-dim);
  }

  .error-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>

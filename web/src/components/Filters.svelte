<script lang="ts">
  import {
    app,
    setFilter,
    setSearch,
    setView,
    getCategoryCounts,
    getSelectedCount,
    clearSelection,
    setRecommendedPackages,
    clearRecommendedPackages,
  } from '$lib/state.svelte'
  import type { FilterValue, ViewMode } from '$lib/types'
  import {
    CATEGORIES,
    FILTER_ALL,
    FILTER_SELECTED,
    FILTER_RECOMMENDED,
    VIEW_MODES,
  } from '$lib/types'

  const SEARCH_DEBOUNCE_MS = 150

  // Props for recommended filter (from presets)
  interface Props {
    recommendedPreset?: {
      name: string
      displayName: string
      software: readonly string[]
    } | null
  }

  let { recommendedPreset = null }: Props = $props()

  // Sync search value with store (derive from store, update via debounced setter)
  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  let localSearchInput = $state(app.search)
  let isTyping = $state(false)

  // Derived
  let counts = $derived(getCategoryCounts())
  let selectedCount = $derived(getSelectedCount())
  let activeFilter = $derived(app.filter)
  let activeView = $derived(app.view)

  // Filter categories to show (only those with packages)
  let visibleCategories = $derived(
    CATEGORIES.filter((cat) => counts[cat] > 0)
  )

  // Sync recommended packages to store when preset changes
  $effect(() => {
    if (recommendedPreset?.software) {
      setRecommendedPackages(recommendedPreset.software)
    } else {
      clearRecommendedPackages()
    }
  })

  function handleSearchInput() {
    isTyping = true
    // Debounce search
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      setSearch(localSearchInput.trim())
      isTyping = false
    }, SEARCH_DEBOUNCE_MS)
  }

  function handleFilterClick(filter: FilterValue) {
    setFilter(filter)
  }

  function handleViewToggle(view: ViewMode) {
    setView(view)
  }

  function handleClearAll() {
    clearSelection()
  }

  // Cleanup timeout on unmount
  $effect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  })

  $effect(() => {
    if (isTyping) return
    if (localSearchInput !== app.search) {
      localSearchInput = app.search
    }
  })
</script>

<div class="filters-container">
  <!-- Search -->
  <div class="search-wrapper">
    <input
      id="software-search"
      type="search"
      class="search-input"
      placeholder="Search software..."
      bind:value={localSearchInput}
      oninput={handleSearchInput}
      aria-label="Search software packages"
    />
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    {#if recommendedPreset}
      <button
        type="button"
        class="filter filter--recommended"
        class:active={activeFilter === FILTER_RECOMMENDED}
        onclick={() => handleFilterClick(FILTER_RECOMMENDED)}
      >
        <span class="filter-badge">{recommendedPreset.software.length}</span>
        <span>{recommendedPreset.displayName} Picks</span>
      </button>
    {/if}

    <button
      type="button"
      class="filter"
      class:active={activeFilter === FILTER_ALL}
      data-filter="*"
      onclick={() => handleFilterClick(FILTER_ALL)}
    >
      <span class="filter-badge" id="count-all">{counts.all}</span>
      <span>All</span>
    </button>

    {#each visibleCategories as category (category)}
      <button
        type="button"
        class="filter"
        class:active={activeFilter === category}
        data-filter={category}
        onclick={() => handleFilterClick(category)}
      >
        <span class="filter-badge" id="count-{category}">{counts[category]}</span>
        <span class="filter-label">{category}</span>
      </button>
    {/each}

    <button
      type="button"
      class="filter selected-count-btn"
      class:active={activeFilter === FILTER_SELECTED}
      data-filter="selected"
      onclick={() => handleFilterClick(FILTER_SELECTED)}
    >
      <span class="filter-badge" id="count-selected">{selectedCount}</span>
      <span>Selected</span>
    </button>
  </div>

  <!-- View Toggle & Actions -->
  <div class="filter-actions">
    <div class="view-toggle">
      <button
        type="button"
        class="view-btn"
        class:active={activeView === VIEW_MODES.GRID}
        data-view="grid"
        onclick={() => handleViewToggle(VIEW_MODES.GRID)}
        aria-label="Grid view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <button
        type="button"
        class="view-btn"
        class:active={activeView === VIEW_MODES.LIST}
        data-view="list"
        onclick={() => handleViewToggle(VIEW_MODES.LIST)}
        aria-label="List view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>

    {#if selectedCount > 0}
      <button
        type="button"
        id="clear-all-software"
        class="clear-btn"
        onclick={handleClearAll}
      >
        Clear All
      </button>
    {/if}
  </div>
</div>

<style>
  .filters-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .search-wrapper {
    flex: 1;
    min-width: 200px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 0.875rem;
  }

  .search-input::placeholder {
    color: var(--text-dim);
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter:hover {
    border-color: var(--accent-dim);
    color: var(--text);
  }

  .filter.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }

  .filter--recommended {
    background: linear-gradient(135deg, var(--accent-dim), var(--accent));
    border-color: var(--accent);
    color: var(--bg);
  }

  .filter-badge {
    font-weight: 600;
    font-size: 0.7rem;
    min-width: 1.25rem;
    text-align: center;
  }

  .filter-label {
    text-transform: capitalize;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .view-toggle {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .view-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-btn svg {
    width: 18px;
    height: 18px;
  }

  .view-btn:hover {
    color: var(--text);
  }

  .view-btn.active {
    background: var(--accent);
    color: var(--bg);
  }

  .clear-btn {
    padding: 0.375rem 0.75rem;
    background: var(--danger);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .clear-btn:hover {
    opacity: 0.8;
  }
</style>

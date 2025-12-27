import { FILTER_VALUES, UI_DELAYS } from '../../constants'
import { store } from '../../state'
import type { FilterValue, PresetType, ViewMode } from '../../types'
import { FILTER_ALL, FILTER_SELECTED, isCategory, VIEW_MODES } from '../../types'
import { $, $$, $id, announce, debounce, isInputElement } from '../../utils/dom'
import type { CleanupController } from '../../utils/lifecycle'

const { WILDCARD: FILTER_WILDCARD, SELECTED: FILTER_SELECTED_VALUE } = FILTER_VALUES
const { FILTER_ANIMATION_MS: ANIMATION_DELAY_MS, SEARCH_ANNOUNCE_MS: SEARCH_ANNOUNCE_DELAY_MS } =
  UI_DELAYS
const FILTER_RECOMMENDED = 'recommended' as const

/** Display names for presets in the filter button */
const PRESET_DISPLAY_NAMES: Record<PresetType, string> = {
  competitive: 'Competitive',
  balanced: 'Gamer',
  streaming: 'Streamer',
  overkill: 'Benchmarker',
}

/** Current active preset for recommended filter */
let currentPresetData: { name: PresetType; software: readonly string[] } | null = null

function addListener(
  controller: CleanupController | undefined,
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  if (controller) {
    controller.addEventListener(target, type, handler, options)
  } else {
    target.addEventListener(type, handler, options)
  }
}

export function setupFilters(controller?: CleanupController): void {
  const filterButtons = $$<HTMLButtonElement>('.filter')
  const selectedBadgeBtn = $<HTMLButtonElement>('.selected-count-btn')
  const filterBar = $<HTMLDivElement>('.filter-bar')

  const allFilterButtons = selectedBadgeBtn
    ? [...filterButtons, selectedBadgeBtn]
    : [...filterButtons]

  if (filterBar) {
    addListener(controller, filterBar, 'click', (e: Event) => {
      const target = e.target
      if (!(target instanceof Element)) return
      const btn = target.closest<HTMLButtonElement>('.filter')
      if (!btn) return
      handleFilterClick(btn, allFilterButtons)
    })
  }

  if (selectedBadgeBtn) {
    addListener(controller, selectedBadgeBtn, 'click', () =>
      handleFilterClick(selectedBadgeBtn, allFilterButtons),
    )
  }
}

function handleFilterClick(activeBtn: HTMLButtonElement, allButtons: HTMLButtonElement[]): void {
  // Include recommended filter button in toggle logic
  const recommendedBtn = $<HTMLButtonElement>('[data-filter="recommended"]')
  const allWithRecommended = recommendedBtn ? [...allButtons, recommendedBtn] : allButtons

  for (const btn of allWithRecommended) {
    btn.classList.toggle('active', btn === activeBtn)
  }

  const filterRaw = activeBtn.dataset.filter ?? FILTER_WILDCARD

  // Handle recommended filter specially
  if (filterRaw === FILTER_RECOMMENDED) {
    handleRecommendedFilter()
    return
  }

  // Clear recommended styling when switching to other filters
  clearRecommendedStyling()

  animateVisibleCards(filterRaw)

  const filter: FilterValue = parseFilterValue(filterRaw)
  store.setFilter(filter)
}

function parseFilterValue(raw: string): FilterValue {
  if (raw === FILTER_WILDCARD) return FILTER_ALL
  if (raw === FILTER_SELECTED_VALUE) return FILTER_SELECTED
  return isCategory(raw) ? raw : FILTER_ALL
}

function animateVisibleCards(filter: string): void {
  const cards = $$<HTMLDivElement>('.software-card')
  let visibleIndex = 0

  for (const card of cards) {
    const key = card.dataset.key
    let isVisible: boolean

    if (filter === FILTER_WILDCARD) {
      isVisible = true
    } else if (filter === FILTER_SELECTED_VALUE) {
      isVisible = key ? store.isSelected(key) : false
    } else {
      isVisible = card.dataset.category === filter
    }

    card.classList.toggle('hidden', !isVisible)

    if (isVisible) {
      card.style.animationDelay = `${visibleIndex * ANIMATION_DELAY_MS}ms`
      card.classList.add('entering')
      visibleIndex++
    }
  }
}

export function setupSearch(controller?: CleanupController): void {
  const input = $id('software-search')
  if (!isInputElement(input)) return

  const announceResults = debounce((count: number) => {
    announce(`${count} package${count !== 1 ? 's' : ''} found`)
  }, SEARCH_ANNOUNCE_DELAY_MS)

  addListener(controller, input, 'input', (e) => handleSearchInput(e, announceResults))
}

function handleSearchInput(event: Event, announceResults: (count: number) => void): void {
  const target = event.target
  if (!isInputElement(target)) return

  const query = target.value.toLowerCase().trim()
  const activeFilter = getActiveFilter()
  const visibleCount = filterCardsBySearch(query, activeFilter)

  store.setSearchTerm(query)
  announceResults(visibleCount)
}

function getActiveFilter(): string {
  return $<HTMLButtonElement>('.filter.active')?.dataset.filter ?? FILTER_WILDCARD
}

function filterCardsBySearch(query: string, activeFilter: string): number {
  const cards = $$<HTMLDivElement>('.software-card')
  let visibleCount = 0

  for (const card of cards) {
    const key = card.dataset.key
    if (!key) continue

    const pkg = store.getPackage(key)
    if (!pkg) continue

    const matchesSearch =
      !query ||
      pkg.name.toLowerCase().includes(query) ||
      pkg.desc?.toLowerCase().includes(query) ||
      pkg.category.toLowerCase().includes(query)

    let matchesFilter: boolean
    if (activeFilter === FILTER_WILDCARD) {
      matchesFilter = true
    } else if (activeFilter === FILTER_SELECTED_VALUE) {
      matchesFilter = store.isSelected(key)
    } else {
      matchesFilter = card.dataset.category === activeFilter
    }

    const isVisible = matchesSearch && matchesFilter

    card.classList.toggle('hidden', !isVisible)
    if (isVisible) visibleCount++
  }

  return visibleCount
}

export function setupViewToggle(controller?: CleanupController): void {
  const buttons = $$<HTMLButtonElement>('.view-btn')
  const grid = $id('software-grid')
  const viewToggle = $<HTMLDivElement>('.view-toggle')
  if (!buttons.length || !grid || !viewToggle) return

  addListener(controller, viewToggle, 'click', (e: Event) => {
    const target = e.target
    if (!(target instanceof Element)) return
    const btn = target.closest<HTMLButtonElement>('.view-btn')
    if (!btn) return
    handleViewToggle(btn, buttons, grid)
  })
}

function handleViewToggle(
  activeBtn: HTMLButtonElement,
  allButtons: NodeListOf<HTMLButtonElement>,
  grid: HTMLElement,
): void {
  for (const btn of allButtons) {
    btn.classList.toggle('active', btn === activeBtn)
  }

  const view = parseViewMode(activeBtn.dataset.view)
  grid.classList.toggle('list-view', view === VIEW_MODES.LIST)
  store.setView(view)
}

function parseViewMode(raw: string | undefined): ViewMode {
  return raw === VIEW_MODES.LIST ? VIEW_MODES.LIST : VIEW_MODES.GRID
}

export function setupClearAll(controller?: CleanupController): void {
  const btn = $id('clear-all-software')
  if (!btn) return

  addListener(controller, btn, 'click', () => {
    store.clearSelection()

    for (const card of $$<HTMLDivElement>('.software-card')) {
      card.classList.remove('selected')
      card.setAttribute('aria-checked', 'false')
      const action = card.querySelector('.back-action')
      if (action) action.textContent = 'Click to add'
    }

    document.dispatchEvent(new CustomEvent('software-selection-changed'))
  })
}

/**
 * Clear recommended/optional styling from all cards
 */
function clearRecommendedStyling(): void {
  for (const card of $$<HTMLDivElement>('.software-card')) {
    card.classList.remove('preset-recommended', 'preset-optional')
  }
}

/**
 * Handle recommended filter - shows only software for current preset
 */
function handleRecommendedFilter(): void {
  if (!currentPresetData) return

  const recommendedKeys = new Set(currentPresetData.software)
  const cards = $$<HTMLDivElement>('.software-card')
  let visibleIndex = 0

  for (const card of cards) {
    const key = card.dataset.key
    const isRecommended = key ? recommendedKeys.has(key) : false

    card.classList.toggle('hidden', !isRecommended)
    card.classList.toggle('preset-recommended', isRecommended)
    card.classList.remove('preset-optional')

    if (isRecommended) {
      card.style.animationDelay = `${visibleIndex * ANIMATION_DELAY_MS}ms`
      card.classList.add('entering')
      visibleIndex++
    }
  }
}

/**
 * Show the recommended filter button when a preset is applied
 */
export function showRecommendedFilter(presetName: PresetType, software: readonly string[]): void {
  currentPresetData = { name: presetName, software }

  const filterBar = $<HTMLDivElement>('.filter-bar')
  if (!filterBar) return

  // Remove existing recommended button
  const existingBtn = filterBar.querySelector<HTMLButtonElement>('[data-filter="recommended"]')
  if (existingBtn) {
    existingBtn.remove()
  }

  // Create new recommended filter button
  const displayName = PRESET_DISPLAY_NAMES[presetName]
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'filter filter--recommended'
  btn.dataset.filter = FILTER_RECOMMENDED

  const badge = document.createElement('span')
  badge.className = 'filter-badge'
  badge.textContent = String(software.length)

  const label = document.createElement('span')
  label.textContent = `${displayName} Picks`

  btn.appendChild(badge)
  btn.appendChild(label)

  // Insert at the beginning
  const firstFilter = filterBar.querySelector('.filter')
  if (firstFilter) {
    filterBar.insertBefore(btn, firstFilter)
  } else {
    filterBar.appendChild(btn)
  }

  // Add click handler
  btn.addEventListener('click', () => {
    // Deactivate other filters
    for (const f of $$<HTMLButtonElement>('.filter, .selected-count-btn')) {
      f.classList.remove('active')
    }
    btn.classList.add('active')
    handleRecommendedFilter()
  })

  // Don't add stars immediately - they will appear when user clicks the picks filter
  // This keeps the UI cleaner when preset is applied but All filter is still active
}

/**
 * Hide the recommended filter button
 */
export function hideRecommendedFilter(): void {
  currentPresetData = null
  clearRecommendedStyling()

  const btn = $<HTMLButtonElement>('[data-filter="recommended"]')
  if (btn) {
    btn.remove()
  }
}

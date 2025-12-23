import { setupAuditPanel } from './components/audit'
import { renderSoftwareGrid, updateCategoryBadges } from './components/cards'
import { setupDriverLinks } from './components/drivers'
import { setupFilters, setupSearch, setupViewToggle } from './components/filters'
import { setupHeroCube } from './components/hero-cube'
import { setupPresets } from './components/presets'
import { setupProfileActions } from './components/profiles'
import { setupDownload } from './components/script-generator'
import { setupFormListeners, updateSummary } from './components/summary'
import { formatZodErrors, isParseSuccess, safeParseCatalog, type ValidatedCatalog } from './schemas'
import { store } from './state'
import { CATEGORY_SVG_ICONS } from './types'
import { $id, onReady } from './utils/dom'
import { setupCursorGlow, setupImageFallbacks, setupScrollAnimations } from './utils/effects'
import { setupRichTooltips } from './utils/tooltips'

interface LoadState {
  error: string | null
  isLoading: boolean
}

const loadState: LoadState = {
  error: null,
  isLoading: false,
}

async function loadCatalog(): Promise<ValidatedCatalog> {
  loadState.isLoading = true

  try {
    const response = await fetch('/catalog.json')
    if (!response.ok) {
      throw new Error(`Failed to load catalog: HTTP ${response.status}`)
    }

    const rawData: unknown = await response.json()
    const result = safeParseCatalog(rawData)

    if (!isParseSuccess(result)) {
      throw new Error(`Invalid catalog format: ${formatZodErrors(result.error)}`)
    }

    loadState.error = null
    return result.data
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error loading catalog'
    console.error('Catalog load error:', message)
    loadState.error = message
    return {}
  } finally {
    loadState.isLoading = false
  }
}

function showError(message: string): void {
  const banner = $id('error-banner')
  const messageEl = $id('error-message')
  if (banner && messageEl) {
    messageEl.textContent = message
    banner.hidden = false
  }
}

function hideError(): void {
  const banner = $id('error-banner')
  if (banner) banner.hidden = true
}

function setupErrorHandlers(): void {
  $id('error-retry')?.addEventListener('click', handleRetry)
  $id('error-dismiss')?.addEventListener('click', hideError)
}

async function handleRetry(): Promise<void> {
  if (loadState.isLoading) return

  hideError()
  const catalog = await loadCatalog()

  if (Object.keys(catalog).length > 0) {
    store.setSoftware(catalog)
    renderSoftwareGrid()
    updateCategoryBadges()
  } else if (loadState.error) {
    showError(loadState.error)
  }
}

async function init(): Promise<void> {
  setupErrorHandlers()

  const catalog = await loadCatalog()
  store.setSoftware(catalog)

  if (loadState.error) {
    showError(loadState.error)
  }

  setupVisualEffects()
  setupUI()
  setupInteractions()

  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

function setupVisualEffects(): void {
  setupCursorGlow()
  setupScrollAnimations()
  setupImageFallbacks(CATEGORY_SVG_ICONS)
  setupHeroCube()
  setupRichTooltips()
}

function setupUI(): void {
  renderSoftwareGrid()
  updateCategoryBadges()
}

function setupInteractions(): void {
  setupFilters()
  setupSearch()
  setupViewToggle()
  setupPresets()
  setupFormListeners()
  setupDownload()
  setupProfileActions()
  setupAuditPanel()
  setupDriverLinks()
}

onReady(init)

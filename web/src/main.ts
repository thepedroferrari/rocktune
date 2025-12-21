/**
 * RockTune — A Loadout Builder for Windows Gaming
 * Generate personalized PowerShell scripts to tune Windows for gaming
 */

import { setupAuditPanel } from './components/audit'
// Components
import { renderSoftwareGrid, updateCategoryBadges } from './components/cards'
import { setupFilters, setupSearch, setupViewToggle } from './components/filters'
import { setupPresets } from './components/presets'
import { setupProfileActions } from './components/profiles'
import { setupDownload } from './components/script-generator'
import { setupFormListeners, updateSummary } from './components/summary'
import { store } from './state'
import type { SoftwareCatalog } from './types'

// Utils
import { setupCursorGlow, setupImageFallbacks, setupScrollAnimations } from './utils/effects'

// SVG fallback icons by category
const CATEGORY_SVG_ICONS: Record<string, string> = {
  launcher:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
  gaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m8 0h.01m2-2h.01"/></svg>',
  streaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><circle cx="2" cy="20" r="1"/></svg>',
  monitoring:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  media:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  utility:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  rgb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  runtime:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>',
  benchmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20v-6m6 6v-4m-12 4V10m12-6 2 2-2 2m-4-2h4M6 6H2m4 0 2 2M6 6l2-2"/></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
}

async function loadCatalog(): Promise<SoftwareCatalog> {
  try {
    const response = await fetch('/catalog.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return (await response.json()) as SoftwareCatalog
  } catch (e) {
    console.error('Catalog load error:', e)
    return {}
  }
}

async function init(): Promise<void> {
  // Load catalog and initialize state
  const catalog = await loadCatalog()
  store.setSoftware(catalog)

  // Setup visual effects
  setupCursorGlow()
  setupScrollAnimations()
  setupImageFallbacks(CATEGORY_SVG_ICONS)

  // Render software grid
  renderSoftwareGrid()
  updateCategoryBadges()

  // Setup interactions
  setupFilters()
  setupSearch()
  setupViewToggle()
  setupPresets()
  setupFormListeners()
  setupDownload()
  setupProfileActions()
  setupAuditPanel()

  // Initial summary
  updateSummary()

  // Trigger initial script generation
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

// Start the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

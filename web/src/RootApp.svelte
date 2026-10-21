<script lang="ts">
/**
 * RockTune Root App - Svelte 5
 *
 * Single root component managing the entire application.
 * All sections rendered from here - no HTML fallbacks.
 */

import { getDefaultOptimizations } from '$lib/optimizations'
import { getRecommendedPreset } from '$lib/presets'
import { LOAD_DEFERRED_EVENT, scrollToSection } from '$lib/scroll'
import {
  clearShareHash,
  type DecodedBuild,
  decodeShareURL,
  getShareHash,
  hasShareHash,
  validatePackages,
} from '$lib/share'
import {
  app,
  getSelectedCount,
  getTotalCount,
  setActivePreset,
  setCpu,
  setDnsProvider,
  setGpu,
  setMonitorSoftware,
  setOptimizations,
  setPeripherals,
  setSelection,
  setSoftware,
  setView,
} from '$lib/state.svelte'
import type { PackageKey, SoftwareCatalog } from '$lib/types'
import { OPTIMIZATION_KEYS, VIEW_MODES } from '$lib/types'
import { onMount } from 'svelte'
import SectionSkeleton from './components/SectionSkeleton.svelte'
import ErrorState from './components/ui/ErrorState.svelte'
import { isParseSuccess, safeParseCatalog } from './schemas'

/** LUDICROUS optimization keys for danger zone detection */
const LUDICROUS_KEYS = [
  OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
  OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
  OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
  OPTIMIZATION_KEYS.DEP_OFF,
] as const

import { closeShareModal } from '$lib/state.svelte'
import { showToast } from '$lib/toast.svelte'
import CleanFirstSection from './components/CleanFirstSection.svelte'
import HeroSection from './components/HeroSection.svelte'
import PresetSection from './components/PresetSection.svelte'
import RigCheckSection from './components/RigCheckSection.svelte'
import SRAnnounce from './components/SRAnnounce.svelte'
import Toast from './components/Toast.svelte'
import UnifiedNav from './components/UnifiedNav.svelte'

let loading = $state(true)

/**
 * Below-the-fold sections (Forge, Guide) load when the visitor scrolls near
 * them, follows a link to them, or after 8 seconds, so first load skips about
 * 100KB gzip of JavaScript and CSS.
 */
let deferredReady = $state(false)
let deferSentinel = $state<HTMLElement | null>(null)

$effect(() => {
  if (deferredReady) return
  const release = () => {
    deferredReady = true
  }
  if (window.location.hash && !window.location.hash.startsWith('#b=')) {
    release()
    return
  }
  // A plain #anchor link to a deferred section: load it, then scroll once it renders
  const releaseForHash = () => {
    release()
    const id = window.location.hash.slice(1)
    if (id) void scrollToSection({ sectionId: id })
  }
  window.addEventListener(LOAD_DEFERRED_EVENT, release)
  window.addEventListener('hashchange', releaseForHash)
  const timeoutId = setTimeout(release, 8000)
  let observer: IntersectionObserver | undefined
  if (deferSentinel && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) release()
      },
      { rootMargin: '1500px 0px' },
    )
    observer.observe(deferSentinel)
  }
  return () => {
    clearTimeout(timeoutId)
    observer?.disconnect()
    window.removeEventListener(LOAD_DEFERRED_EVENT, release)
    window.removeEventListener('hashchange', releaseForHash)
  }
})
let error = $state<string | null>(null)

/** Pending packages from share URL (validated after catalog loads) */
let pendingSharePackages = $state<PackageKey[] | null>(null)

const selectedCount = $derived(getSelectedCount())
const totalCount = $derived(getTotalCount())
const recommendedPreset = $derived(getRecommendedPreset(app.activePreset))
const activeView = $derived(app.view)

/** Track if we loaded from a shared URL */
let loadedFromShare = $state(false)

/**
 * Modals load on first open and then stay mounted, so Modal.svelte can call
 * dialog.close() and the browser returns focus to the button that opened it.
 */
let previewLoaded = $state(false)
let shareLoaded = $state(false)
$effect(() => {
  if (app.ui.previewModalOpen) previewLoaded = true
})
$effect(() => {
  if (app.ui.shareModalOpen) shareLoaded = true
})

/** Check if any LUDICROUS optimizations are selected */
const hasLudicrousSelected = $derived(LUDICROUS_KEYS.some((key) => app.optimizations.has(key)))

/** Show danger banner when LUDICROUS acknowledged AND items selected */
const showDangerBanner = $derived(app.ui.ludicrousAcknowledged && hasLudicrousSelected)

function handleViewToggle(view: typeof VIEW_MODES.GRID | typeof VIEW_MODES.LIST) {
  setView(view)
}

const CATALOG_CACHE_KEY = 'rocktune_catalog_cache'
const CATALOG_CACHE_VERSION = '1.0'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface CatalogCache {
  version: string
  timestamp: string
  catalog: SoftwareCatalog
}

function getCachedCatalog(): SoftwareCatalog | null {
  try {
    const cached = localStorage.getItem(CATALOG_CACHE_KEY)
    if (!cached) return null

    const data: unknown = JSON.parse(cached)
    if (
      typeof data === 'object' &&
      data !== null &&
      'version' in data &&
      'timestamp' in data &&
      'catalog' in data
    ) {
      const cache = data as CatalogCache
      const age = Date.now() - new Date(cache.timestamp).getTime()

      if (age < SEVEN_DAYS_MS && cache.version === CATALOG_CACHE_VERSION) {
        const result = safeParseCatalog(cache.catalog)
        if (isParseSuccess(result)) {
          return result.data
        }
        localStorage.removeItem(CATALOG_CACHE_KEY)
      }
    }
    return null
  } catch {
    return null
  }
}

function saveCatalogCache(catalog: SoftwareCatalog): void {
  try {
    const cache: CatalogCache = {
      version: CATALOG_CACHE_VERSION,
      timestamp: new Date().toISOString(),
      catalog,
    }
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Fail silently (quota exceeded, private browsing)
  }
}

async function loadCatalog(): Promise<SoftwareCatalog> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const baseURL =
      typeof window !== 'undefined'
        ? new URL(import.meta.env.BASE_URL, window.location.origin)
        : new URL('https://rocktune.pedroferrari.com/')
    const catalogURL = new URL('catalog.json', baseURL).toString()

    const response = await fetch(catalogURL, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 404) throw new Error('CATALOG_NOT_FOUND')
      if (response.status >= 500) throw new Error('SERVER_ERROR')
      throw new Error('NETWORK_ERROR')
    }

    const rawData: unknown = await response.json()
    const result = safeParseCatalog(rawData)

    if (!isParseSuccess(result)) {
      throw new Error('INVALID_FORMAT')
    }

    saveCatalogCache(result.data)
    return result.data
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('TIMEOUT')
    }

    if (!navigator.onLine) {
      throw new Error('OFFLINE')
    }

    throw err
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Catalog hydration requires complex state coordination and error handling
async function hydrateCatalog() {
  loading = true
  error = null

  try {
    const catalog = await loadCatalog()
    setSoftware(catalog)

    if (!loadedFromShare) {
      const defaults = getDefaultOptimizations()
      setOptimizations(defaults)
    }

    applyPendingSharePackages(catalog)
  } catch (e) {
    const cached = getCachedCatalog()

    if (e instanceof Error) {
      switch (e.message) {
        case 'OFFLINE':
          error = cached
            ? "📡 You're offline. Using cached catalog."
            : '📡 No internet connection. Please connect and try again.'
          break

        case 'TIMEOUT':
          error = cached
            ? '⏱️ Catalog is taking too long. Using cached version.'
            : '⏱️ Connection timeout. Check your internet and try again.'
          break

        case 'CATALOG_NOT_FOUND':
          error = '🔍 Catalog not found. Try reloading the page.'
          break

        case 'SERVER_ERROR':
          error = cached
            ? '🚨 Server error. Using cached catalog.'
            : '🚨 Server error. Please try again in a few minutes.'
          break

        case 'INVALID_FORMAT':
          error = '⚠️ Catalog format error. Please reload the page.'
          break

        default:
          error = cached
            ? '⚡ Connection failed. Using cached catalog.'
            : '⚡ Failed to load catalog. Please try again.'
      }

      if (cached) {
        setSoftware(cached)
        if (!loadedFromShare) {
          const defaults = getDefaultOptimizations()
          setOptimizations(defaults)
        }
        applyPendingSharePackages(cached)
      }
    } else {
      error = 'Unknown error loading catalog.'
    }

    if (import.meta.env.DEV) {
      console.error('[RockTune] Catalog load error:', error, e)
    }
  } finally {
    loading = false
  }
}

/**
 * Apply a decoded shared build to app state
 * Note: Packages are stored as pending and validated after catalog loads
 */
function applySharedBuild(build: DecodedBuild): void {
  if (build.cpu) setCpu(build.cpu)
  if (build.gpu) setGpu(build.gpu)
  if (build.dnsProvider) setDnsProvider(build.dnsProvider)
  if (build.peripherals.length > 0) setPeripherals(build.peripherals)
  if (build.monitorSoftware.length > 0) setMonitorSoftware(build.monitorSoftware)
  if (build.optimizations.length > 0) setOptimizations(build.optimizations)
  if (build.preset) setActivePreset(build.preset)

  if (build.packages.length > 0) {
    pendingSharePackages = build.packages
  }

  loadedFromShare = true
}

/**
 * Validate and apply pending share packages against loaded catalog
 */
function applyPendingSharePackages(catalog: SoftwareCatalog): void {
  if (!pendingSharePackages) return

  const catalogKeys = new Set(Object.keys(catalog))
  const { valid, invalidCount } = validatePackages(pendingSharePackages, catalogKeys)

  if (valid.length > 0) {
    setSelection(valid)
  }

  if (invalidCount > 0) {
    showToast(`${invalidCount} package(s) from shared link no longer available.`, 'warning', 5000)
  }

  pendingSharePackages = null
}

/**
 * Try to load state from URL share hash
 */
function tryLoadFromShareURL(): void {
  if (!hasShareHash()) return

  const hash = getShareHash()
  if (!hash) return

  const result = decodeShareURL(hash)

  if (result.success) {
    applySharedBuild(result.build)
    clearShareHash()

    const { optimizations, packages } = result.build
    const counts = [
      optimizations.length && `${optimizations.length} optimizations`,
      packages.length && `${packages.length} packages`,
    ]
      .filter(Boolean)
      .join(', ')
    const summary = counts || 'Settings'

    if (result.build.skippedCount > 0) {
      const details =
        result.build.warnings.length > 0
          ? result.build.warnings.join('. ')
          : `${result.build.skippedCount} setting(s) no longer available`
      showToast(`Build loaded! ${summary} applied. ${details}.`, 'warning', 9000)
    } else {
      showToast(`Build loaded! ${summary} applied.`, 'success')
    }
  } else {
    showToast(result.error, 'error', 6000)
    clearShareHash()
  }
}

onMount(() => {
  tryLoadFromShareURL()
  void hydrateCatalog()
})
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<SRAnnounce />

<UnifiedNav />

{#if showDangerBanner}
  <div class="danger-banner" role="alert">
    <svg
      class="danger-banner__icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
    <span class="danger-banner__text">
      <strong>SECURITY OFF</strong> — Mitigations disabled. Offline use only.
    </span>
  </div>
{/if}

<HeroSection />

<main class="container" id="main-content">
  <div class="step-container step-container--flexible">
    <CleanFirstSection />
  </div>

  <div class="step-container step-container--flexible">
    <RigCheckSection />
  </div>

  <div class="step-container step-container--flexible">
    <section id="quick-start" class="step step--loadouts">
      <header class="step-banner">
        <div class="step-banner__marker">2</div>
        <div class="step-banner__content">
          <h2 class="step-banner__title">Pick your loadout</h2>
          <p class="step-banner__subtitle">One click sets every step below. Change anything after.</p>
        </div>
      </header>
      <PresetSection />
    </section>

  </div>

  <div class="step-container step-container--flexible">
    <svelte:boundary>
      {#await import("./components/HardwareSection.svelte")}
        <SectionSkeleton height="400px" />
      {:then { default: HardwareSection }}
        <HardwareSection />
      {/await}
      {#snippet failed(error, reset)}
        <ErrorState {error} {reset} title="Hardware Section Error" />
      {/snippet}
    </svelte:boundary>
  </div>

  <div class="step-container step-container--flexible">
    <svelte:boundary>
      {#await import("./components/PeripheralsSection.svelte")}
        <SectionSkeleton height="350px" />
      {:then { default: PeripheralsSection }}
        <PeripheralsSection />
      {/await}
      {#snippet failed(error, reset)}
        <ErrorState {error} {reset} title="Peripherals Section Error" />
      {/snippet}
    </svelte:boundary>
  </div>

  <div class="step-container step-container--flexible">
    <svelte:boundary>
      {#await import("./components/OptimizationsSection.svelte")}
        <SectionSkeleton height="800px" />
      {:then { default: OptimizationsSection }}
        <OptimizationsSection />
      {/await}
      {#snippet failed(error, reset)}
        <ErrorState {error} {reset} title="Optimizations Section Error" />
      {/snippet}
    </svelte:boundary>
  </div>

  <div class="step-container step-container--flexible">
    <section id="software" class="step step--arsenal">
      <header class="step-banner">
        <div class="step-banner__marker">6</div>
        <div class="step-banner__content">
          <h2 class="step-banner__title">Arsenal</h2>
          <p class="step-banner__subtitle">
            Install via <abbr title="Windows Package Manager">winget</abbr> — Microsoft's
            official package manager
          </p>
        </div>
        <div class="step-banner__actions">
          <div class="view-toggle view-toggle--banner">
            <button
              type="button"
              class="view-btn view-btn--banner"
              class:active={activeView === VIEW_MODES.GRID}
              onclick={() => handleViewToggle(VIEW_MODES.GRID)}
              aria-label="Grid view"
            >
              <svg aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              class="view-btn view-btn--banner"
              class:active={activeView === VIEW_MODES.LIST}
              onclick={() => handleViewToggle(VIEW_MODES.LIST)}
              aria-label="List view"
            >
              <svg aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {#if loading}
        <output class="loading-state" aria-busy="true"
          >Loading software catalog...</output
        >
      {:else if error}
        <output class="error-state" role="alert">
          <p>{error}</p>
          <button type="button" onclick={hydrateCatalog}>Retry</button>
        </output>
      {:else}
        {#await import("./components/Filters.svelte")}
          <SectionSkeleton height="100px" />
        {:then { default: Filters }}
          <Filters {recommendedPreset} />
        {/await}
        {#await import("./components/SoftwareGrid.svelte")}
          <SectionSkeleton height="600px" />
        {:then { default: SoftwareGrid }}
          <SoftwareGrid />
        {/await}
      {/if}
    </section>
  </div>

  <div bind:this={deferSentinel} aria-hidden="true"></div>
  {#if deferredReady}
  <svelte:boundary>
    {#await import("./components/ForgeSection.svelte")}
      <SectionSkeleton height="600px" />
    {:then { default: ForgeSection }}
      <ForgeSection />
    {/await}
    {#snippet failed(error, reset)}
      <ErrorState {error} {reset} title="Forge Section Error" />
    {/snippet}
  </svelte:boundary>

  <svelte:boundary>
    {#await import("./components/ManualStepsSection.svelte")}
      <SectionSkeleton height="500px" />
    {:then { default: ManualStepsSection }}
      <ManualStepsSection />
    {/await}
    {#snippet failed(error, reset)}
      <ErrorState {error} {reset} title="Manual Steps Error" />
    {/snippet}
  </svelte:boundary>
  {:else}
    <SectionSkeleton height="600px" />
    <SectionSkeleton height="500px" />
  {/if}
</main>

{#if previewLoaded}
  {#await import("./components/PreviewModal.svelte") then { default: PreviewModal }}
    <PreviewModal />
  {/await}
{/if}

{#if shareLoaded}
  {#await import("./components/ShareModal.svelte") then { default: ShareModal }}
    <ShareModal open={app.ui.shareModalOpen} onclose={closeShareModal} />
  {/await}
{/if}

<Toast />



<style>
.skip-link {
  position: absolute;
  inset-block-start: -100%;
  inset-inline-start: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
  text-decoration: none;
  z-index: 9999;
}

.skip-link:focus {
  inset-block-start: 0;
}
</style>

/**
 * RockTune - Svelte 5 Entry Point
 *
 * Mounts Svelte Arsenal section to dedicated target in index.html.
 * The target element (#svelte-arsenal-root) is inside the #software section.
 */

import { mount, unmount } from 'svelte'
import App from './App.svelte'
import PresetSection from './components/PresetSection.svelte'
import Summary from './components/Summary.svelte'
import { initAppUi } from './controllers/app-ui'

// Mount Svelte to the dedicated target inside #software section
const arsenalTarget = document.getElementById('svelte-arsenal-root')
if (!arsenalTarget) {
  throw new Error('Mount target #svelte-arsenal-root not found in index.html')
}

const mountedApps: Record<string, unknown>[] = []

const app = mount(App, { target: arsenalTarget })
mountedApps.push(app)

const presetsTarget = document.getElementById('svelte-presets-root')
if (presetsTarget) {
  mountedApps.push(mount(PresetSection, { target: presetsTarget }))
}

const summaryTarget = document.getElementById('svelte-summary-root')
if (summaryTarget) {
  mountedApps.push(mount(Summary, { target: summaryTarget }))
}

// Track if UI has been initialized to prevent double initialization
let uiInitialized = false

function safeInitAppUi(): void {
  if (uiInitialized) return
  uiInitialized = true
  initAppUi()
}

// Wait for catalog to load before initializing UI controllers
// This ensures buildScript() has access to app.software data
window.addEventListener('catalog-loaded', safeInitAppUi, { once: true })

// HMR support
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    mountedApps.forEach((instance) => {
      unmount(instance)
    })
  })
}

export default app

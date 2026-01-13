/**
 * RockTune - Svelte 5 Entry Point
 *
 * Single mount point for the entire application.
 * RootApp renders all sections - no HTML fallbacks needed.
 */

import { mount, unmount } from 'svelte'
import RootApp from './RootApp.svelte'

document.querySelectorAll<HTMLLinkElement>('link[data-defer-css]').forEach((link) => {
  link.rel = 'stylesheet'
  link.removeAttribute('data-defer-css')
})

const root = document.getElementById('svelte-app-root')
if (!root) {
  throw new Error('#svelte-app-root not found in index.html')
}

const app = mount(RootApp, { target: root })

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmount(app)
  })
}

export default app

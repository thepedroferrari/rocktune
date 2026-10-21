<script lang="ts">
/**
 * UnifiedNav - Top navigation bar
 *
 * Fixed navigation with:
 * - RockTune branding (logo/wordmark)
 * - Section links with active state via IntersectionObserver
 * - Share button (global action)
 * - Hamburger menu for mobile
 */

import { preloadSection, type SectionId } from '../lib/preload'
import { scrollToSection, scrollToTop } from '../lib/scroll'
import { openShareModal } from '../lib/state.svelte'

let menuOpen = $state(false)
let activeStep = $state(-1)

interface NavLink {
  href: string
  label: string
  step: number
}

const NAV_LINKS: NavLink[] = [
  { href: '#clean-first', label: 'Clean', step: 0 },
  { href: '#rig-check', label: 'Check', step: 1 },
  { href: '#quick-start', label: 'Loadouts', step: 2 },
  { href: '#hardware', label: 'Rig', step: 3 },
  { href: '#peripherals', label: 'Gear', step: 4 },
  { href: '#optimizations', label: 'Tuning', step: 5 },
  { href: '#software', label: 'Arsenal', step: 6 },
  { href: '#generate', label: 'Forge', step: 7 },
  { href: '#guide', label: 'Manual', step: 8 },
]

function toggleMenu() {
  menuOpen = !menuOpen
}

function closeMenu() {
  menuOpen = false
}

/**
 * Scroll-spy: one IntersectionObserver over the step sections. A section is
 * active while it crosses a thin band near the top of the viewport. Sections
 * that mount later (lazy) are picked up on the next re-observe, which runs
 * when the section list in the DOM changes length.
 */
$effect(() => {
  if (!('IntersectionObserver' in window)) return
  const stepById = new Map(NAV_LINKS.map((link) => [link.href.slice(1), link.step]))
  const observed = new Set<Element>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeStep = stepById.get(entry.target.id) ?? -1
      }
    },
    { rootMargin: '-80px 0px -70% 0px' },
  )
  const observeAll = () => {
    for (const id of stepById.keys()) {
      const el = document.getElementById(id)
      if (el && !observed.has(el)) {
        observed.add(el)
        observer.observe(el)
      }
    }
  }
  observeAll()
  // Lazy sections mount after first paint; re-check a few times, then stop.
  const timers = [1000, 4000, 9000].map((ms) => setTimeout(observeAll, ms))
  return () => {
    observer.disconnect()
    for (const t of timers) clearTimeout(t)
  }
})

function handlePreload(link: NavLink) {
  const sectionId = link.href.replace('#', '') as SectionId
  preloadSection(sectionId)
}

async function handleClick(event: MouseEvent, link: NavLink) {
  event.preventDefault()
  const sectionId = link.href.replace('#', '') as SectionId

  preloadSection(sectionId)

  activeStep = link.step
  closeMenu()

  await scrollToSection({ sectionId })
}

function handleMobileShare() {
  openShareModal()
  closeMenu()
}
</script>

<nav
  class="unified-nav"
  class:menu-open={menuOpen}
  aria-label="Main navigation"
>
  <button
    type="button"
    class="nav-brand"
    aria-label="RockTune - Back to top"
    onclick={() => scrollToTop()}
  >
    <svg aria-hidden="true" class="brand-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
    <span class="brand-text">RockTune</span>
  </button>

  <ul class="links links--desktop" role="list">
    {#each NAV_LINKS as link (link.step)}
      <li>
        <a
          href={link.href}
          class="nav-link"
          class:active={activeStep === link.step}
          data-step={link.step}
          onmouseenter={() => handlePreload(link)}
          onfocusin={() => handlePreload(link)}
          onclick={(e) => handleClick(e, link)}
        >
          <span class="nav-step" aria-hidden="true">{link.step}</span>
          {link.label}
        </a>
      </li>
    {/each}
  </ul>

  <div class="nav-actions">
    <button
      type="button"
      class="btn-share btn-share--desktop"
      title="Share your build configuration"
      onclick={openShareModal}
    >
      <svg aria-hidden="true"
        class="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Share
    </button>
  </div>

  <button
    type="button"
    class="nav-toggle"
    aria-expanded={menuOpen}
    aria-controls="mobile-menu"
    onclick={toggleMenu}
  >
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="sr-only">{menuOpen ? "Close" : "Open"} menu</span>
  </button>

  {#if menuOpen}
    <div class="mobile-menu" id="mobile-menu">
      <ul class="mobile-links" role="list">
        {#each NAV_LINKS as link (link.step)}
          <li>
            <a
              href={link.href}
              class="mobile-link"
              class:active={activeStep === link.step}
              onmouseenter={() => handlePreload(link)}
              onfocusin={() => handlePreload(link)}
              onclick={(e) => handleClick(e, link)}
            >
              {link.label}
            </a>
          </li>
        {/each}
      </ul>
      <hr class="mobile-divider" />
      <button type="button" class="mobile-share" onclick={handleMobileShare}>
        <svg aria-hidden="true"
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share Build
      </button>
      <hr class="mobile-divider" />
      <a
        href="https://github.com/thepedroferrari/rocktune/tree/{__BUILD_COMMIT__}"
        target="blank"
        rel="noopener"
        class="mobile-github"
      >
        <svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"
          />
        </svg>
        {__BUILD_COMMIT__} · {__BUILD_DATE__}
      </a>
    </div>
  {/if}
</nav>

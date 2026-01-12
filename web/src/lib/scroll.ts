/**
 * Smart scrolling utilities
 *
 * Handles scrolling to lazy-loaded sections by waiting for them to render
 * before calculating scroll position. Prevents incorrect scroll positions
 * when target elements or their ancestors are still loading.
 */

interface ScrollToSectionOptions {
  /** Section ID (without #) to scroll to */
  sectionId: string
  /** Scroll behavior (default: 'smooth') */
  behavior?: ScrollBehavior
  /** Scroll alignment (default: 'start') */
  block?: ScrollLogicalPosition
  /** Max time to wait for element to render in ms (default: 3000) */
  timeout?: number
}

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const ARRIVAL_CLASS = 'section-arrive'
const ARRIVAL_DURATION_MS = 600

function resolveBehavior(behavior: ScrollBehavior): ScrollBehavior {
  if (behavior !== 'smooth') return behavior
  return prefersReducedMotion ? 'auto' : 'smooth'
}

function triggerArrivalPulse(target: HTMLElement): void {
  if (prefersReducedMotion) return
  target.classList.remove(ARRIVAL_CLASS)
  void target.offsetWidth
  target.classList.add(ARRIVAL_CLASS)
  window.setTimeout(() => {
    target.classList.remove(ARRIVAL_CLASS)
  }, ARRIVAL_DURATION_MS)
}

export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return
  const resolvedBehavior = resolveBehavior(behavior)
  window.scrollTo({ top: 0, behavior: resolvedBehavior })
}

/**
 * Scroll to a section, waiting for it to exist and render if needed
 *
 * Uses MutationObserver to detect when lazy-loaded sections appear in the DOM
 * and have calculated height. Falls back to immediate scroll if element exists.
 *
 * @param options - Scroll configuration
 * @returns Promise<boolean> - true if scrolled successfully, false if timed out
 *
 * @example
 * ```ts
 * // Scroll to hardware section
 * await scrollToSection({ sectionId: 'hardware' });
 *
 * // Scroll with custom behavior
 * await scrollToSection({
 *   sectionId: 'generate',
 *   behavior: 'auto',
 *   block: 'center'
 * });
 * ```
 */
export async function scrollToSection({
  sectionId,
  behavior = 'smooth',
  block = 'start',
  timeout = 3000,
}: ScrollToSectionOptions): Promise<boolean> {
  const target = document.getElementById(sectionId)

  // If element exists and has content, scroll immediately
  if (target && target.offsetHeight > 0) {
    const resolvedBehavior = resolveBehavior(behavior)
    target.scrollIntoView({ behavior: resolvedBehavior, block })
    triggerArrivalPulse(target)
    return true
  }

  // Wait for element to appear and have content
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      observer.disconnect()
      // Still try to scroll even if we timed out
      const el = document.getElementById(sectionId)
      if (el) {
        const resolvedBehavior = resolveBehavior(behavior)
        el.scrollIntoView({ behavior: resolvedBehavior, block })
        triggerArrivalPulse(el)
      }
      resolve(false)
    }, timeout)

    const observer = new MutationObserver(() => {
      const el = document.getElementById(sectionId)
      if (el && el.offsetHeight > 0) {
        observer.disconnect()
        clearTimeout(timeoutId)

        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          const resolvedBehavior = resolveBehavior(behavior)
          el.scrollIntoView({ behavior: resolvedBehavior, block })
          triggerArrivalPulse(el)
          resolve(true)
        })
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
  })
}

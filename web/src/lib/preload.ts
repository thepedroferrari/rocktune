/**
 * Section preloading utilities
 *
 * Eager-loads lazy-imported sections when user shows intent (hover/focus)
 * to reduce perceived load time during navigation.
 */

const preloadCache = new Map<string, Promise<unknown>>()

/**
 * Map of section IDs to their dynamic import functions
 * Must match the section IDs used in RootApp.svelte
 */
export const SECTION_IMPORTS = {
  hardware: () => import('../components/HardwareSection.svelte'),
  peripherals: () => import('../components/PeripheralsSection.svelte'),
  optimizations: () => import('../components/OptimizationsSection.svelte'),
  software: () =>
    Promise.all([
      import('../components/Filters.svelte'),
      import('../components/SoftwareGrid.svelte'),
    ]),
  generate: () => import('../components/ForgeSection.svelte'),
  guide: () => import('../components/ManualStepsSection.svelte'),
} as const

export type SectionId = keyof typeof SECTION_IMPORTS

/**
 * Preload a section's lazy-imported components
 * Safe to call multiple times - only preloads once per section
 *
 * @param sectionId - Section identifier (e.g., 'hardware', 'generate')
 * @example
 * ```ts
 * // Preload on hover
 * <a onmouseenter={() => preloadSection('hardware')}>Hardware</a>
 * ```
 */
export function preloadSection(sectionId: SectionId): void {
  if (preloadCache.has(sectionId)) {
    return
  }

  const importFn = SECTION_IMPORTS[sectionId]
  if (importFn) {
    const promise = importFn()
    preloadCache.set(sectionId, promise)
  }
}

/**
 * Check if a section has been preloaded
 * @param sectionId - Section identifier
 * @returns true if section import is in cache
 */
export function isPreloaded(sectionId: SectionId): boolean {
  return preloadCache.has(sectionId)
}

/**
 * Clear preload cache (useful for testing)
 */
export function clearPreloadCache(): void {
  preloadCache.clear()
}

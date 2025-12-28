/**
 * RockTune State - Svelte 5 Runes
 *
 * Single source of truth for app state using $state and $derived.
 * Replaces the old Store class with fine-grained reactivity.
 */

import type {
  AppEventName,
  CpuType,
  FilterValue,
  GpuType,
  HardwareProfile,
  PackageKey,
  PresetType,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import {
  CPU_TYPES,
  FILTER_ALL,
  GPU_TYPES,
  isFilterAll,
  isFilterRecommended,
  isFilterSelected,
  VIEW_MODES,
} from './types'

/** Default hardware configuration */
const DEFAULT_HARDWARE: HardwareProfile = {
  cpu: CPU_TYPES.AMD_X3D,
  gpu: GPU_TYPES.NVIDIA,
  peripherals: [],
  monitorSoftware: [],
}

export const app = $state({
  /** Software catalog loaded from catalog.json */
  software: {} as SoftwareCatalog,

  /** Currently selected packages */
  selected: new Set<PackageKey>(),

  /** Current filter: 'all', 'selected', 'recommended', or a category */
  filter: FILTER_ALL as FilterValue,

  /** Search query */
  search: '',

  /** View mode: 'grid' or 'list' */
  view: VIEW_MODES.GRID as ViewMode,

  /** Recommended packages from active preset (for 'recommended' filter) */
  recommendedPackages: new Set<PackageKey>(),

  /** Active preset selection (if any) */
  activePreset: null as PresetType | null,

  /** Hardware profile (CPU, GPU, peripherals) */
  hardware: { ...DEFAULT_HARDWARE } as HardwareProfile,

  /** Number of enabled optimizations */
  optimizationCount: 0,
})

function emitAppEvent(name: AppEventName, detail: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

/** Count of selected packages */
export function getSelectedCount(): number {
  return app.selected.size
}

/** Total packages in catalog */
export function getTotalCount(): number {
  return Object.keys(app.software).length
}

/** Whether any packages are selected */
export function getHasSelection(): boolean {
  return app.selected.size > 0
}

/** Filtered and searched software list */
export function getFiltered(): [PackageKey, SoftwarePackage][] {
  const searchLower = app.search.toLowerCase()

  return Object.entries(app.software).filter(([key, pkg]) => {
    // Filter by category, selection, or recommended
    let matchesFilter: boolean
    if (isFilterAll(app.filter)) {
      matchesFilter = true
    } else if (isFilterSelected(app.filter)) {
      matchesFilter = app.selected.has(key as PackageKey)
    } else if (isFilterRecommended(app.filter)) {
      matchesFilter = app.recommendedPackages.has(key as PackageKey)
    } else {
      matchesFilter = pkg.category === app.filter
    }

    // Filter by search term
    const matchesSearch =
      !app.search ||
      pkg.name.toLowerCase().includes(searchLower) ||
      pkg.desc?.toLowerCase().includes(searchLower) ||
      pkg.category.toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  }) as [PackageKey, SoftwarePackage][]
}

/** Category counts for filter badges */
export function getCategoryCounts(): Record<string, number> {
  const packages = Object.values(app.software)
  const grouped = Object.groupBy(packages, (pkg) => pkg.category)

  const counts: Record<string, number> = { all: packages.length }
  for (const [category, pkgs] of Object.entries(grouped)) {
    counts[category] = pkgs?.length ?? 0
  }
  counts.selected = app.selected.size

  return counts
}

/**
 * Toggle a software package selection
 * Returns the new selection state
 */
export function toggleSoftware(key: PackageKey): boolean {
  const wasSelected = app.selected.has(key)

  if (wasSelected) {
    app.selected.delete(key)
  } else {
    app.selected.add(key)
  }

  // Trigger reactivity by reassigning the Set
  app.selected = new Set(app.selected)

  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
  return !wasSelected
}

/**
 * Clear all selections
 */
export function clearSelection(): void {
  app.selected = new Set()
  emitAppEvent('software-selection-changed', { selected: [] })
}

/**
 * Set selection to specific keys
 */
export function setSelection(keys: readonly PackageKey[]): void {
  app.selected = new Set(keys)
  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
}

/**
 * Load software catalog and pre-select default packages
 */
export function setSoftware(catalog: SoftwareCatalog): void {
  app.software = catalog

  // Pre-select packages marked as selected in catalog
  const preSelected = new Set<PackageKey>()
  for (const [key, pkg] of Object.entries(catalog)) {
    if (pkg.selected) {
      preSelected.add(key as PackageKey)
    }
  }

  const mergedSelection = new Set<PackageKey>()
  for (const key of app.selected) {
    if (key in catalog) {
      mergedSelection.add(key)
    }
  }
  for (const key of preSelected) {
    mergedSelection.add(key)
  }

  app.selected = mergedSelection
  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
}

/**
 * Set the current filter
 */
export function setFilter(filter: FilterValue): void {
  app.filter = filter
}

/**
 * Set the search term
 */
export function setSearch(term: string): void {
  app.search = term
}

/**
 * Set the view mode
 */
export function setView(view: ViewMode): void {
  app.view = view
}

/**
 * Set recommended packages (from active preset)
 */
export function setRecommendedPackages(keys: readonly string[]): void {
  app.recommendedPackages = new Set(keys as PackageKey[])
}

/**
 * Clear recommended packages
 */
export function clearRecommendedPackages(): void {
  app.recommendedPackages = new Set()
}

/**
 * Set the active preset
 */
export function setActivePreset(preset: PresetType | null): void {
  app.activePreset = preset
  emitAppEvent('preset-applied', { preset })
}

/**
 * Set CPU type
 */
export function setCpu(cpu: CpuType): void {
  app.hardware = { ...app.hardware, cpu }
}

/**
 * Set GPU type
 */
export function setGpu(gpu: GpuType): void {
  app.hardware = { ...app.hardware, gpu }
}

/**
 * Set full hardware profile
 */
export function setHardware(hardware: Partial<HardwareProfile>): void {
  app.hardware = { ...app.hardware, ...hardware }
}

/**
 * Set optimization count
 */
export function setOptimizationCount(count: number): void {
  app.optimizationCount = count
}

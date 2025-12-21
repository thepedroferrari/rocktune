import type {
  FilterValue,
  MutableAppState,
  PackageKey,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import { FILTER_ALL, isFilterAll, VIEW_MODES } from './types'

// =============================================================================
// LISTENER TYPES
// =============================================================================

type Listener = () => void
type Unsubscribe = () => void

// =============================================================================
// STORE CLASS - Immutable external API, mutable internal state
// =============================================================================

class Store {
  private state = {
    software: {} as Record<string, SoftwarePackage>,
    selectedSoftware: new Set<string>(),
    currentFilter: FILTER_ALL as FilterValue,
    searchTerm: '',
    currentView: VIEW_MODES.GRID,
  } satisfies MutableAppState

  private readonly listeners = new Set<Listener>()

  // ===========================================================================
  // GETTERS - Return immutable views of state
  // ===========================================================================

  get software(): SoftwareCatalog {
    return Object.freeze({ ...this.state.software }) as SoftwareCatalog
  }

  get selectedSoftware(): ReadonlySet<PackageKey> {
    return new Set(this.state.selectedSoftware) as ReadonlySet<PackageKey>
  }

  get currentFilter(): FilterValue {
    return this.state.currentFilter
  }

  get searchTerm(): string {
    return this.state.searchTerm
  }

  get currentView(): ViewMode {
    return this.state.currentView
  }

  // ===========================================================================
  // PACKAGE ACCESS - With overloads for better inference
  // ===========================================================================

  getPackage(key: PackageKey): Readonly<SoftwarePackage>
  getPackage(key: string): Readonly<SoftwarePackage> | undefined
  getPackage(key: string): Readonly<SoftwarePackage> | undefined {
    const pkg = this.state.software[key]
    return pkg ? Object.freeze({ ...pkg }) : undefined
  }

  hasPackage(key: string): key is PackageKey {
    return key in this.state.software
  }

  // ===========================================================================
  // SELECTION MANAGEMENT
  // ===========================================================================

  isSelected(key: PackageKey): boolean
  isSelected(key: string): boolean {
    return this.state.selectedSoftware.has(key)
  }

  toggleSoftware(key: PackageKey): boolean
  toggleSoftware(key: string): boolean {
    const isCurrentlySelected = this.state.selectedSoftware.has(key)
    if (isCurrentlySelected) {
      this.state.selectedSoftware.delete(key)
    } else {
      this.state.selectedSoftware.add(key)
    }
    this.notify()
    return !isCurrentlySelected
  }

  clearSelection(): void {
    this.state.selectedSoftware.clear()
    this.notify()
  }

  setSelection(keys: readonly string[]): void {
    this.state.selectedSoftware = new Set(keys)
    this.notify()
  }

  // ===========================================================================
  // CATALOG MANAGEMENT
  // ===========================================================================

  setSoftware(catalog: SoftwareCatalog): void {
    this.state.software = { ...catalog }
    // Initialize selected from catalog defaults
    for (const [key, pkg] of Object.entries(catalog)) {
      if (pkg.selected) {
        this.state.selectedSoftware.add(key)
      }
    }
    this.notify()
  }

  // ===========================================================================
  // FILTER & SEARCH
  // ===========================================================================

  setFilter(filter: FilterValue): void {
    this.state.currentFilter = filter
    this.notify()
  }

  setSearchTerm(term: string): void {
    this.state.searchTerm = term
    this.notify()
  }

  setView(view: ViewMode): void {
    this.state.currentView = view
    this.notify()
  }

  // ===========================================================================
  // DERIVED STATE - Computed from current state
  // ===========================================================================

  getFilteredSoftware(): readonly [PackageKey, Readonly<SoftwarePackage>][] {
    const { software, currentFilter, searchTerm } = this.state
    const searchLower = searchTerm.toLowerCase()

    return Object.entries(software)
      .filter(([_, pkg]) => {
        const matchesFilter = isFilterAll(currentFilter) || pkg.category === currentFilter
        const matchesSearch =
          !searchTerm ||
          pkg.name.toLowerCase().includes(searchLower) ||
          pkg.desc?.toLowerCase().includes(searchLower) ||
          pkg.category.toLowerCase().includes(searchLower)

        return matchesFilter && matchesSearch
      })
      .map(([key, pkg]) => [key as PackageKey, Object.freeze({ ...pkg })] as const)
  }

  getCategoryCounts(): Readonly<Record<string, number>> {
    const counts: Record<string, number> = { all: 0 }
    for (const pkg of Object.values(this.state.software)) {
      counts.all++
      counts[pkg.category] = (counts[pkg.category] ?? 0) + 1
    }
    return Object.freeze(counts)
  }

  get selectedCount(): number {
    return this.state.selectedSoftware.size
  }

  get totalCount(): number {
    return Object.keys(this.state.software).length
  }

  // ===========================================================================
  // SUBSCRIPTION SYSTEM
  // ===========================================================================

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const store = new Store()

// Re-export store type for testing
export type { Store }

import type { AppState, SoftwareCatalog, SoftwarePackage } from './types'

type Listener = () => void

class Store {
  private state: AppState = {
    software: {},
    selectedSoftware: new Set(),
    currentFilter: 'all',
    searchTerm: '',
    currentView: 'grid',
  }

  private listeners: Set<Listener> = new Set()

  // Getters
  get software(): SoftwareCatalog {
    return this.state.software
  }

  get selectedSoftware(): Set<string> {
    return this.state.selectedSoftware
  }

  get currentFilter(): string {
    return this.state.currentFilter
  }

  get searchTerm(): string {
    return this.state.searchTerm
  }

  get currentView(): 'grid' | 'list' {
    return this.state.currentView
  }

  // Get package by key
  getPackage(key: string): SoftwarePackage | undefined {
    return this.state.software[key]
  }

  // Setters
  setSoftware(catalog: SoftwareCatalog): void {
    this.state.software = catalog
    // Initialize selected from catalog defaults
    for (const [key, pkg] of Object.entries(catalog)) {
      if (pkg.selected) {
        this.state.selectedSoftware.add(key)
      }
    }
    this.notify()
  }

  toggleSoftware(key: string): boolean {
    const isSelected = this.state.selectedSoftware.has(key)
    if (isSelected) {
      this.state.selectedSoftware.delete(key)
    } else {
      this.state.selectedSoftware.add(key)
    }
    this.notify()
    return !isSelected
  }

  setFilter(filter: string): void {
    this.state.currentFilter = filter
    this.notify()
  }

  setSearchTerm(term: string): void {
    this.state.searchTerm = term
    this.notify()
  }

  setView(view: 'grid' | 'list'): void {
    this.state.currentView = view
    this.notify()
  }

  clearSelection(): void {
    this.state.selectedSoftware.clear()
    this.notify()
  }

  setSelection(keys: string[]): void {
    this.state.selectedSoftware = new Set(keys)
    this.notify()
  }

  // Get filtered software list
  getFilteredSoftware(): [string, SoftwarePackage][] {
    const { software, currentFilter, searchTerm } = this.state
    const searchLower = searchTerm.toLowerCase()

    return Object.entries(software).filter(([_, pkg]) => {
      const matchesFilter = currentFilter === 'all' || pkg.category === currentFilter
      const matchesSearch =
        !searchTerm ||
        pkg.name.toLowerCase().includes(searchLower) ||
        pkg.desc?.toLowerCase().includes(searchLower) ||
        pkg.category.toLowerCase().includes(searchLower)

      return matchesFilter && matchesSearch
    })
  }

  // Get category counts
  getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: 0 }
    for (const pkg of Object.values(this.state.software)) {
      counts.all++
      counts[pkg.category] = (counts[pkg.category] || 0) + 1
    }
    return counts
  }

  // Subscribe to state changes
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

// Singleton store instance
export const store = new Store()

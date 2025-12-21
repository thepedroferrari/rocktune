import { assertEquals, assertNotStrictEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts'
import { beforeEach, describe, it } from 'https://deno.land/std@0.220.0/testing/bdd.ts'

import type {
  Category,
  FilterValue,
  MutableAppState,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types.ts'
import { asPackageKey, asWingetId, FILTER_ALL, isFilterAll, VIEW_MODES } from './types.ts'

// =============================================================================
// TEST STORE - Mirrors the actual store but for isolated testing
// =============================================================================

type Listener = () => void

class TestStore {
  private state: MutableAppState = {
    software: {},
    selectedSoftware: new Set(),
    currentFilter: FILTER_ALL,
    searchTerm: '',
    currentView: VIEW_MODES.GRID,
  }

  private listeners: Set<Listener> = new Set()

  get software(): SoftwareCatalog {
    return Object.freeze({ ...this.state.software }) as SoftwareCatalog
  }

  get selectedSoftware(): ReadonlySet<string> {
    return new Set(this.state.selectedSoftware)
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

  getPackage(key: string): Readonly<SoftwarePackage> | undefined {
    const pkg = this.state.software[key]
    return pkg ? Object.freeze({ ...pkg }) : undefined
  }

  isSelected(key: string): boolean {
    return this.state.selectedSoftware.has(key)
  }

  get selectedCount(): number {
    return this.state.selectedSoftware.size
  }

  setSoftware(catalog: SoftwareCatalog): void {
    this.state.software = { ...catalog }
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

  clearSelection(): void {
    this.state.selectedSoftware.clear()
    this.notify()
  }

  setSelection(keys: readonly string[]): void {
    this.state.selectedSoftware = new Set(keys)
    this.notify()
  }

  getFilteredSoftware(): [string, Readonly<SoftwarePackage>][] {
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
      .map(([key, pkg]) => [key, Object.freeze({ ...pkg })])
  }

  getCategoryCounts(): Readonly<Record<string, number>> {
    const counts: Record<string, number> = { all: 0 }
    for (const pkg of Object.values(this.state.software)) {
      counts.all++
      counts[pkg.category] = (counts[pkg.category] ?? 0) + 1
    }
    return Object.freeze(counts)
  }

  subscribe(listener: Listener): () => void {
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

  reset(): void {
    this.state = {
      software: {},
      selectedSoftware: new Set(),
      currentFilter: FILTER_ALL,
      searchTerm: '',
      currentView: VIEW_MODES.GRID,
    }
    this.listeners.clear()
  }
}

// =============================================================================
// MOCK DATA HELPERS
// =============================================================================

function createMockPackage(
  id: string,
  name: string,
  category: Category,
  desc: string,
  selected?: boolean,
): SoftwarePackage {
  return {
    id: asWingetId(id),
    name,
    category,
    desc,
    selected,
  }
}

function createMockCatalog(): SoftwareCatalog {
  return {
    [asPackageKey('discord')]: createMockPackage(
      'Discord.Discord',
      'Discord',
      'gaming',
      'Voice and text chat',
      true,
    ),
    [asPackageKey('steam')]: createMockPackage(
      'Valve.Steam',
      'Steam',
      'launcher',
      'Game launcher',
      false,
    ),
    [asPackageKey('obs')]: createMockPackage(
      'OBSProject.OBSStudio',
      'OBS Studio',
      'streaming',
      'Streaming software',
    ),
  } as SoftwareCatalog
}

// =============================================================================
// TESTS
// =============================================================================

describe('Store', () => {
  let store: TestStore

  beforeEach(() => {
    store = new TestStore()
  })

  describe('initialization', () => {
    it('should start with empty software catalog', () => {
      assertEquals(Object.keys(store.software).length, 0)
    })

    it('should start with no selected software', () => {
      assertEquals(store.selectedSoftware.size, 0)
    })

    it('should start with default filter "all"', () => {
      assertEquals(store.currentFilter, FILTER_ALL)
    })

    it('should start with grid view', () => {
      assertEquals(store.currentView, VIEW_MODES.GRID)
    })
  })

  describe('setSoftware', () => {
    it('should load software catalog', () => {
      store.setSoftware(createMockCatalog())
      assertEquals(Object.keys(store.software).length, 3)
    })

    it('should auto-select packages with selected: true', () => {
      store.setSoftware(createMockCatalog())
      assertEquals(store.isSelected('discord'), true)
      assertEquals(store.isSelected('steam'), false)
    })
  })

  describe('immutability', () => {
    it('should return frozen software catalog', () => {
      store.setSoftware(createMockCatalog())
      const software = store.software
      assertNotStrictEquals(software, store.software)
    })

    it('should return new Set for selectedSoftware', () => {
      store.setSoftware(createMockCatalog())
      const selected = store.selectedSoftware
      assertNotStrictEquals(selected, store.selectedSoftware)
    })

    it('should return frozen package from getPackage', () => {
      store.setSoftware(createMockCatalog())
      const pkg = store.getPackage('discord')
      assertEquals(pkg?.name, 'Discord')
      assertEquals(Object.isFrozen(pkg), true)
    })
  })

  describe('toggleSoftware', () => {
    beforeEach(() => {
      store.setSoftware(createMockCatalog())
    })

    it('should add unselected software to selection', () => {
      const result = store.toggleSoftware('steam')
      assertEquals(result, true)
      assertEquals(store.isSelected('steam'), true)
    })

    it('should remove selected software from selection', () => {
      const result = store.toggleSoftware('discord')
      assertEquals(result, false)
      assertEquals(store.isSelected('discord'), false)
    })
  })

  describe('setFilter', () => {
    it('should update current filter', () => {
      store.setFilter('gaming')
      assertEquals(store.currentFilter, 'gaming')
    })
  })

  describe('setSearchTerm', () => {
    it('should update search term', () => {
      store.setSearchTerm('discord')
      assertEquals(store.searchTerm, 'discord')
    })
  })

  describe('setView', () => {
    it('should update view mode', () => {
      store.setView(VIEW_MODES.LIST)
      assertEquals(store.currentView, VIEW_MODES.LIST)
    })
  })

  describe('getFilteredSoftware', () => {
    beforeEach(() => {
      store.setSoftware(createMockCatalog())
    })

    it('should return all packages with filter "all"', () => {
      const filtered = store.getFilteredSoftware()
      assertEquals(filtered.length, 3)
    })

    it('should filter by category', () => {
      store.setFilter('gaming')
      const filtered = store.getFilteredSoftware()
      assertEquals(filtered.length, 1)
      assertEquals(filtered[0][1].name, 'Discord')
    })

    it('should filter by search term', () => {
      store.setSearchTerm('steam')
      const filtered = store.getFilteredSoftware()
      assertEquals(filtered.length, 1)
      assertEquals(filtered[0][1].name, 'Steam')
    })

    it('should filter by description', () => {
      store.setSearchTerm('voice')
      const filtered = store.getFilteredSoftware()
      assertEquals(filtered.length, 1)
      assertEquals(filtered[0][1].name, 'Discord')
    })
  })

  describe('getCategoryCounts', () => {
    it('should return correct counts', () => {
      store.setSoftware(createMockCatalog())
      const counts = store.getCategoryCounts()
      assertEquals(counts.all, 3)
      assertEquals(counts.gaming, 1)
      assertEquals(counts.launcher, 1)
      assertEquals(counts.streaming, 1)
    })

    it('should return frozen object', () => {
      store.setSoftware(createMockCatalog())
      const counts = store.getCategoryCounts()
      assertEquals(Object.isFrozen(counts), true)
    })
  })

  describe('subscribe', () => {
    it('should notify listeners on state change', () => {
      let callCount = 0
      store.subscribe(() => {
        callCount++
      })

      store.setSoftware(createMockCatalog())
      assertEquals(callCount, 1)

      store.toggleSoftware('steam')
      assertEquals(callCount, 2)
    })

    it('should return unsubscribe function', () => {
      let callCount = 0
      const unsubscribe = store.subscribe(() => {
        callCount++
      })

      store.setFilter('gaming')
      assertEquals(callCount, 1)

      unsubscribe()
      store.setFilter('launcher')
      assertEquals(callCount, 1)
    })
  })

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      store.setSoftware(createMockCatalog())
      assertEquals(store.selectedCount, 1)

      store.clearSelection()
      assertEquals(store.selectedCount, 0)
    })
  })

  describe('setSelection', () => {
    it('should replace selection with provided keys', () => {
      store.setSoftware(createMockCatalog())
      store.setSelection(['steam', 'obs'])

      assertEquals(store.isSelected('steam'), true)
      assertEquals(store.isSelected('obs'), true)
      assertEquals(store.isSelected('discord'), false)
    })
  })
})

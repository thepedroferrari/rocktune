import type {
  AppEventName,
  CpuType,
  DnsProviderType,
  FilterValue,
  GpuType,
  HardwareProfile,
  MonitorSoftwareType,
  OptimizationKey,
  PackageKey,
  PeripheralType,
  PresetType,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import {
  CPU_TYPES,
  DNS_PROVIDERS,
  FILTER_ALL,
  GPU_TYPES,
  isFilterAll,
  isFilterRecommended,
  isFilterSelected,
  isPackageKey,
  VIEW_MODES,
} from './types'

/** Script view mode for code viewer */
export type ScriptMode = 'current' | 'diff' | 'edit'

export interface ScriptState {
  generated: string
  previous: string
  edited: string | null
  mode: ScriptMode
  downloaded: boolean
  verified: boolean
}

export interface UIState {
  previewModalOpen: boolean
  shareModalOpen: boolean
  wizardMode: boolean
  ludicrousAcknowledged: boolean
  restorePointAcknowledged: boolean
}

export interface ScriptBuildOptions {
  includeTimer: boolean
  includeManualSteps: boolean
  createBackup: boolean
}

interface AppStore {
  software: SoftwareCatalog
  selected: Set<PackageKey>
  filter: FilterValue
  search: string
  view: ViewMode
  recommendedPackages: Set<PackageKey>
  activePreset: PresetType | null
  hardware: HardwareProfile
  optimizations: Set<OptimizationKey>
  peripherals: Set<PeripheralType>
  monitorSoftware: Set<MonitorSoftwareType>
  dnsProvider: DnsProviderType
  script: ScriptState
  ui: UIState
  /** Build options for script generation */
  buildOptions: ScriptBuildOptions
}

const DEFAULT_HARDWARE: HardwareProfile = {
  cpu: CPU_TYPES.AMD_X3D,
  gpu: GPU_TYPES.NVIDIA,
  peripherals: [],
  monitorSoftware: [],
}

const DEFAULT_SCRIPT: ScriptState = {
  generated: '',
  previous: '',
  edited: null,
  mode: 'current',
  downloaded: false,
  verified: false,
}

const DEFAULT_UI: UIState = {
  previewModalOpen: false,
  shareModalOpen: false,
  wizardMode: false,
  ludicrousAcknowledged: false,
  restorePointAcknowledged: false,
}

const DEFAULT_BUILD_OPTIONS: ScriptBuildOptions = {
  includeTimer: true,
  includeManualSteps: false,
  createBackup: true,
}

const DEFAULT_CATALOG: SoftwareCatalog = {}
const DEFAULT_ACTIVE_PRESET: PresetType | null = null
const DEFAULT_FILTER: FilterValue = FILTER_ALL
const DEFAULT_VIEW: ViewMode = VIEW_MODES.GRID
const DEFAULT_DNS_PROVIDER: DnsProviderType = DNS_PROVIDERS.CLOUDFLARE

export const app: AppStore = $state({
  software: DEFAULT_CATALOG,
  selected: new Set<PackageKey>(),
  filter: DEFAULT_FILTER,
  search: '',
  view: DEFAULT_VIEW,
  recommendedPackages: new Set<PackageKey>(),
  activePreset: DEFAULT_ACTIVE_PRESET,
  hardware: { ...DEFAULT_HARDWARE },
  optimizations: new Set<OptimizationKey>(),
  peripherals: new Set<PeripheralType>(),
  monitorSoftware: new Set<MonitorSoftwareType>(),
  dnsProvider: DEFAULT_DNS_PROVIDER,
  script: { ...DEFAULT_SCRIPT },
  ui: { ...DEFAULT_UI },
  buildOptions: { ...DEFAULT_BUILD_OPTIONS },
})

function emitAppEvent(name: AppEventName, detail: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export function getSelectedCount(): number {
  return app.selected.size
}

export function getTotalCount(): number {
  return Object.keys(app.software).length
}

export function getFiltered(): [PackageKey, SoftwarePackage][] {
  const searchLower = app.search.toLowerCase()

  return Object.entries(app.software).filter((entry): entry is [PackageKey, SoftwarePackage] => {
    const [key, pkg] = entry
    if (!isPackageKey(app.software, key)) return false

    let matchesFilter: boolean
    if (isFilterAll(app.filter)) {
      matchesFilter = true
    } else if (isFilterSelected(app.filter)) {
      matchesFilter = app.selected.has(key)
    } else if (isFilterRecommended(app.filter)) {
      matchesFilter = app.recommendedPackages.has(key)
    } else {
      matchesFilter = pkg.category === app.filter
    }

    const matchesSearch =
      !app.search ||
      pkg.name.toLowerCase().includes(searchLower) ||
      pkg.desc?.toLowerCase().includes(searchLower) ||
      pkg.category.toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  })
}

export function getCategoryCounts(): Record<string, number> {
  const packages = Object.values(app.software)
  const counts: Record<string, number> = { all: packages.length }
  for (const pkg of packages) {
    counts[pkg.category] = (counts[pkg.category] ?? 0) + 1
  }
  counts.selected = app.selected.size

  return counts
}

export function toggleSoftware(key: PackageKey): boolean {
  const wasSelected = app.selected.has(key)

  app.selected = toggledSet(app.selected, key)

  emitAppEvent('software-selection-changed', {
    selected: Array.from(app.selected),
  })
  return !wasSelected
}

export function clearSelection(): void {
  app.selected = new Set()
  emitAppEvent('software-selection-changed', { selected: [] })
}

export function setSelection(keys: readonly PackageKey[]): void {
  app.selected = new Set(keys)
  emitAppEvent('software-selection-changed', {
    selected: Array.from(app.selected),
  })
}

export function setSoftware(catalog: SoftwareCatalog): void {
  app.software = catalog

  const preSelected = new Set(
    Object.entries(catalog)
      .filter(([key, pkg]) => isPackageKey(catalog, key) && pkg.selected)
      .map(([key]) => key as PackageKey),
  )

  const validSelected = new Set([...app.selected].filter((key) => key in catalog))

  app.selected = validSelected.union(preSelected)
  emitAppEvent('software-selection-changed', {
    selected: Array.from(app.selected),
  })
}

export function setFilter(filter: FilterValue): void {
  app.filter = filter
}

export function setView(view: ViewMode): void {
  app.view = view
}

export function setRecommendedPackages(keys: readonly PackageKey[]): void {
  app.recommendedPackages = new Set(keys)
}

export function clearRecommendedPackages(): void {
  app.recommendedPackages = new Set()
}

export function setActivePreset(preset: PresetType | null): void {
  app.activePreset = preset
  emitAppEvent('preset-applied', { preset })
}

export function setCpu(cpu: CpuType): void {
  app.hardware = { ...app.hardware, cpu }
}

export function setGpu(gpu: GpuType): void {
  app.hardware = { ...app.hardware, gpu }
}

export function setDnsProvider(provider: DnsProviderType): void {
  app.dnsProvider = provider
}

/** Returns a new Set so Svelte sees the change; a mutated plain Set inside $state is not tracked. */
function toggledSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(item)) next.add(item)
  return next
}

export function toggleOptimization(key: OptimizationKey): boolean {
  app.optimizations = toggledSet(app.optimizations, key)
  return app.optimizations.has(key)
}

export function setOptimizations(keys: readonly OptimizationKey[]): void {
  app.optimizations = new Set(keys)
}

export function togglePeripheral(type: PeripheralType): boolean {
  app.peripherals = toggledSet(app.peripherals, type)
  return app.peripherals.has(type)
}

export function setPeripherals(types: readonly PeripheralType[]): void {
  app.peripherals = new Set(types)
}

export function toggleMonitorSoftware(type: MonitorSoftwareType): boolean {
  app.monitorSoftware = toggledSet(app.monitorSoftware, type)
  return app.monitorSoftware.has(type)
}

export function setMonitorSoftware(types: readonly MonitorSoftwareType[]): void {
  app.monitorSoftware = new Set(types)
}

export function setScriptDownloaded(downloaded: boolean): void {
  app.script = { ...app.script, downloaded }
}

export function openPreviewModal(): void {
  app.ui = { ...app.ui, previewModalOpen: true }
}

export function closePreviewModal(): void {
  app.ui = { ...app.ui, previewModalOpen: false }
}

export function openShareModal(): void {
  app.ui = { ...app.ui, shareModalOpen: true }
}

export function closeShareModal(): void {
  app.ui = { ...app.ui, shareModalOpen: false }
}

export function toggleWizardMode(): void {
  app.ui = { ...app.ui, wizardMode: !app.ui.wizardMode }
}

export function acknowledgeLudicrous(): void {
  app.ui = { ...app.ui, ludicrousAcknowledged: true }
}

export function acknowledgeRestorePointDisable(): void {
  app.ui = { ...app.ui, restorePointAcknowledged: true }
}

export function setIncludeTimer(include: boolean): void {
  app.buildOptions = { ...app.buildOptions, includeTimer: include }
}

export function setIncludeManualSteps(include: boolean): void {
  app.buildOptions = { ...app.buildOptions, includeManualSteps: include }
}

export function setCreateBackup(create: boolean): void {
  app.buildOptions = { ...app.buildOptions, createBackup: create }
}

export function setScriptMode(mode: ScriptMode): void {
  app.script = { ...app.script, mode }
}

export function setEditedScript(script: string | null): void {
  app.script = { ...app.script, edited: script }
}

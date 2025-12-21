// Software catalog types
export interface SoftwarePackage {
  id: string
  name: string
  category: Category
  icon?: string
  emoji?: string
  desc?: string
  selected?: boolean
}

export type Category =
  | 'launcher'
  | 'gaming'
  | 'streaming'
  | 'monitoring'
  | 'browser'
  | 'media'
  | 'utility'
  | 'rgb'
  | 'dev'
  | 'runtime'
  | 'benchmark'

export type SoftwareCatalog = Record<string, SoftwarePackage>

// Hardware profile types
export type CpuType = 'amd_x3d' | 'amd' | 'intel'
export type GpuType = 'nvidia' | 'amd' | 'intel'
export type PeripheralType = 'logitech' | 'razer' | 'corsair' | 'steelseries'

export interface HardwareProfile {
  cpu: CpuType
  gpu: GpuType
  peripherals: PeripheralType[]
}

// App state types
export interface AppState {
  software: SoftwareCatalog
  selectedSoftware: Set<string>
  currentFilter: string
  searchTerm: string
  currentView: 'grid' | 'list'
}

// Profile save/load types
export interface SavedProfile {
  version: string
  created: string
  hardware: HardwareProfile
  optimizations: string[]
  software: string[]
}

// Script generation types
export interface ScriptConfig {
  generated: string
  hardware: HardwareProfile
  optimizations: string[]
  packages: string[]
}

// Preset types
export type PresetType = 'competitive' | 'streaming' | 'balanced' | 'casual'

export interface Preset {
  name: PresetType
  hardware: Partial<HardwareProfile>
  optimizations: string[]
  software: string[]
}

// Category icon mapping
export const CATEGORY_ICONS: Record<Category | 'default', string> = {
  launcher: '🎮',
  gaming: '🎯',
  streaming: '📺',
  monitoring: '📊',
  browser: '🌐',
  media: '🎵',
  utility: '🔧',
  rgb: '💡',
  dev: '💻',
  runtime: '⚙️',
  benchmark: '📈',
  default: '📦',
}

// Simple Icons CDN base URL
export const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org'

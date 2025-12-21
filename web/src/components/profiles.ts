import { store } from '../state'
import type { PeripheralType, SavedProfile } from '../types'
import { $, $$, $id } from '../utils/dom'
import { renderSoftwareGrid } from './cards'
import { getHardwareProfile, getSelectedOptimizations, updateSummary } from './summary'

export function saveProfile(): void {
  const profile: SavedProfile = {
    version: '1.0',
    created: new Date().toISOString(),
    hardware: getHardwareProfile(),
    optimizations: getSelectedOptimizations(),
    software: Array.from(store.selectedSoftware),
  }

  const json = JSON.stringify(profile, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rocktune-profile-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadProfile(file: File): void {
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const result = e.target?.result
      if (typeof result !== 'string') return

      const profile: SavedProfile = JSON.parse(result)

      if (!profile.version) {
        throw new Error('Invalid profile format')
      }

      // Apply hardware settings
      if (profile.hardware?.cpu) {
        const cpuInput = $(`input[name="cpu"][value="${profile.hardware.cpu}"]`) as HTMLInputElement
        if (cpuInput) cpuInput.checked = true
      }

      if (profile.hardware?.gpu) {
        const gpuInput = $(`input[name="gpu"][value="${profile.hardware.gpu}"]`) as HTMLInputElement
        if (gpuInput) gpuInput.checked = true
      }

      if (profile.hardware?.peripherals) {
        $$<HTMLInputElement>('input[name="peripheral"]').forEach((el) => {
          el.checked = profile.hardware.peripherals.includes(el.value as PeripheralType)
        })
      }

      // Apply optimizations
      if (profile.optimizations) {
        $$<HTMLInputElement>('input[name="opt"]').forEach((el) => {
          el.checked = profile.optimizations.includes(el.value)
        })
      }

      // Apply software selections
      if (profile.software) {
        store.setSelection(profile.software)
        renderSoftwareGrid()
      }

      updateSummary()
      alert(
        `Profile loaded: ${profile.software?.length || 0} packages, ${profile.optimizations?.length || 0} optimizations`,
      )
    } catch (err) {
      alert(`Failed to load profile: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  reader.readAsText(file)
}

export function setupProfileActions(): void {
  $id('save-profile-btn')?.addEventListener('click', saveProfile)

  const loadInput = $id('load-profile-input') as HTMLInputElement | null
  loadInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      loadProfile(file)
      target.value = '' // Reset for next load
    }
  })
}

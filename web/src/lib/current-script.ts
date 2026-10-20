/**
 * Builds the script for the current app state.
 *
 * Kept out of state.svelte.ts so the script generator (about 200KB) loads
 * only with the Forge section and the preview modal, not on first paint.
 */
import { buildScript, type SelectionState } from './script-generator'
import { app } from './state.svelte'
import type { HardwareProfile } from './types'

function buildSelectionState(): SelectionState {
  const hardware: HardwareProfile = {
    cpu: app.hardware.cpu,
    gpu: app.hardware.gpu,
    peripherals: Array.from(app.peripherals),
    monitorSoftware: Array.from(app.monitorSoftware),
  }

  const packages = Array.from(app.selected)
  const missingPackages = packages.filter((key) => !(key in app.software))

  return {
    hardware,
    optimizations: Array.from(app.optimizations),
    packages: packages.filter((key) => key in app.software),
    missingPackages,
    preset: app.activePreset,
    includeTimer: app.buildOptions.includeTimer,
    includeManualSteps: app.buildOptions.includeManualSteps,
    createBackup: app.buildOptions.createBackup,
  }
}

export function generateCurrentScript(): string {
  if (Object.keys(app.software).length === 0) {
    return ''
  }

  return buildScript(buildSelectionState(), {
    catalog: app.software,
    dnsProvider: app.dnsProvider,
  })
}

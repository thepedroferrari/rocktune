<script lang="ts">
/**
 * Summary - Displays current loadout summary
 *
 * Reads hardware and optimization state from centralized app state.
 * Uses Svelte 5 $derived for all computed values.
 */
import { app, getSelectedCount } from '$lib/state.svelte'
import type { CpuType, GpuType } from '$lib/types'

const softwareCount = $derived(getSelectedCount())
const optimizationCount = $derived(app.optimizations.size)

const cpuLabels: Record<CpuType, string> = {
  amd_x3d: 'X3D',
  amd: 'AMD',
  intel: 'Intel',
}

const gpuLabels: Record<GpuType, string> = {
  nvidia: 'NVIDIA',
  amd: 'Radeon',
  intel: 'Arc',
}

const cpuLabel = $derived(cpuLabels[app.hardware.cpu] || app.hardware.cpu)
const gpuLabel = $derived(gpuLabels[app.hardware.gpu] || app.hardware.gpu)
const hardwareLabel = $derived(`${cpuLabel} + ${gpuLabel}`)
</script>

<div class="summary-shell">
  <div id="summary" class="summary">
    <div class="item">
      <span id="summary-hardware" class="value">{hardwareLabel}</span>
      <span class="label">Core</span>
    </div>
    <div class="item">
      <span id="summary-opts" class="value">{optimizationCount}</span>
      <span class="label">Upgrades</span>
    </div>
    <div class="item">
      <span id="summary-software" class="value">{softwareCount}</span>
      <span class="label">Arsenal</span>
    </div>
  </div>
</div>

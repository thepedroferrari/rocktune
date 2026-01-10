<script lang="ts">
/**
 * Summary - Displays current loadout summary
 *
 * Reads hardware and optimization state from centralized app state.
 * Uses Svelte 5 $derived for all computed values.
 */
import { app, getSelectedCount } from '$lib/state.svelte'
import type { CpuType, GpuType, PresetKey } from '$lib/types'

const softwareCount = $derived(getSelectedCount())
const optimizationCount = $derived(app.optimizations.size)
const peripheralCount = $derived(app.peripherals.size + app.monitorSoftware.size)

const cpuLabels: Record<CpuType, string> = {
  amd_x3d: 'AMD Ryzen X3D',
  amd: 'AMD Ryzen',
  intel: 'Intel Core',
}

const gpuLabels: Record<GpuType, string> = {
  nvidia: 'NVIDIA GeForce',
  amd: 'AMD Radeon',
  intel: 'Intel Arc',
}

const presetLabels: Record<PresetKey, string> = {
  competitive: 'Competitive',
  streaming: 'Streaming',
  balanced: 'Balanced',
  minimal: 'Minimal',
}

const cpuLabel = $derived(cpuLabels[app.hardware.cpu] || app.hardware.cpu)
const gpuLabel = $derived(gpuLabels[app.hardware.gpu] || app.hardware.gpu)
const presetLabel = $derived(app.activePreset ? presetLabels[app.activePreset] : null)
</script>

<div class="summary-shell">
  <div id="summary" class="summary">
    {#if presetLabel}
      <div class="item item--preset">
        <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span class="value">{presetLabel}</span>
      </div>
    {/if}
    <div class="item item--hardware">
      <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
      </svg>
      <span id="summary-cpu" class="value">{cpuLabel}</span>
      <span class="value-separator">+</span>
      <span id="summary-gpu" class="value">{gpuLabel}</span>
    </div>
    <div class="item">
      <span id="summary-opts" class="value">{optimizationCount}</span>
      <span class="label">Tweaks</span>
    </div>
    {#if peripheralCount > 0}
      <div class="item">
        <span id="summary-peripherals" class="value">{peripheralCount}</span>
        <span class="label">Devices</span>
      </div>
    {/if}
    <div class="item">
      <span id="summary-software" class="value">{softwareCount}</span>
      <span class="label">Apps</span>
    </div>
  </div>
</div>

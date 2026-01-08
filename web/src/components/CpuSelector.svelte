<script lang="ts">
/**
 * CPU Selector - Radio group for CPU type selection
 */

import { setCpu } from '$lib/state.svelte'
import { isCpuType } from '$lib/types'

function _handleChange(event: Event & { currentTarget: HTMLInputElement }) {
  const { value } = event.currentTarget
  if (isCpuType(value)) {
    setCpu(value)
  }
}
</script>

<fieldset class="control-fieldset">
  <legend class="control-legend">
    <span class="legend-badge legend-badge--hardware">CPU</span>
    <svg
      class="legend-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  </legend>
  {#each CPU_OPTIONS as option (option.value)}
    <label>
      <input
        type="radio"
        name="cpu"
        value={option.value}
        checked={app.hardware.cpu === option.value}
        autocomplete="off"
        onchange={handleChange}
      />
      <span class="label-text">{option.label}</span>
      <span class="label-hint">{option.hint}</span>
    </label>
  {/each}
</fieldset>

<script lang="ts">
  /**
   * Optimization Checkbox - Card-style toggle with tooltip
   * Checkbox is visually hidden but retained for accessibility
   * Shows tier rank as text prefix [S], [A], etc.
   */

  import { app, toggleOptimization } from "$lib/state.svelte";
  import type { OptimizationDef } from "$lib/optimizations";
  import type { OptimizationKey } from "$lib/types";
  import { tooltip, type StructuredTooltip } from "../utils/tooltips";

  interface Props {
    opt: OptimizationDef;
    /**
     * Optional callback before toggle. Return false to prevent the toggle.
     * Called with (key, isCurrentlyChecked) - so if isCurrentlyChecked is true,
     * the user is trying to UNCHECK it.
     */
    onBeforeToggle?: (
      key: OptimizationKey,
      isCurrentlyChecked: boolean,
    ) => boolean;
  }

  let { opt, onBeforeToggle }: Props = $props();

  let isChecked = $derived(app.optimizations.has(opt.key));

  /** Build tooltip with rank in title */
  function buildTooltipWithRank(baseTooltip: StructuredTooltip): StructuredTooltip {
    return {
      ...baseTooltip,
      title: `[${opt.rank}] ${baseTooltip.title}`,
    };
  }

  const enhancedTooltip = $derived(buildTooltipWithRank(opt.tooltip));

  function handleClick(event: MouseEvent) {
    if (onBeforeToggle) {
      const shouldProceed = onBeforeToggle(opt.key, isChecked);
      if (!shouldProceed) {
        event.preventDefault();
        return;
      }
    }
    toggleOptimization(opt.key);
  }
</script>

<label class:selected={isChecked} data-opt={opt.key} use:tooltip={enhancedTooltip}>
  <input
    type="checkbox"
    name="opt"
    id="opt-{opt.key}"
    value={opt.key}
    checked={isChecked}
    autocomplete="off"
    onclick={handleClick}
    aria-describedby="opt-hint-{opt.key}"
    class="sr-only"
  />
  <span class="label-text"><span class="tier-rank">[{opt.rank}]</span> {opt.label}</span>
  <span class="preset-badge" hidden></span>
  <span class="label-hint" id="opt-hint-{opt.key}">{opt.hint}</span>
  <span class="corner-indicator" aria-hidden="true"></span>
</label>

<style>
  .tier-rank {
    font-family: var(--font-mono);
    font-weight: 700;
    opacity: 0.6;
  }
</style>

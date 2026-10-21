<script lang="ts">
/**
 * AntiCheatWarning - shown in the Forge step when the loadout contains options
 * that stop a kernel anti-cheat from starting. Lists each option and the
 * anti-cheat it breaks, and turns them all off in one click.
 */

import { OPTIMIZATIONS } from '$lib/optimizations'
import { app, setOptimizations } from '$lib/state.svelte'
import { showToast } from '$lib/toast.svelte'
import { antiCheatLines, getAntiCheatConflicts } from './AntiCheatBadge.svelte'

const hits = $derived(
  OPTIMIZATIONS.filter((opt) => app.optimizations.has(opt.key))
    .map((opt) => ({ opt, lines: antiCheatLines(getAntiCheatConflicts(opt.key)) }))
    .filter((hit) => hit.lines.length > 0),
)

function turnOffConflicts() {
  const conflicting = new Set(hits.map((hit) => hit.opt.key))
  setOptimizations([...app.optimizations].filter((key) => !conflicting.has(key)))
  showToast(
    `${conflicting.size} anti-cheat ${conflicting.size === 1 ? 'conflict' : 'conflicts'} turned off.`,
    'success',
  )
}
</script>

{#if hits.length > 0}
  <section class="ac-warning" role="alert" aria-labelledby="ac-warning-title">
    <div class="ac-warning__head">
      <h3 class="ac-warning__title" id="ac-warning-title">
        Anti-cheat conflict
        <span class="ac-warning__count">{hits.length}</span>
      </h3>
      <button type="button" class="ac-warning__fix" onclick={turnOffConflicts}>
        Turn {hits.length === 1 ? 'it' : 'them'} off
      </button>
    </div>
    <p class="ac-warning__intro">
      Your loadout has options that stop these anti-cheats from starting. If you play these games,
      turn the options off.
    </p>
    <ul class="ac-warning__list" role="list">
      {#each hits as hit (hit.opt.key)}
        <li class="ac-warning__item">
          <span class="ac-warning__opt">{hit.opt.label}</span>
          {#each hit.lines as line (line)}
            <span class="ac-warning__line">{line}</span>
          {/each}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .ac-warning {
    --ac-warning-color: var(--neon-magenta);

    margin-block: var(--space-lg);
    padding: var(--space-md) var(--space-lg);
    background: color-mix(in oklch, var(--ac-warning-color) 8%, var(--bg-card));
    border: 1px solid color-mix(in oklch, var(--ac-warning-color) 50%, transparent);
    border-inline-start: 4px solid var(--ac-warning-color);
  }

  .ac-warning__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .ac-warning__title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--ac-warning-color);
  }

  .ac-warning__count {
    padding: 0 6px;
    background: var(--ac-warning-color);
    color: oklch(0 0 0);
    font-size: var(--text-sm);
  }

  .ac-warning__fix {
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-md);
    background: transparent;
    border: 1px solid var(--ac-warning-color);
    color: var(--ac-warning-color);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background var(--duration-fast, 150ms) ease,
      color var(--duration-fast, 150ms) ease;
  }

  .ac-warning__fix:hover,
  .ac-warning__fix:focus-visible {
    background: var(--ac-warning-color);
    color: oklch(0 0 0);
  }

  .ac-warning__intro {
    margin: var(--space-xs) 0 var(--space-md);
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .ac-warning__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    gap: var(--space-sm) var(--space-lg);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ac-warning__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-inline-start: var(--space-md);
    border-inline-start: 2px solid color-mix(in oklch, var(--ac-warning-color) 40%, transparent);
  }

  .ac-warning__opt {
    font-weight: 700;
    color: var(--text-primary);
  }

  .ac-warning__line {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.45;
  }
</style>

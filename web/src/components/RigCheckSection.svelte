<script lang="ts">
/**
 * RigCheckSection - step 1 of the builder
 *
 * Gives the read-only Rig Check one-liner and lists what the check looks at,
 * so a player fixes hardware setup (XMP, refresh rate, cable, driver, drive)
 * before tuning Windows.
 */

import { RIG_CHECK, SNAPSHOT } from '$lib/rig-check'
import { showToast } from '$lib/toast.svelte'
import { copyToClipboard } from '../utils/clipboard'

let copied = $state<'rig' | 'snapshot' | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyCommand(which: 'rig' | 'snapshot') {
  const name = which === 'rig' ? 'Rig Check' : 'Play Snapshot'
  const ok = await copyToClipboard(which === 'rig' ? RIG_CHECK.command : SNAPSHOT.command)
  if (!ok) {
    showToast(`Copy failed. Select the ${name} command and copy it by hand.`, 'error')
    return
  }
  copied = which
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied = null
  }, 2000)
  showToast(`${name} command copied. Paste it into PowerShell.`, 'success', 3000)
}
</script>

<section id="rig-check" class="step rig-check" aria-labelledby="rig-check-title">
  <header class="step-banner">
    <div class="step-banner__marker">1</div>
    <div class="step-banner__content">
      <h2 class="step-banner__title" id="rig-check-title">Rig Check</h2>
      <p class="step-banner__subtitle">Check your rig before you tune it.</p>
    </div>
  </header>

  <div class="rig-check__layout">
    <div class="rig-check__run">
      <p class="rig-check__lead">
        A wrong BIOS setting or a loose cable can cost more frames than any Windows tweak. One
        command scores your PC's setup and lists what to fix. It only reads settings and changes
        nothing.
      </p>

      <div class="rig-check__cmd">
        <span class="rig-check__prompt" aria-hidden="true">PS&gt;</span>
        <code class="rig-check__code">{RIG_CHECK.command}</code>
        <button
          type="button"
          class="rig-check__copy"
          class:is-copied={copied === 'rig'}
          aria-label="Copy the Rig Check command"
          onclick={() => copyCommand('rig')}
        >
          {copied === 'rig' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p class="rig-check__hint">
        Paste into PowerShell and press Enter. Fix what it flags, then pick a loadout below.
      </p>
    </div>

    <div>
      <h3 class="rig-check__checks-title">Stutters in game? Run Play Snapshot</h3>
      <div class="rig-check__run">
      <p class="rig-check__lead">{SNAPSHOT.description}</p>
      <div class="rig-check__cmd">
        <span class="rig-check__prompt" aria-hidden="true">PS&gt;</span>
        <code class="rig-check__code">{SNAPSHOT.command}</code>
        <button
          type="button"
          class="rig-check__copy"
          class:is-copied={copied === 'snapshot'}
          aria-label="Copy the Play Snapshot command"
          onclick={() => copyCommand('snapshot')}
        >
          {copied === 'snapshot' ? 'Copied' : 'Copy'}
        </button>
      </div>
      </div>
    </div>

    <div class="rig-check__checks">
      <h3 class="rig-check__checks-title">
        What it checks <span class="rig-check__count">{RIG_CHECK.checks.length}</span>
      </h3>
      <ul class="rig-check__list" role="list">
        {#each RIG_CHECK.checks as check (check.id)}
          <li class="rig-check__item">
            <span class="rig-check__label">{check.label}</span>
            <span class="rig-check__why">{check.why}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>


<style>
.rig-check {
  --rig-accent: var(--neon-cyan);
  --rig-cmd-bg: var(--bg-primary);
  --rig-item-border: color-mix(in oklch, var(--neon-cyan) 35%, transparent);
}

.rig-check__layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.rig-check__run {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  grid-template-areas:
      'lead cmd'
      'lead hint';
  gap: var(--space-sm) var(--space-xl);
  align-items: start;
  min-width: 0;
}

.rig-check__run .rig-check__lead {
  grid-area: lead;
}

.rig-check__run .rig-check__cmd {
  grid-area: cmd;
}

.rig-check__run .rig-check__hint {
  grid-area: hint;
}

.rig-check__lead {
  margin: 0;
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: 1.6;
}

.rig-check__cmd {
  display: flex;
  align-items: stretch;
  min-width: 0;
  background: var(--rig-cmd-bg);
  border: 1px solid var(--rig-accent);
}

.rig-check__prompt {
  display: flex;
  align-items: center;
  padding-inline: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--rig-accent);
  border-inline-end: 1px solid var(--border);
}

.rig-check__code {
  flex: 1;
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  overflow-wrap: anywhere;
  user-select: all;
}

.rig-check__copy {
  flex-shrink: 0;
  min-width: 5.5rem;
  padding: var(--space-sm) var(--space-md);
  background: var(--rig-accent);
  color: oklch(0 0 0);
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 800;
  cursor: pointer;
}

.rig-check__copy:focus-visible {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
}

.rig-check__copy.is-copied {
  background: var(--safe);
}

.rig-check__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.rig-check__checks-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 0 var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--text-secondary);
}

.rig-check__count {
  padding: 0 6px;
  border: 1px solid var(--rig-accent);
  color: var(--rig-accent);
  font-size: var(--text-xs);
}

.rig-check__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: var(--space-sm) var(--space-lg);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rig-check__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-inline-start: var(--space-md);
  border-inline-start: 2px solid var(--rig-item-border);
}

.rig-check__item:hover {
  border-color: var(--rig-accent);
}

.rig-check__label {
  font-weight: 700;
  color: var(--text-primary);
}

.rig-check__why {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.45;
}

@media (width <= 900px) {
  .rig-check__run {
    grid-template-columns: 1fr;
    grid-template-areas: 'lead' 'cmd' 'hint';
  }
}
</style>

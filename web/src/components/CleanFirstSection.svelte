<script lang="ts">
/**
 * CleanFirstSection - step 0 of the builder
 *
 * Sends general Windows cleanup to WinUtil and Win11Debloat, gives their
 * official launch commands, and lists the gaming compatibility checks RockTune
 * runs after either tool.
 */

import {
  COMPAT_CHECKS,
  PARTNER_SAFE_USE,
  PARTNER_TOOLS,
  type PartnerTool,
} from '$lib/partner-tools'
import { scrollToSection } from '$lib/scroll'
import { showToast } from '$lib/toast.svelte'
import { copyToClipboard } from '../utils/clipboard'

let copiedId = $state<PartnerTool['id'] | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyCommand(tool: PartnerTool) {
  const ok = await copyToClipboard(tool.command)
  if (!ok) {
    showToast(`Copy failed. Select the ${tool.name} command and copy it by hand.`, 'error')
    return
  }
  copiedId = tool.id
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedId = null
  }, 2000)
  showToast(`${tool.name} command copied. Paste it into PowerShell (Admin).`, 'success', 3000)
}
</script>

<section id="clean-first" class="step clean-first" aria-labelledby="clean-first-title">
  <header class="step-banner">
    <div class="step-banner__marker">0</div>
    <div class="step-banner__content">
      <h2 class="step-banner__title" id="clean-first-title">Clean Windows first</h2>
      <p class="step-banner__subtitle">Two free tools remove Windows clutter. RockTune tunes the game side.</p>
    </div>
  </header>

  <p class="clean-first__lead">
    WinUtil and Win11Debloat remove preinstalled apps, telemetry and ads. RockTune does the gaming
    part they don't: hardware tuning, stutter fixes, drivers and game software. Run one of them
    first, then run RockTune.
  </p>

  <ul class="clean-first__tools" role="list">
    {#each PARTNER_TOOLS as tool (tool.id)}
      <li class="partner-card" data-tool={tool.id}>
        <div class="partner-card__head">
          <h3 class="partner-card__name">{tool.name}</h3>
          <span class="partner-card__author">by {tool.author}</span>
        </div>
        <p class="partner-card__best">{tool.bestAt}</p>

        <div class="partner-card__cmd">
          <code class="partner-card__code">{tool.command}</code>
          <button
            type="button"
            class="partner-card__copy"
            class:is-copied={copiedId === tool.id}
            aria-label={`Copy the ${tool.name} command`}
            onclick={() => copyCommand(tool)}
          >
            {copiedId === tool.id ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p class="partner-card__hint">Paste into PowerShell opened as administrator.</p>

        <a class="partner-card__repo" href={tool.url} target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z" />
          </svg>
          Star {tool.name} on GitHub
        </a>
      </li>
    {/each}
  </ul>

  <p class="clean-first__safe">{PARTNER_SAFE_USE}</p>

  <div class="compat">
    <h3 class="compat__title">RockTune checks for these after a cleanup tool runs</h3>
    <p class="compat__intro">
      If a cleanup tool turned off something games need, the RockTune script finds it and puts it
      back.
    </p>
    <ul class="compat__list" role="list">
      {#each COMPAT_CHECKS as check (check.id)}
        <li class="compat__item">
          <span class="compat__label">
            {check.label}
            {#if check.x3dCritical}<span class="compat__badge">X3D</span>{/if}
          </span>
          <span class="compat__why">{check.why}</span>
        </li>
      {/each}
    </ul>
  </div>
</section>

<nav class="wizard-nav" aria-label="Continue to Rig Check">
  <a
    href="#rig-check"
    class="wizard-next-btn"
    onclick={async (e) => {
      e.preventDefault()
      await scrollToSection({ sectionId: 'rig-check' })
    }}
  >
    <span class="wizard-next-text">Next: Rig Check</span>
    <svg class="wizard-next-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </a>
</nav>

<style>
  .clean-first {
    --partner-card-bg: var(--bg-card);
    --partner-card-border: var(--border-light);
    --partner-cmd-bg: var(--bg-primary);
    --partner-accent: var(--neon-cyan);
  }

  .clean-first__lead {
    max-width: 70ch;
    margin: 0 0 var(--space-lg);
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  .clean-first__tools {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    gap: var(--space-md);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .partner-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0;
    padding: var(--space-lg);
    background: var(--partner-card-bg);
    border: 1px solid var(--partner-card-border);
    border-inline-start: 3px solid var(--partner-accent);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  }

  .partner-card[data-tool='win11debloat'] {
    --partner-accent: var(--neon-magenta);
  }

  .partner-card__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-xs) var(--space-sm);
  }

  .partner-card__name {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xl);
    font-weight: 900;
    color: var(--partner-accent);
  }

  .partner-card__author {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .partner-card__best {
    margin: 0;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .partner-card__cmd {
    display: flex;
    align-items: stretch;
    min-width: 0;
    margin-block-start: auto;
    background: var(--partner-cmd-bg);
    border: 1px solid var(--border);
  }

  .partner-card__code {
    flex: 1;
    min-width: 0;
    padding: var(--space-sm) var(--space-md);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--text-primary);
    overflow-wrap: anywhere;
    user-select: all;
  }

  .partner-card__copy {
    flex-shrink: 0;
    min-width: 5.5rem;
    padding: var(--space-sm) var(--space-md);
    background: var(--partner-accent);
    color: oklch(0 0 0);
    border: none;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    cursor: pointer;
    transition: filter var(--duration-fast, 150ms) ease;
  }

  .partner-card__copy:hover {
    filter: brightness(1.12);
  }

  .partner-card__copy:focus-visible {
    outline: 2px solid var(--text-primary);
    outline-offset: 2px;
  }

  .partner-card__copy.is-copied {
    background: var(--safe);
  }

  .partner-card__hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .partner-card__repo {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    align-self: flex-start;
    padding: var(--space-xs) var(--space-md);
    border: 1px solid var(--partner-accent);
    color: var(--partner-accent);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    text-decoration: none;
    transition: background var(--duration-fast, 150ms) ease;
  }

  .partner-card__repo svg {
    width: 1em;
    height: 1em;
  }

  .partner-card__repo:hover,
  .partner-card__repo:focus-visible {
    background: color-mix(in oklch, var(--partner-accent) 15%, transparent);
  }

  .clean-first__safe {
    max-width: 70ch;
    margin: var(--space-md) 0 0;
    padding: var(--space-sm) var(--space-md);
    border-inline-start: 3px solid var(--caution);
    background: var(--caution-bg);
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .compat {
    margin-block-start: var(--space-xl);
  }

  .compat__title {
    margin: 0 0 var(--space-xs);
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    color: var(--text-primary);
  }

  .compat__intro {
    margin: 0 0 var(--space-md);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .compat__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
    gap: var(--space-sm) var(--space-lg);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .compat__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-inline-start: var(--space-md);
    border-inline-start: 2px solid var(--safe-30);
  }

  .compat__label {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    font-weight: 700;
    color: var(--text-primary);
  }

  .compat__badge {
    padding: 0 6px;
    background: var(--caution-bg);
    border: 1px solid var(--caution);
    color: var(--caution);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .compat__why {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.45;
  }

  @media (width <= 480px) {
    .partner-card {
      padding: var(--space-md);
    }

    .partner-card__cmd {
      flex-direction: column;
    }

    .partner-card__copy {
      min-height: 44px;
    }
  }
</style>

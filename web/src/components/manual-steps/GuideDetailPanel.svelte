<script lang="ts">
/**
 * GuideDetailPanel - Side panel for displaying manual step details
 *
 * Editorial typography approach: no inner boxes, clear hierarchy through
 * type scale, weight, and color. Inspired by modern editorial design.
 */

import { fade, fly } from 'svelte/transition'
import { cubicOut } from 'svelte/easing'
import Icon from '../ui/Icon.svelte'

interface Props {
  isOpen: boolean
  title: string
  manualSteps?: string[]
  benefits?: string[]
  considerations?: string[]
  automationInfo?: {
    module: string
    function: string
    registryPath?: string
  } | null
  isCompleted: boolean
  onClose: () => void
  onToggleComplete: () => void
}

let {
  isOpen,
  title,
  manualSteps = [],
  benefits = [],
  considerations = [],
  automationInfo = null,
  isCompleted,
  onClose,
  onToggleComplete,
}: Props = $props()

let panelRef = $state<HTMLElement | null>(null)

// Handle Escape key to close
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onClose()
  }
}

// Focus trap and keyboard handling
$effect(() => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeydown)
    // Focus the panel when it opens
    setTimeout(() => {
      panelRef?.focus()
    }, 100)
  }
  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="panel-backdrop"
    onclick={onClose}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Panel -->
  <aside
    bind:this={panelRef}
    class="guide-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="panel-title"
    tabindex="-1"
    transition:fly={{ x: 400, duration: 300, easing: cubicOut }}
  >
    <header class="panel-header">
      <h3 id="panel-title" class="panel-title">{title}</h3>
      <button
        type="button"
        class="panel-close"
        onclick={onClose}
        aria-label="Close panel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </header>

    <div class="panel-body">
      <!-- How to Configure -->
      <h4 class="panel-heading">How to Configure</h4>
      {#if manualSteps.length > 0}
        <ol class="panel-steps">
          {#each manualSteps as step, i}
            <li>
              <span class="step-number">{i + 1}</span>
              <span class="step-text">{step}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="panel-empty">
          Search online for <mark>"{title}" Windows gaming optimization</mark>
        </p>
      {/if}

      <!-- Benefits -->
      {#if benefits.length > 0}
        <h4 class="panel-heading">Benefits</h4>
        <ul class="panel-list panel-list--benefits">
          {#each benefits as benefit}
            <li>
              <Icon name="check" size="xs" variant="success" />
              <span>{benefit}</span>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Considerations -->
      {#if considerations.length > 0}
        <h4 class="panel-heading">Considerations</h4>
        <ul class="panel-list panel-list--considerations">
          {#each considerations as con}
            <li>
              <Icon name="warning" size="xs" variant="warning" />
              <span>{con}</span>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Automation Details -->
      {#if automationInfo}
        <h4 class="panel-heading">What the Script Does</h4>
        <dl class="panel-automation">
          <div class="automation-row">
            <dt>Module</dt>
            <dd><code>{automationInfo.module}</code></dd>
          </div>
          <div class="automation-row">
            <dt>Function</dt>
            <dd><code>{automationInfo.function}</code></dd>
          </div>
          {#if automationInfo.registryPath}
            <div class="automation-row">
              <dt>Registry</dt>
              <dd><code>{automationInfo.registryPath}</code></dd>
            </div>
          {/if}
        </dl>
      {/if}
    </div>

    <footer class="panel-footer">
      <button
        type="button"
        class="panel-action"
        class:completed={isCompleted}
        onclick={() => {
          onToggleComplete()
          onClose()
        }}
      >
        {isCompleted ? 'Marked as Done' : 'Mark as Done'}
      </button>
    </footer>
  </aside>
{/if}

<style>
  .panel-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: color-mix(in oklch, var(--bg-primary) 70%, transparent);
    backdrop-filter: blur(4px);
  }

  .guide-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    width: min(420px, 90vw);
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklch, var(--cyber-cyan) 3%, var(--bg-elevated));
  }

  .panel-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    flex-shrink: 0;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--duration-fast) ease;

    & svg {
      width: 18px;
      height: 18px;
    }

    &:hover {
      color: var(--text-primary);
      border-color: var(--cyber-cyan);
      background: color-mix(in oklch, var(--cyber-cyan) 10%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--cyber-cyan);
      outline-offset: 2px;
    }
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }

  /* Editorial heading style - small caps feel */
  .panel-heading {
    margin: 0 0 var(--space-md) 0;
    padding-block-end: var(--space-xs);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
  }

  .panel-heading:not(:first-child) {
    margin-block-start: var(--space-xl);
  }

  /* Custom numbered steps */
  .panel-steps {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-lg) 0;
  }

  .panel-steps li {
    display: grid;
    grid-template-columns: 1.75rem 1fr;
    gap: var(--space-sm);
    margin-block-end: var(--space-md);
    line-height: 1.65;
    align-items: baseline;
  }

  .panel-steps li:last-child {
    margin-block-end: 0;
  }

  .step-number {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--cyber-cyan);
    text-align: right;
    padding-inline-end: var(--space-xs);
  }

  .step-text {
    color: var(--text-secondary);
    font-size: var(--text-md);
  }

  /* Empty state - no italic */
  .panel-empty {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
    line-height: 1.7;
  }

  .panel-empty mark {
    background: color-mix(in oklch, var(--cyber-cyan) 15%, transparent);
    color: var(--cyber-cyan);
    padding: 0.125em 0.5em;
    border-radius: 4px;
    font-weight: 500;
  }

  /* Benefits / Considerations lists */
  .panel-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-lg) 0;
  }

  .panel-list li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-block-end: var(--space-sm);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
  }

  .panel-list li:last-child {
    margin-block-end: 0;
  }

  .panel-list li :global(svg) {
    flex-shrink: 0;
    margin-block-start: 0.2em;
  }

  /* Automation details - definition list */
  .panel-automation {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: color-mix(in oklch, var(--cyber-cyan) 4%, transparent);
    border-radius: 6px;
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 15%, transparent);
  }

  .automation-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-md);
  }

  .automation-row dt {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    min-width: 4.5rem;
  }

  .automation-row dd {
    margin: 0;
    flex: 1;
    min-width: 0;
  }

  .automation-row code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--cyber-cyan);
    word-break: break-all;
  }

  .panel-footer {
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .panel-action {
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 600;
    color: oklch(0.1 0 0);
    background: var(--cyber-yellow);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all var(--duration-fast) ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 20px color-mix(in oklch, var(--cyber-yellow) 50%, transparent);
    }

    &:active {
      transform: translateY(0);
    }

    &.completed {
      background: var(--safe);
      color: oklch(0.98 0.01 285);
    }

    &:focus-visible {
      outline: 2px solid var(--cyber-yellow);
      outline-offset: 2px;
    }
  }

  @media (max-width: 600px) {
    .guide-panel {
      width: 100vw;
    }
  }
</style>

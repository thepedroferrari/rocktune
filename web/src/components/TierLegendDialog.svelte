<script lang="ts">
  /**
   * TierLegendDialog - Simple modal explaining S-F tier ranking system
   * Minimal notepad-style text, cyberpunk aesthetic
   */

  import { EFFECTIVENESS_RANKS, RANK_LABELS } from '$lib/types'

  interface Props {
    open: boolean
    onclose: () => void
  }

  let { open, onclose }: Props = $props()

  let dialogRef: HTMLDialogElement | null = $state(null)

  $effect(() => {
    if (dialogRef) {
      if (open) {
        dialogRef.showModal()
      } else {
        dialogRef.close()
      }
    }
  })

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogRef) {
      onclose()
    }
  }

  const tiers = Object.values(EFFECTIVENESS_RANKS).map((rank) => ({
    rank,
    label: RANK_LABELS[rank],
  }))
</script>

<dialog
  bind:this={dialogRef}
  class="tier-dialog"
  onclick={handleBackdropClick}
  onclose={onclose}
>
  <div class="tier-dialog__content">
    <header class="tier-dialog__header">
      <h2>Tier Rankings</h2>
      <button
        type="button"
        class="tier-dialog__close"
        onclick={onclose}
        aria-label="Close"
      >×</button>
    </header>

    <pre class="tier-dialog__body">{#each tiers as tier}
[{tier.rank}] {tier.label}
{/each}</pre>

    <p class="tier-dialog__note">Rankings based on measurable impact and community testing. Your mileage may vary.</p>
  </div>
</dialog>

<style>
  .tier-dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    max-width: 320px;
    background: transparent;
    border: none;
    padding: 0;
  }

  .tier-dialog::backdrop {
    background: oklch(0 0 0 / 0.75);
    backdrop-filter: blur(4px);
  }

  .tier-dialog__content {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    clip-path: var(--clip-cyber-sm);
  }

  .tier-dialog__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--border);
  }

  .tier-dialog__header h2 {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-primary);
  }

  .tier-dialog__close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.25rem;
  }

  .tier-dialog__close:hover {
    color: var(--accent);
  }

  .tier-dialog__body {
    margin: 0;
    padding: var(--space-md);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.8;
    color: var(--text-secondary);
    white-space: pre-line;
  }

  .tier-dialog__note {
    margin: 0;
    padding: var(--space-sm) var(--space-md);
    font-size: 0.7rem;
    color: var(--text-hint);
    border-top: 1px solid var(--border);
  }
</style>

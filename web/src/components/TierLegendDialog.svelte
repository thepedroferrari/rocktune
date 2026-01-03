<script lang="ts">
  /**
   * TierLegendDialog - Simple modal explaining S-F tier ranking system
   * Uses modal-base pattern for consistent styling
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
        const scrollY = window.scrollY
        dialogRef.showModal()
        window.scrollTo({ top: scrollY, behavior: 'instant' })
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
  class="modal-base modal-base--sm tier-dialog"
  onclick={handleBackdropClick}
  onclose={onclose}
>
  <header class="modal-header">
    <h2 class="modal-title tier-dialog__title">Tier Rankings</h2>
    <button
      type="button"
      class="modal-close"
      onclick={onclose}
      aria-label="Close"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </header>

  <pre class="modal-body tier-dialog__body">{#each tiers as tier}
[{tier.rank}] {tier.label}
{/each}</pre>

  <footer class="modal-footer tier-dialog__footer">
    <p class="tier-dialog__note">Rankings based on measurable impact and community testing. Your mileage may vary.</p>
  </footer>
</dialog>

<style>
  /* Only component-specific overrides - layout comes from modal pattern */
  .tier-dialog {
    --_width: 320px;
    --_clip: var(--clip-cyber-sm);
  }

  .tier-dialog__title {
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .tier-dialog__body {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.8;
    color: var(--text-secondary);
    white-space: pre-line;
  }

  .tier-dialog__footer {
    justify-content: center;
  }

  .tier-dialog__note {
    margin: 0;
    font-size: 0.7rem;
    color: var(--text-hint);
  }
</style>

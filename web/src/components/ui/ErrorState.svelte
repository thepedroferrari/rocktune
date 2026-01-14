<script lang="ts">
/**
 * ErrorState - Fallback UI for error boundaries
 *
 * Displays a user-friendly error message with retry option.
 * Used with <svelte:boundary> for graceful error handling.
 */

interface Props {
  error: unknown
  reset?: () => void
  title?: string
}

const { error, reset, title = 'Something went wrong' }: Props = $props()

/** Extract message from unknown error */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred. Please try again.'
}

const errorMessage = $derived(getErrorMessage(error))
</script>

<div class="error-state" role="alert" aria-live="polite">
  <div class="error-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  </div>

  <h3 class="error-title">{title}</h3>
  <p class="error-message">{errorMessage}</p>

  {#if reset}
    <button type="button" class="error-retry" onclick={reset}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
      Try again
    </button>
  {/if}
</div>

<style>
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-xl);
    text-align: center;
    min-height: 200px;
    background: oklch(0.15 0.02 10 / 0.3);
    border: 1px solid oklch(0.72 0.18 10 / 0.3);
    border-radius: var(--radius-md, 8px);
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: oklch(0.72 0.18 10);
  }

  .error-icon svg {
    width: 100%;
    height: 100%;
  }

  .error-title {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: oklch(0.72 0.18 10);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .error-message {
    margin: 0;
    font-size: 0.9rem;
    color: oklch(0.7 0.02 285);
    max-width: 400px;
  }

  .error-retry {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: 1px solid oklch(0.75 0.15 175);
    border-radius: var(--radius-sm, 4px);
    color: oklch(0.75 0.15 175);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .error-retry:hover {
    background: oklch(0.75 0.15 175 / 0.1);
    box-shadow: 0 0 12px oklch(0.75 0.15 175 / 0.3);
  }

  .error-retry svg {
    width: 16px;
    height: 16px;
  }
</style>

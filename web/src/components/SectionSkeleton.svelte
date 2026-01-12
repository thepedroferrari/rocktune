<script lang="ts">
interface Props {
  height?: string
}

const { height = '400px' }: Props = $props()
</script>

<div class="section-skeleton" style="--skeleton-height: {height}">
  <div class="skeleton-shimmer">
    <div class="skeleton-content">
      <div class="skeleton-header">
        <div class="skeleton-marker"></div>
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .section-skeleton {
    min-height: var(--skeleton-height, 400px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding-block: var(--space-xl);
    position: relative;
    overflow: hidden;
  }

  .skeleton-shimmer {
    width: 100%;
    max-width: 1200px;
    padding-inline: var(--space-md);
    position: relative;
  }

  /* Cyberpunk pulsing glow effect */
  .skeleton-shimmer::before {
    content: "";
    position: absolute;
    inset: -100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      oklch(0.628 0.22 292 / 0.1) 50%,
      transparent 100%
    );
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .skeleton-content {
    background: oklch(0.13 0.02 285 / 0.3);
    border: 1px solid oklch(0.628 0.22 292 / 0.3);
    border-radius: 4px;
    padding: var(--space-xl);
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
    position: relative;
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-block-end: var(--space-lg);
  }

  .skeleton-marker {
    width: 40px;
    height: 40px;
    background: oklch(0.628 0.22 292 / 0.2);
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 10px oklch(0.628 0.22 292 / 0.3);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-title {
    height: 32px;
    width: 200px;
    background: oklch(0.628 0.22 292 / 0.2);
    border-radius: 4px;
    animation: pulse 1.5s ease-in-out infinite 0.2s;
  }

  .skeleton-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .skeleton-line {
    height: 16px;
    background: oklch(0.628 0.22 292 / 0.15);
    border-radius: 4px;
    animation: pulse 1.5s ease-in-out infinite 0.4s;
  }

  .skeleton-line.short {
    width: 60%;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer::before {
      animation: none;
    }

    .skeleton-marker,
    .skeleton-title,
    .skeleton-line {
      animation: none;
      opacity: 0.7;
    }
  }
</style>

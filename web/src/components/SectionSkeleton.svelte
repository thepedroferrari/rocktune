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

.skeleton-content {
  background: oklch(0.13 0.02 285 / 0.3);
  border: 1px solid oklch(0.628 0.22 292 / 0.3);
  border-radius: 4px;
  padding: var(--space-xl);
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
}

.skeleton-title {
  height: 32px;
  width: 200px;
  background: oklch(0.628 0.22 292 / 0.2);
  border-radius: 4px;
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
}

.skeleton-line.short {
  width: 60%;
}
</style>

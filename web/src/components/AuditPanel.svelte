<script lang="ts">
  /**
   * AuditPanel - Script preview and diff viewer
   *
   * Shows the generated PowerShell script with:
   * - Toggle open/close
   * - Line count and file size stats
   * - Copy to clipboard
   */

  interface Props {
    script?: string
    previousScript?: string
  }

  let { script = '', previousScript = '' }: Props = $props()

  // Local state
  let isOpen = $state(false)
  let copyText = $state('Copy')
  let copyTimeout: ReturnType<typeof setTimeout> | null = null

  // Computed stats
  let lines = $derived(script ? script.split('\n').length : 0)
  let sizeKb = $derived(script ? (new Blob([script]).size / 1024).toFixed(1) : '0.0')

  function toggle() {
    isOpen = !isOpen
  }

  async function handleCopy() {
    if (!script) return

    try {
      await navigator.clipboard.writeText(script)
      copyText = '✓ Copied'

      if (copyTimeout) clearTimeout(copyTimeout)
      copyTimeout = setTimeout(() => {
        copyText = 'Copy'
      }, 1800)
    } catch (err) {
      alert(`Failed to copy: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Cleanup
  $effect(() => {
    return () => {
      if (copyTimeout) clearTimeout(copyTimeout)
    }
  })
</script>

<div id="audit-panel" class="audit-panel" class:open={isOpen}>
  <button
    id="audit-toggle"
    class="audit-toggle"
    onclick={toggle}
    aria-expanded={isOpen}
    aria-controls="audit-content"
  >
    <span class="audit-toggle-icon">{isOpen ? '▼' : '▶'}</span>
    <span>Preview Script</span>
    <span class="audit-stats">
      <span id="audit-lines">{lines} lines</span>
      <span id="audit-size">{sizeKb} KB</span>
    </span>
  </button>

  {#if isOpen}
    <div id="audit-content" class="audit-content">
      <div class="audit-toolbar">
        <button id="audit-copy" class="audit-btn" onclick={handleCopy}>
          {copyText}
        </button>
      </div>
      <div id="audit-viewer" class="audit-viewer">
        <pre><code>{script || '// No script generated yet'}</code></pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .audit-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    z-index: 100;
    transition: transform 0.3s ease;
  }

  .audit-panel:not(.open) {
    transform: translateY(calc(100% - 48px));
  }

  .audit-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
  }

  .audit-toggle:hover {
    background: var(--bg-header);
  }

  .audit-toggle-icon {
    font-size: 0.75rem;
    color: var(--accent);
  }

  .audit-stats {
    margin-left: auto;
    display: flex;
    gap: 1rem;
    color: var(--text-dim);
    font-size: 0.75rem;
  }

  .audit-content {
    max-height: 50vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .audit-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem 1rem;
    background: var(--bg-header);
    border-bottom: 1px solid var(--border);
  }

  .audit-btn {
    padding: 0.375rem 0.75rem;
    background: var(--accent);
    border: none;
    border-radius: 4px;
    color: var(--bg);
    font-size: 0.75rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .audit-btn:hover {
    opacity: 0.8;
  }

  .audit-viewer {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    max-height: calc(50vh - 80px);
  }

  .audit-viewer pre {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .audit-viewer code {
    color: var(--text-dim);
  }
</style>

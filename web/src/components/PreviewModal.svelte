<script lang="ts">
  /**
   * PreviewModal - Script preview dialog
   *
   * Modal dialog that displays the generated PowerShell script
   * with CodeViewer for viewing, comparing, and editing.
   */

  import {
    app,
    closePreviewModal,
    setScriptMode,
    setEditedScript,
    generateCurrentScript,
    setIncludeTimer,
    setIncludeManualSteps,
    type ScriptMode,
  } from '$lib/state.svelte'
  import CodeViewer from './CodeViewer.svelte'

  function handleTimerToggle() {
    setIncludeTimer(!app.buildOptions.includeTimer)
  }

  function handleManualStepsToggle() {
    setIncludeManualSteps(!app.buildOptions.includeManualSteps)
  }

  
  let dialogEl: HTMLDialogElement | null = null

  
  $effect(() => {
    if (!dialogEl) return

    if (app.ui.previewModalOpen) {
      if (!dialogEl.open) {
        dialogEl.showModal()
      }
    } else {
      if (dialogEl.open) {
        dialogEl.close()
      }
    }
  })

  function handleClose() {
    closePreviewModal()
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      handleClose()
    }
  }

  function handleCancel(event: Event) {
    event.preventDefault()
    handleClose()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
    }
  }

  function handleModeChange(mode: ScriptMode) {
    setScriptMode(mode)
  }

  function handleEdit(content: string) {
    setEditedScript(content)
  }

  
  let generatedScript = $derived(generateCurrentScript())
  let activeScript = $derived(app.script.edited ?? generatedScript)
</script>

<dialog
  bind:this={dialogEl}
  class="preview-modal"
  onclick={handleBackdropClick}
  oncancel={handleCancel}
  onkeydown={handleKeydown}
>
  <header class="header">
    <h3><span class="header-icon">◢</span> SCRIPT PREVIEW</h3>
    <button type="button" class="close" aria-label="Close" onclick={handleClose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </header>

  <div class="body">
    <CodeViewer
      script={activeScript}
      previousScript={app.script.previous}
      mode={app.script.mode}
      pillLabel="Preview"
      showActions={true}
      onModeChange={handleModeChange}
      onEdit={handleEdit}
    />
  </div>

  <div class="build-options">
    <span class="build-options__label">Build Options:</span>
    <label class="build-option">
      <input
        type="checkbox"
        checked={app.buildOptions.includeTimer}
        onchange={handleTimerToggle}
      />
      <span class="build-option__text">Include Timer Tool</span>
      <span class="build-option__hint">(adds 0.5ms timer + launch menu)</span>
    </label>
  </div>

  <footer class="footer">
    <span class="label">To run:</span>
    <kbd>Right-click</kbd>
    <span class="arrow">→</span>
    <kbd>Run with PowerShell</kbd>
    <span class="arrow">→</span>
    <kbd>Yes</kbd>
  </footer>
</dialog>

<style>
  .build-options {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface-1, #1a1a2e);
    border-top: 1px solid var(--border-subtle, #2d2d44);
  }

  .build-options__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #888);
    font-weight: 500;
  }

  .build-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .build-option input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent, #00d9ff);
    cursor: pointer;
  }

  .build-option__text {
    color: var(--text-primary, #fff);
  }

  .build-option__hint {
    font-size: 0.75rem;
    color: var(--text-muted, #666);
  }
</style>

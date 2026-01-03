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
  class="modal-base modal-base--xl preview-modal"
  onclick={handleBackdropClick}
  oncancel={handleCancel}
  onkeydown={handleKeydown}
>
  <header class="modal-header preview-modal__header">
    <h3 class="modal-title preview-modal__title"><span class="preview-modal__icon">◢</span> SCRIPT PREVIEW</h3>
    <button type="button" class="modal-close" aria-label="Close" onclick={handleClose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </header>

  <div class="modal-body preview-modal__body">
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

  <div class="preview-modal__options">
    <span class="preview-modal__options-label">Build Options:</span>
    <label class="preview-modal__option">
      <input
        type="checkbox"
        checked={app.buildOptions.includeTimer}
        onchange={handleTimerToggle}
      />
      <span class="preview-modal__option-text">Include Timer Tool</span>
      <span class="preview-modal__option-hint">(adds 0.5ms timer + launch menu)</span>
    </label>
  </div>

  <footer class="modal-footer preview-modal__footer">
    <span class="preview-modal__label">To run:</span>
    <kbd>Right-click</kbd>
    <span class="preview-modal__arrow">→</span>
    <kbd>Run with PowerShell</kbd>
    <span class="preview-modal__arrow">→</span>
    <kbd>Yes</kbd>
  </footer>
</dialog>

<style>
  .preview-modal__options {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .preview-modal__options-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-hint);
    font-weight: 500;
  }

  .preview-modal__option {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .preview-modal__option input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .preview-modal__option-text {
    color: var(--text-primary);
  }

  .preview-modal__option-hint {
    font-size: var(--text-xs);
    color: var(--text-hint);
  }
</style>

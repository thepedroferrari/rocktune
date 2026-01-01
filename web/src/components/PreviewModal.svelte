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
    type ScriptMode,
  } from '$lib/state.svelte'
  import CodeViewer from './CodeViewer.svelte'

  
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

  <footer class="footer">
    <span class="label">To run:</span>
    <kbd>Right-click</kbd>
    <span class="arrow">→</span>
    <kbd>Run with PowerShell</kbd>
    <span class="arrow">→</span>
    <kbd>Yes</kbd>
  </footer>
</dialog>



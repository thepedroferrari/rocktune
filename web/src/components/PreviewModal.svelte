<script lang="ts">
/**
 * PreviewModal - Script preview dialog
 *
 * Modal dialog that displays the generated PowerShell script
 * with CodeViewer for viewing, comparing, and editing.
 */

import {
  app,
  setScriptMode,
  setEditedScript,
  generateCurrentScript,
  setIncludeTimer,
  setIncludeManualSteps,
  setCreateBackup,
  type ScriptMode,
} from '$lib/state.svelte'

function _handleTimerToggle() {
  setIncludeTimer(!app.buildOptions.includeTimer)
}

function _handleManualStepsToggle() {
  setIncludeManualSteps(!app.buildOptions.includeManualSteps)
}

function _handleBackupToggle() {
  setCreateBackup(!app.buildOptions.createBackup)
}

function _handleModeChange(mode: ScriptMode) {
  setScriptMode(mode)
}

function _handleEdit(content: string) {
  setEditedScript(content)
}

const generatedScript = $derived(generateCurrentScript())
const _activeScript = $derived(app.script.edited ?? generatedScript)
</script>

<Modal
  open={app.ui.previewModalOpen}
  onclose={closePreviewModal}
  size="xl"
  class="preview-modal"
>
  {#snippet header()}
    <h3 class="modal-title preview-modal__title">
      <span class="preview-modal__icon">◢</span> SCRIPT PREVIEW
    </h3>
  {/snippet}

  <div class="preview-modal__body">
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
      <span class="preview-modal__option-hint"
        >(adds 0.5ms timer + launch menu)</span
      >
    </label>
    <label class="preview-modal__option">
      <input
        type="checkbox"
        checked={app.buildOptions.createBackup}
        onchange={handleBackupToggle}
      />
      <span class="preview-modal__option-text">Create Backup</span>
      <span class="preview-modal__option-hint"
        >(saves settings for easy rollback)</span
      >
    </label>
  </div>

  {#snippet footer()}
    <span class="preview-modal__label">To run:</span>
    <kbd>Right-click</kbd>
    <span class="preview-modal__arrow">→</span>
    <kbd>Run with PowerShell</kbd>
    <span class="preview-modal__arrow">→</span>
    <kbd>Yes</kbd>
  {/snippet}
</Modal>

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

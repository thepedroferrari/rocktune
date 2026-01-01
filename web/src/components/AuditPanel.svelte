<script lang="ts">
  /**
   * AuditPanel - Right-side sliding code preview drawer
   *
   * Full-featured script viewer with:
   * - Current: Plain text view
   * - Diff: Line-by-line comparison with previous version
   * - Edit: Editable textarea for modifications
   */

  import { onMount } from 'svelte'
  import {
    app,
    toggleAuditPanel,
    generateCurrentScript,
    setScriptMode,
    setEditedScript,
  } from '$lib/state.svelte'
  import type { ScriptMode } from '$lib/state.svelte'
  import CodeViewer from './CodeViewer.svelte'

  
  let generatedScript = $derived(generateCurrentScript())
  let activeScript = $derived(app.script.edited ?? generatedScript)

  
  let isVisible = $state(false)

  onMount(() => {
    function handleScroll() {
      isVisible = window.scrollY > 400
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  })

  function handleToggle() {
    toggleAuditPanel()
  }

  function handleModeChange(mode: ScriptMode) {
    setScriptMode(mode)
  }

  function handleEdit(content: string) {
    setEditedScript(content)
  }
</script>


<aside
  class="audit-panel"
  class:visible={isVisible}
  class:open={app.ui.auditPanelOpen}
  aria-label="Script preview panel"
>
  
  <button
    type="button"
    class="audit-toggle"
    onclick={handleToggle}
    aria-expanded={app.ui.auditPanelOpen}
    aria-label={app.ui.auditPanelOpen ? 'Close script preview' : 'Open script preview'}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>

  
  <div class="audit-content">
    <header class="audit-header">
      <h3>Script Preview</h3>
    </header>

    <CodeViewer
      script={activeScript}
      previousScript={app.script.previous ?? ''}
      mode={app.script.mode}
      pillLabel="Audit"
      showActions={true}
      onModeChange={handleModeChange}
      onEdit={handleEdit}
    />
  </div>
</aside>

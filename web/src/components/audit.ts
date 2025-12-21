import { $$, $id } from '../utils/dom'
import { type CodeViewer, computeStats, createCodeViewer } from './code-viewer'
import { getPreviousScript, getTrackedScript } from './script-generator'

let auditViewer: CodeViewer | null = null

export function setupAuditPanel(): void {
  const panel = $id('audit-panel')
  const toggle = $id('audit-toggle')
  const linesEl = $id('audit-lines')
  const sizeEl = $id('audit-size')

  auditViewer = createCodeViewer($id('audit-viewer'))

  // Toggle panel
  toggle?.addEventListener('click', () => {
    panel?.classList.toggle('open')
  })

  const updateAudit = (): void => {
    const script = getTrackedScript()
    const previous = getPreviousScript()
    auditViewer?.setContent({ current: script, previous })

    const stats = computeStats(script)
    if (linesEl) linesEl.textContent = `${stats.lines} lines`
    if (sizeEl) sizeEl.textContent = `${stats.sizeKb} KB`
  }

  // Listen to all form changes
  $$('input[name="cpu"], input[name="gpu"], input[name="peripheral"], input[name="opt"]').forEach(
    (el) => {
      el.addEventListener('change', updateAudit)
    },
  )

  document.addEventListener('script-change-request', updateAudit)

  // Initial update
  updateAudit()

  // Copy from audit viewer
  $id('audit-copy')?.addEventListener('click', async () => {
    const script = auditViewer?.getContent() || ''
    try {
      await navigator.clipboard.writeText(script)
      const btn = $id('audit-copy')
      if (btn) {
        const original = btn.textContent
        btn.textContent = '✓ Copied'
        setTimeout(() => {
          btn.textContent = original
        }, 1800)
      }
    } catch (err) {
      alert(`Failed to copy: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  })
}

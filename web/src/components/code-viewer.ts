import { diffLines } from 'diff'
import { escapeHtml } from '../utils/dom'

export interface CodeViewer {
  setMode: (mode: string) => void
  setContent: (content: { current: string; previous?: string }) => void
  getContent: () => string
}

export function renderDiffHtml(previous = '', current = ''): string {
  const diffParts = diffLines(previous, current)
  let oldLine = 1
  let newLine = 1
  const rows: string[] = []

  for (const part of diffParts) {
    const lines = part.value.split('\n')
    // Drop trailing empty line caused by split on final newline
    if (lines[lines.length - 1] === '') lines.pop()

    for (const line of lines) {
      const isAdded = part.added
      const isRemoved = part.removed
      const cls = isAdded ? 'diff-added' : isRemoved ? 'diff-removed' : 'diff-unchanged'
      const displayOld = isAdded ? '' : oldLine++
      const displayNew = isRemoved ? '' : newLine++
      const escaped = escapeHtml(line)

      rows.push(
        `<div class="cv-line ${cls}"><span class="cv-ln old">${displayOld || '•'}</span><span class="cv-ln new">${displayNew || '•'}</span><span class="cv-code">${escaped || ' '}</span></div>`,
      )
    }
  }

  return rows.join('')
}

export function createCodeViewer(root: HTMLElement | null): CodeViewer | null {
  if (!root) return null

  const tabs = Array.from(root.querySelectorAll('.cv-tab')) as HTMLElement[]
  const panes: Record<string, HTMLElement | HTMLTextAreaElement | null> = {
    current: root.querySelector('[data-pane="current"]'),
    diff: root.querySelector('[data-pane="diff"]'),
    edit: root.querySelector('[data-pane="edit"]'),
  }

  let mode = 'current'
  let previousValue = ''
  let currentValue = ''

  function setMode(next: string): void {
    if (!panes[next]) return
    mode = next
    for (const t of tabs) {
      t.classList.toggle('active', t.dataset.mode === next)
    }

    for (const [key, pane] of Object.entries(panes)) {
      if (!pane) continue
      pane.classList.toggle('active', key === next)
    }

    if (next === 'edit' && panes.edit && currentValue) {
      ;(panes.edit as HTMLTextAreaElement).value = currentValue
    }
  }

  function setContent({
    current = '',
    previous = '',
  }: {
    current: string
    previous?: string
  }): void {
    currentValue = current
    previousValue = previous || ''
    if (panes.current) panes.current.textContent = currentValue
    if (panes.edit) (panes.edit as HTMLTextAreaElement).value = currentValue
    if (panes.diff) panes.diff.innerHTML = renderDiffHtml(previousValue, currentValue)
  }

  function getContent(): string {
    if (mode === 'edit' && panes.edit) return (panes.edit as HTMLTextAreaElement).value
    return currentValue
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const tabMode = tab.dataset.mode
      if (tabMode) setMode(tabMode)
    })
  }

  // Default to current view
  setMode('current')

  return {
    setMode,
    setContent,
    getContent,
  }
}

export function computeStats(text = ''): { lines: number; sizeKb: string } {
  const lines = text.split('\n').length
  const sizeKb = (new Blob([text]).size / 1024).toFixed(1)
  return { lines, sizeKb }
}

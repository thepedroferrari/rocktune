<script lang="ts">
/**
 * CodeViewer - Script viewer with Current/Diff/Edit tabs
 *
 * Displays generated PowerShell scripts with:
 * - Current: Plain text view
 * - Diff: Line-by-line comparison with previous version
 * - Edit: Editable textarea for modifications
 */

import { diffLines } from 'diff'
import type { ScriptMode } from '$lib/state.svelte'
import { copyToClipboard } from '../utils/clipboard'
import { downloadText } from '../utils/download'
import { SCRIPT_FILENAME } from '$lib/types'

interface Props {
  /** Current script content */
  script: string
  /** Previous script content (for diff) */
  previousScript: string
  /** Current view mode */
  mode?: ScriptMode
  /** Label for the pill badge */
  pillLabel?: string
  /** Whether to show footer actions (copy, download) */
  showActions?: boolean
  /** Callback when mode changes */
  onModeChange?: (mode: ScriptMode) => void
  /** Callback when script is edited */
  onEdit?: (content: string) => void
}

const {
  script,
  previousScript,
  mode = 'current',
  // biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
  pillLabel = 'Preview',
  // biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
  showActions = true,
  onModeChange,
  onEdit,
}: Props = $props()

let localModeOverride = $state<ScriptMode | null>(null)
const activeMode = $derived(localModeOverride ?? mode)
let diffIndex = $state(0)
let isEditing = $state(false)
let _editContent = $state('')
let _copyText = $state('Copy')
let copyTimeout: ReturnType<typeof setTimeout> | null = null
const diffPaneEl: HTMLDivElement | null = null

$effect(() => {
  void mode
  localModeOverride = null
})

$effect(() => {
  if (!isEditing) {
    _editContent = script
  }
})

const _lines = $derived(script ? script.split('\n').length : 0)
const _sizeKb = $derived(script ? (new Blob([script]).size / 1024).toFixed(1) : '0.0')

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  oldLineNum: number | null
  newLineNum: number | null
  content: string
}

const diffLines$ = $derived.by(() => {
  const result: DiffLine[] = []
  let oldLine = 1
  let newLine = 1

  const changes = diffLines(previousScript || '', script || '')

  for (const part of changes) {
    const lines = part.value.split('\n')

    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }

    for (const line of lines) {
      if (part.added) {
        result.push({
          type: 'added',
          oldLineNum: null,
          newLineNum: newLine,
          content: line,
        })
        newLine += 1
      } else if (part.removed) {
        result.push({
          type: 'removed',
          oldLineNum: oldLine,
          newLineNum: null,
          content: line,
        })
        oldLine += 1
      } else {
        result.push({
          type: 'unchanged',
          oldLineNum: oldLine,
          newLineNum: newLine,
          content: line,
        })
        oldLine += 1
        newLine += 1
      }
    }
  }

  return result
})

const diffTargets = $derived(
  diffLines$
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.type !== 'unchanged'),
)

const _showNav = $derived(activeMode === 'diff' && diffTargets.length > 0)

$effect(() => {
  const count = diffTargets.length
  if (count === 0) {
    diffIndex = 0
    return
  }
  if (diffIndex < 0 || diffIndex >= count) {
    diffIndex = 0
  }
})

function setMode(newMode: ScriptMode) {
  localModeOverride = newMode
  onModeChange?.(newMode)
}

function _handleTabClick(tabMode: ScriptMode) {
  setMode(tabMode)
}

function _handleEditFocus() {
  isEditing = true
}

function _handleEditBlur() {
  isEditing = false
}

function _handleEditInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
  const { value } = event.currentTarget
  _editContent = value
  onEdit?.(value)
}

function _navigateDiff(direction: 'prev' | 'next') {
  if (diffTargets.length === 0) return

  if (direction === 'prev') {
    diffIndex = (diffIndex - 1 + diffTargets.length) % diffTargets.length
  } else {
    diffIndex = (diffIndex + 1) % diffTargets.length
  }

  scrollToCurrentDiff()
}

function scrollToCurrentDiff() {
  if (!diffPaneEl) return
  const target = diffTargets[diffIndex]
  if (!target) return

  const lineEls = diffPaneEl.querySelectorAll('.line')
  const targetEl = lineEls[target.index]
  targetEl?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

async function _handleCopy() {
  if (!script) return

  const success = await copyToClipboard(script)
  if (success) {
    _copyText = 'Copied!'
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      _copyText = 'Copy'
    }, 1800)
  }
}

function _handleDownload() {
  if (!script.trim()) return
  downloadText(script, SCRIPT_FILENAME)
}

$effect(() => {
  return () => {
    if (copyTimeout) clearTimeout(copyTimeout)
  }
})
</script>

<div class="code-viewer">
  <header class="toolbar">
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'current'}
      onclick={() => _handleTabClick('current')}
    >
      Current
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'diff'}
      onclick={() => _handleTabClick('diff')}
    >
      Diff
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'edit'}
      onclick={() => _handleTabClick('edit')}
    >
      Edit
    </button>

    {#if _showNav}
      <div class="nav">
        <button
          type="button"
          class="nav-btn"
          title="Previous change"
          onclick={() => _navigateDiff('prev')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <span class="nav-count">{diffIndex + 1}/{diffTargets.length}</span>
        <button
          type="button"
          class="nav-btn"
          title="Next change"
          onclick={() => _navigateDiff('next')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    {/if}

    <div class="pill">{pillLabel}</div>
  </header>

  <div class="body">
    
    <pre class="pane" class:active={activeMode === 'current'}>{script || '// No script generated'}</pre>

    
    <div class="pane diff" class:active={activeMode === 'diff'} bind:this={diffPaneEl}>
      {#each diffLines$ as line, index (index)}
        <div
          class="line"
          class:diff-added={line.type === 'added'}
          class:diff-removed={line.type === 'removed'}
          class:diff-unchanged={line.type === 'unchanged'}
          class:diff-focus={diffTargets[diffIndex]?.index === index}
        >
          <span class="ln">{line.oldLineNum ?? ''}</span>
          <span class="ln">{line.newLineNum ?? ''}</span>
          <span class="code">{line.content}</span>
        </div>
      {/each}
    </div>

    
    <textarea
      class="pane edit"
      class:active={activeMode === 'edit'}
      name="script-edit"
      spellcheck="false"
      autocomplete="off"
      value={_editContent}
      onfocus={_handleEditFocus}
      onblur={_handleEditBlur}
      oninput={_handleEditInput}
    ></textarea>
  </div>

  <footer class="footer">
    <div class="stats">
      <span>{_lines} lines</span>
      <span>{_sizeKb} KB</span>
    </div>
    {#if showActions}
      <div class="actions">
        <button type="button" class="btn-secondary" onclick={_handleCopy}>
          {_copyText}
        </button>
        <button type="button" class="cyber-btn cyber-btn--primary" onclick={_handleDownload}>
          <span class="text">Download</span>
        </button>
      </div>
    {/if}
  </footer>
</div>

<script lang="ts">
/**
 * CodeViewer - Script viewer with Current/Diff/Edit tabs
 *
 * Displays generated PowerShell scripts with:
 * - Current: Plain text view
 * - Diff: changed blocks against the previous version
 * - Edit: Editable textarea for modifications
 */

import { diffLines } from 'diff'
import type { ScriptMode } from '$lib/state.svelte'
import { SCRIPT_FILENAME } from '$lib/types'
import { copyToClipboard } from '../utils/clipboard'
import { downloadText } from '../utils/download'

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
  pillLabel = 'Preview',
  showActions = true,
  onModeChange,
  onEdit,
}: Props = $props()

let localModeOverride = $state<ScriptMode | null>(null)
const activeMode = $derived(localModeOverride ?? mode)
let diffIndex = $state(0)
let isEditing = $state(false)
let editContent = $state('')
let copyText = $state('Copy')
let copyTimeout: ReturnType<typeof setTimeout> | null = null
let diffPaneEl: HTMLPreElement | null = $state(null)

$effect(() => {
  void mode
  localModeOverride = null
})

$effect(() => {
  if (!isEditing) {
    editContent = script
  }
})

const lines = $derived(script ? script.split('\n').length : 0)
const sizeKb = $derived(script ? (new Blob([script]).size / 1024).toFixed(1) : '0.0')

interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

/** One text node per diff part, computed only while the Diff tab is open */
const diffChunks = $derived.by((): DiffChunk[] => {
  if (activeMode !== 'diff') return []
  return diffLines(previousScript || '', script || '').map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    text: part.value,
  }))
})

const diffTargets = $derived(
  diffChunks.map((chunk, index) => ({ chunk, index })).filter(({ chunk }) => chunk.type !== 'unchanged'),
)

const showNav = $derived(activeMode === 'diff' && diffTargets.length > 0)

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

function handleTabClick(tabMode: ScriptMode) {
  setMode(tabMode)
}

function handleEditFocus() {
  isEditing = true
}

function handleEditBlur() {
  isEditing = false
}

function handleEditInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
  const { value } = event.currentTarget
  editContent = value
  onEdit?.(value)
}

function navigateDiff(direction: 'prev' | 'next') {
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

  const chunkEls = diffPaneEl.querySelectorAll('.chunk')
  chunkEls[target.index]?.scrollIntoView({ block: 'center' })
}

async function handleCopy() {
  if (!script) return

  const success = await copyToClipboard(script)
  if (success) {
    copyText = 'Copied!'
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      copyText = 'Copy'
    }, 1800)
  }
}

function handleDownload() {
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
      class:active={activeMode === "current"}
      onclick={() => handleTabClick("current")}
    >
      Current
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === "diff"}
      onclick={() => handleTabClick("diff")}
    >
      Diff
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === "edit"}
      onclick={() => handleTabClick("edit")}
    >
      Edit
    </button>

    {#if showNav}
      <div class="nav">
        <button
          type="button"
          class="nav-btn"
          title="Previous change"
          onclick={() => navigateDiff("prev")}
        >
          <svg aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <span class="nav-count">{diffIndex + 1}/{diffTargets.length}</span>
        <button
          type="button"
          class="nav-btn"
          title="Next change"
          onclick={() => navigateDiff("next")}
        >
          <svg aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    {/if}

    <div class="pill">{pillLabel}</div>
  </header>

  <div class="body">
    {#if activeMode === "current"}
      <pre class="pane active"><code>{script || "// No script generated"}</code></pre>
    {:else if activeMode === "diff"}
      <pre class="pane diff active" bind:this={diffPaneEl}><code
          >{#each diffChunks as chunk, index (index)}<span
              class="chunk"
              class:diff-added={chunk.type === "added"}
              class:diff-removed={chunk.type === "removed"}
              class:diff-focus={diffTargets[diffIndex]?.index === index}
              >{chunk.text}</span
            >{/each}</code
        ></pre>
    {:else}
      <textarea
        class="pane edit active"
        name="script-edit"
        spellcheck="false"
        autocomplete="off"
        value={editContent}
        onfocus={handleEditFocus}
        onblur={handleEditBlur}
        oninput={handleEditInput}
      ></textarea>
    {/if}
  </div>

  <footer class="footer">
    <div class="stats">
      <span>{lines} lines</span>
      <span>{sizeKb} KB</span>
    </div>
    {#if showActions}
      <div class="actions">
        <button type="button" class="btn-secondary" onclick={handleCopy}>
          {copyText}
        </button>
        <button
          type="button"
          class="cyber-btn cyber-btn--primary"
          onclick={handleDownload}
        >
          <span class="text">Download</span>
        </button>
      </div>
    {/if}
  </footer>
</div>

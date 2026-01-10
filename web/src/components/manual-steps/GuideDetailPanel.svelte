<script lang="ts">
/**
 * GuideDetailPanel - Side panel for displaying manual step details
 *
 * Editorial typography approach: no inner boxes, clear hierarchy through
 * type scale, weight, and color. Inspired by modern editorial design.
 */

import { fade, fly } from 'svelte/transition'
import { cubicOut } from 'svelte/easing'
import Icon from '../ui/Icon.svelte'
import type { NormalizedManualItem } from '$lib/manual-steps'

interface Props {
  isOpen: boolean
  item: NormalizedManualItem
  automationInfo?: {
    module: string
    function: string
    registryPath?: string
  } | null
  isCompleted: boolean
  onClose: () => void
  onToggleComplete: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
  categoryTitle?: string
}

let {
  isOpen,
  item,
  automationInfo = null,
  isCompleted,
  onClose,
  onToggleComplete,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  categoryTitle = '',
}: Props = $props()

let panelRef = $state<HTMLElement | null>(null)

const HINTS_STORAGE_KEY = 'panel-hints-dismissed'

let hintsVisible = $state(true)
let hintsFading = $state(false)
let fadeScheduled = false

function isHintsDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(HINTS_STORAGE_KEY) === 'true'
}

function getInteractionCount(): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(HINTS_STORAGE_KEY + '-count') || '0', 10)
}

function incrementInteraction() {
  if (typeof localStorage === 'undefined') return
  if (isHintsDismissed() || fadeScheduled) return

  const count = getInteractionCount() + 1
  localStorage.setItem(HINTS_STORAGE_KEY + '-count', count.toString())

  if (count >= 3 && hintsVisible) {
    fadeScheduled = true
    setTimeout(() => {
      hintsFading = true
      setTimeout(() => {
        hintsVisible = false
        localStorage.setItem(HINTS_STORAGE_KEY, 'true')
      }, 1000)
    }, 5000)
  }
}

function handleActionClick(action: () => void) {
  incrementInteraction()
  action()
}

$effect(() => {
  if (isOpen) {
    if (isHintsDismissed()) {
      hintsVisible = false
    }
  }
})

function formatImpact(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `${value}`
  return '0'
}

function formatScore(value: number | null): string {
  if (value === null) return '?/5'
  return `${value}/5`
}

function buildSearchUrl(term: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`
}

const KEY_ALIASES: Record<string, { label: string; key: string }> = {
  ctrl: { label: 'Ctrl', key: 'ctrl' },
  control: { label: 'Ctrl', key: 'ctrl' },
  alt: { label: 'Alt', key: 'alt' },
  option: { label: 'Alt', key: 'alt' },
  shift: { label: 'Shift', key: 'shift' },
  win: { label: 'Win', key: 'win' },
  windows: { label: 'Win', key: 'win' },
  cmd: { label: 'Cmd', key: 'cmd' },
  command: { label: 'Cmd', key: 'cmd' },
  esc: { label: 'Esc', key: 'esc' },
  escape: { label: 'Esc', key: 'esc' },
  tab: { label: 'Tab', key: 'tab' },
  enter: { label: 'Enter', key: 'enter' },
  return: { label: 'Enter', key: 'enter' },
  del: { label: 'Del', key: 'del' },
  delete: { label: 'Del', key: 'del' },
  backspace: { label: 'Backspace', key: 'backspace' },
  space: { label: 'Space', key: 'space' },
  pgup: { label: 'PgUp', key: 'pgup' },
  'page up': { label: 'PgUp', key: 'pgup' },
  pgdn: { label: 'PgDn', key: 'pgdn' },
  'page down': { label: 'PgDn', key: 'pgdn' },
  ins: { label: 'Ins', key: 'ins' },
  insert: { label: 'Ins', key: 'ins' },
  home: { label: 'Home', key: 'home' },
  end: { label: 'End', key: 'end' },
  up: { label: 'Up', key: 'up' },
  down: { label: 'Down', key: 'down' },
  left: { label: 'Left', key: 'left' },
  right: { label: 'Right', key: 'right' },
} as const

const KEY_PATTERN = Object.keys(KEY_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((key) => key.replace(/ /g, '\\s+'))
  .join('|')

const KEY_SEQUENCE_REGEX = new RegExp(`\\b(?:${KEY_PATTERN})(?:\\s*\\+\\s*(?:${KEY_PATTERN}))+`, 'gi')
const REGISTRY_PATH_REGEX = /\b(?:HKLM|HKCU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKCR|HKU|HKCC)[^\s,;)]*/gi
const FILE_PATH_REGEX = /\b[A-Z]:\\[^\s,;)]*/g
const MENU_PATH_REGEX = /\b(?:Settings|System|Control Panel|NVIDIA Control Panel|AMD Software|AMD Adrenalin|Registry Editor|BIOS|UEFI|Task Manager|Device Manager|Steam|Discord|OBS|Right-click desktop|Desktop)[^.,;\n]*?(?:>|→)[^.,;\n]+(?:\s*(?:>|→)\s*[^.,;\n]+)*/gi

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function replaceTokens(
  input: string,
  pattern: RegExp,
  tokens: string[],
  render: (match: string) => string,
): string {
  return input.replace(pattern, (match) => {
    const token = `%%TOKEN${tokens.length}%%`
    tokens.push(render(match))
    return token
  })
}

function renderKbdSequence(sequence: string): string {
  const parts = sequence.split(/\s*\+\s*/).map((part) => part.trim()).filter(Boolean)
  return parts
    .map((part) => {
      const key = part.toLowerCase().replace(/\s+/g, ' ')
      const mapping = KEY_ALIASES[key]
      const label = mapping?.label ?? part
      const dataKey = mapping?.key ?? key.replace(/\s+/g, '-')
      return `<kbd class="guide-kbd" data-key="${escapeHtml(dataKey)}">${escapeHtml(label)}</kbd>`
    })
    .join('<span class="kbd-plus">+</span>')
}

function isPreformattedLine(text: string): boolean {
  const trimmed = text.trim()
  return (
    /^Registry:/i.test(trimmed) ||
    /^(HKLM|HKCU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKCR|HKU|HKCC)/i.test(trimmed) ||
    /^[A-Z]:\\/.test(trimmed)
  )
}

function formatGuideLine(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (isPreformattedLine(trimmed)) {
    return `<pre class="guide-pre">${escapeHtml(trimmed)}</pre>`
  }

  const tokens: string[] = []
  let working = text
  working = replaceTokens(working, KEY_SEQUENCE_REGEX, tokens, (match) => renderKbdSequence(match))
  working = replaceTokens(working, REGISTRY_PATH_REGEX, tokens, (match) => `<code class="guide-inline-code">${escapeHtml(match)}</code>`)
  working = replaceTokens(working, FILE_PATH_REGEX, tokens, (match) => `<code class="guide-inline-code">${escapeHtml(match)}</code>`)
  working = replaceTokens(working, MENU_PATH_REGEX, tokens, (match) => `<code class="guide-inline-code">${escapeHtml(match)}</code>`)

  let escaped = escapeHtml(working)
  tokens.forEach((html, index) => {
    escaped = escaped.replace(`%%TOKEN${index}%%`, html)
  })
  return escaped
}

function formatGuideHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => formatGuideLine(line))
    .filter(Boolean)
    .join('<br />')
}

// Handle Escape key to close
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onClose()
  }
}

// Focus trap and keyboard handling
$effect(() => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeydown)
    // Focus the panel when it opens
    setTimeout(() => {
      panelRef?.focus()
    }, 100)
  }
  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="panel-backdrop"
    onclick={onClose}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Panel -->
  <div
    bind:this={panelRef}
    class="guide-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="panel-title"
    tabindex="-1"
    transition:fly={{ x: 400, duration: 300, easing: cubicOut }}
  >
    <header class="panel-header">
      <div class="panel-header-text">
        {#if categoryTitle}
          <span class="panel-category">{categoryTitle}</span>
        {/if}
        <h3 id="panel-title" class="panel-title panel-title--accent">{item.title}</h3>
      </div>
      <button
        type="button"
        class="panel-close"
        onclick={onClose}
        aria-label="Close panel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </header>

    <div class="panel-body">
      {#if item.guide.intro}
        <div class="panel-intro">{item.guide.intro}</div>
      {/if}

      <!-- How to Configure -->
      <h4 class="panel-heading">How to Configure</h4>
      {#if item.guide.steps.length > 0}
        <ol class="panel-steps">
          {#each item.guide.steps as step, i}
            <li>
              <span class="step-number">{i + 1}</span>
              <div class="step-text">{@html formatGuideHtml(step)}</div>
            </li>
          {/each}
        </ol>
      {/if}

      <!-- Benefits -->
      {#if item.guide.benefits.length > 0}
        <h4 class="panel-heading">Benefits</h4>
        <ul class="panel-list panel-list--benefits">
          {#each item.guide.benefits as benefit}
            <li>{@html formatGuideHtml(benefit)}</li>
          {/each}
        </ul>
      {/if}

      <!-- Risks -->
      {#if item.guide.risks.length > 0}
        <h4 class="panel-heading">Risks</h4>
        <ul class="panel-list panel-list--considerations">
          {#each item.guide.risks as risk}
            <li>
{@html formatGuideHtml(risk)}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Skip If -->
      {#if item.guide.skipIf.length > 0}
        <h4 class="panel-heading">Skip If</h4>
        <ul class="panel-list panel-list--skip">
          {#each item.guide.skipIf as skip}
            <li>
{@html formatGuideHtml(skip)}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Verify -->
      {#if item.guide.verify.length > 0}
        <h4 class="panel-heading">Verify</h4>
        <ul class="panel-list panel-list--verify">
          {#each item.guide.verify as verify}
            <li>
{@html formatGuideHtml(verify)}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Rollback -->
      {#if item.guide.rollback.length > 0}
        <h4 class="panel-heading">Rollback</h4>
        <ul class="panel-list panel-list--rollback">
          {#each item.guide.rollback as rollback}
            <li>
{@html formatGuideHtml(rollback)}
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.symptoms && item.guide.symptoms.length > 0}
        <h4 class="panel-heading">Only If You See</h4>
        <ul class="panel-list panel-list--symptoms">
          {#each item.guide.symptoms as symptom}
            <li>
{@html formatGuideHtml(symptom)}
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.compatibilityNotes && item.guide.compatibilityNotes.length > 0}
        <h4 class="panel-heading">Compatibility Notes</h4>
        <ul class="panel-list panel-list--compat">
          {#each item.guide.compatibilityNotes as note}
            <li>
{@html formatGuideHtml(note)}
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.bottleneckHint && item.guide.bottleneckHint.length > 0}
        <h4 class="panel-heading">Bottleneck Hint</h4>
        <ul class="panel-list panel-list--bottleneck">
          {#each item.guide.bottleneckHint as hint}
            <li>
{@html formatGuideHtml(hint)}
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.techNotes.length > 0}
        <h4 class="panel-heading">Tech Notes</h4>
        <ul class="panel-list panel-list--tech">
          {#each item.guide.techNotes as note}
            <li>
{@html formatGuideHtml(note)}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Assessment -->
      <h4 class="panel-heading">Assessment</h4>
      <dl class="panel-assessment">
        <div class="assessment-row">
          <dt>Evidence</dt>
          <dd>{item.guide.assessment.evidence}</dd>
        </div>
        <div class="assessment-row">
          <dt>Confidence</dt>
          <dd>{formatScore(item.guide.assessment.confidence)}</dd>
        </div>
        <div class="assessment-row">
          <dt>Risk</dt>
          <dd>{formatScore(item.guide.assessment.risk)}</dd>
        </div>
        <div class="assessment-row">
          <dt>Scope</dt>
          <dd>{item.guide.assessment.scope}</dd>
        </div>
        {#if item.guide.assessment.lastReviewed}
          <div class="assessment-row">
            <dt>Last reviewed</dt>
            <dd>{item.guide.assessment.lastReviewed}</dd>
          </div>
        {/if}
        {#if item.guide.assessment.prerequisites && item.guide.assessment.prerequisites.length > 0}
          <div class="assessment-row">
            <dt>Prerequisites</dt>
            <dd>{item.guide.assessment.prerequisites.join(', ')}</dd>
          </div>
        {/if}
        {#if item.guide.assessment.appliesTo && item.guide.assessment.appliesTo.length > 0}
          <div class="assessment-row">
            <dt>Applies to</dt>
            <dd>{item.guide.assessment.appliesTo.join(', ')}</dd>
          </div>
        {/if}
        {#if Object.keys(item.guide.assessment.impact).length > 0}
          <div class="assessment-row assessment-row--impact">
            <dt>Impact</dt>
            <dd>
              {#each Object.entries(item.guide.assessment.impact) as [axis, value]}
                <span class="impact-pill">{axis}: {formatImpact(value)}</span>
              {/each}
            </dd>
          </div>
        {/if}
      </dl>

      {#if item.guide.assessment.sources && item.guide.assessment.sources.length > 0}
        <h4 class="panel-heading">Sources</h4>
        <ul class="panel-list panel-list--sources">
          {#each item.guide.assessment.sources as source}
            <li>
              {#if source.startsWith('search:')}
                <a href={buildSearchUrl(source.replace('search:', '').trim())} target="_blank" rel="noopener noreferrer">
                  {source}
                </a>
              {:else}
                <a href={source} target="_blank" rel="noopener noreferrer">
                  {source}
                </a>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.failureModes.length > 0}
        <h4 class="panel-heading">Failure Modes</h4>
        <ul class="panel-list panel-list--failures">
          {#each item.guide.failureModes as mode}
            <li>
              <strong>{@html formatGuideHtml(mode.symptom)}</strong>
              <div class="panel-text">{@html formatGuideHtml(mode.whatToDo)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.videos.length > 0}
        <h4 class="panel-heading">Videos</h4>
        <ul class="panel-list panel-list--videos">
          {#each item.guide.videos as video}
            <li>
              {#if video.videoId}
                <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
                  {video.creator} — {video.title}
                </a>
              {:else if video.search}
                <a href={buildSearchUrl(video.search)} target="_blank" rel="noopener noreferrer">
                  {video.creator} — {video.title}
                </a>
              {:else}
                <span>{video.creator} — {video.title}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Automation Details -->
      {#if automationInfo}
        <h4 class="panel-heading">What the Script Does</h4>
        <dl class="panel-automation">
          <div class="automation-row">
            <dt>Module</dt>
            <dd><code>{automationInfo.module}</code></dd>
          </div>
          <div class="automation-row">
            <dt>Function</dt>
            <dd><code>{automationInfo.function}</code></dd>
          </div>
          {#if automationInfo.registryPath}
            <div class="automation-row">
              <dt>Registry</dt>
              <dd><code>{automationInfo.registryPath}</code></dd>
            </div>
          {/if}
        </dl>
      {/if}
    </div>

    <footer class="panel-footer">
      <div class="panel-footer-actions">
        <button
          type="button"
          class="panel-nav"
          onclick={() => handleActionClick(() => onPrev && onPrev())}
          disabled={!hasPrev}
          aria-label="Previous item (A)"
        >
          <span class="btn-label">‹ Prev</span>
          {#if hintsVisible}
            <kbd class="btn-key" class:fading={hintsFading}>A</kbd>
          {/if}
        </button>
        <button
          type="button"
          class="panel-action"
          class:completed={isCompleted}
          onclick={() => handleActionClick(onToggleComplete)}
        >
          {#if isCompleted}<span class="btn-check">✓</span>{/if}
          <span class="btn-label">{isCompleted ? 'Done' : 'Mark Done'}</span>
          {#if hintsVisible}
            <kbd class="btn-key btn-key--action" class:fading={hintsFading}>Space</kbd>
          {/if}
        </button>
        <button
          type="button"
          class="panel-nav"
          onclick={() => handleActionClick(() => onNext && onNext())}
          disabled={!hasNext}
          aria-label="Next item (D)"
        >
          {#if hintsVisible}
            <kbd class="btn-key" class:fading={hintsFading}>D</kbd>
          {/if}
          <span class="btn-label">Next ›</span>
        </button>
      </div>
    </footer>
  </div>
{/if}

<style>
  .panel-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: color-mix(in oklch, var(--bg-primary) 70%, transparent);
    backdrop-filter: blur(4px);
  }

  .guide-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    width: min(500px, 90vw);
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklch, var(--cyber-cyan) 3%, var(--bg-elevated));
  }

  .panel-header-text {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .panel-category {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--cyber-cyan);
  }

  .panel-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .panel-title--accent {
    color: var(--cyber-cyan);
  }

  @supports (background-clip: text) or (-webkit-background-clip: text) {
    .panel-title--accent {
      background: linear-gradient(120deg, var(--cyber-cyan), var(--cyber-yellow));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  .panel-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 32px;
    block-size: 32px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) ease;

    &:hover {
      color: var(--text-primary);
      border-color: var(--text-dim);
    }
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }

  .panel-intro {
    margin-block: 0 var(--space-md);
    color: var(--text-secondary);
    font-size: var(--text-base);
    line-height: 1.6;
  }

  .panel-heading {
    margin: var(--space-md) 0 var(--space-sm);
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .panel-steps {
    display: grid;
    gap: var(--space-sm);
    margin: 0 0 var(--space-md);
    padding: 0;
    list-style: none;
  }

  .panel-steps li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-sm);
    align-items: start;
  }

  .step-number {
    inline-size: 24px;
    block-size: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--cyber-cyan);
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 50%, transparent);
    border-radius: 6px;
  }

  .step-text {
    display: block;
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  .panel-list {
    display: grid;
    gap: var(--space-xs);
    margin: 0 0 var(--space-md);
    padding: 0;
    list-style: none;
  }

  .panel-list li {
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .panel-list--failures li {
    display: grid;
    gap: 4px;
  }

  .panel-list--failures strong {
    color: var(--text-primary);
  }

  .panel-list--failures .panel-text {
    color: var(--text-secondary);
  }

  .panel-assessment {
    display: grid;
    gap: var(--space-xs);
    margin-block-end: var(--space-md);
  }

  .assessment-row {
    display: flex;
    align-items: baseline;
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .assessment-row dt {
    display: flex;
    align-items: baseline;
    flex: 1;
    color: color-mix(in oklch, var(--text-primary) 85%, white);
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .assessment-row dt::after {
    content: '';
    flex: 1;
    border-block-end: 1px dotted oklch(0.4 0.01 285);
    margin-inline: var(--space-sm) var(--space-xs);
    min-inline-size: var(--space-md);
    align-self: flex-end;
    margin-block-end: 0.3em;
  }

  .assessment-row dd {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-weight: 500;
    letter-spacing: 0.025em;
    white-space: nowrap;
  }

  .assessment-row--impact dd {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .impact-pill {
    padding: 4px 8px;
    border-radius: 4px;
    background: color-mix(in oklch, var(--cyber-cyan) 15%, transparent);
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 25%, transparent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-primary);
  }

  .panel-list--sources li,
  .panel-list--videos li {
    font-size: var(--text-sm);
  }

  .panel-automation {
    display: grid;
    gap: var(--space-xs);
    margin-block-end: var(--space-md);
  }

  .automation-row {
    display: flex;
    align-items: baseline;
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .automation-row dt {
    display: flex;
    align-items: baseline;
    flex: 1;
    color: color-mix(in oklch, var(--text-primary) 85%, white);
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .automation-row dt::after {
    content: '';
    flex: 1;
    border-block-end: 1px dotted oklch(0.4 0.01 285);
    margin-inline: var(--space-sm) var(--space-xs);
    min-inline-size: var(--space-md);
    align-self: flex-end;
    margin-block-end: 0.3em;
  }

  .automation-row dd {
    margin: 0;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 500;
    word-break: break-all;
  }

  .panel-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .panel-footer-actions {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
  }

  .panel-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: 12px 24px;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--bg-primary);
    background: var(--cyber-yellow);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--duration-fast) ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 20px color-mix(in oklch, var(--cyber-yellow) 50%, transparent);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .panel-action.completed {
    background: transparent;
    border: 1.5px solid var(--cyber-yellow);
    color: var(--cyber-yellow);
  }

  .panel-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid color-mix(in oklch, var(--text-primary) 22%, transparent);
    background: color-mix(in oklch, var(--bg-secondary) 80%, transparent);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--duration-fast) ease;

    &:hover:not(:disabled) {
      border-color: var(--cyber-cyan);
      color: var(--cyber-cyan);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  .btn-label {
    white-space: nowrap;
  }

  .btn-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-secondary);
    background: linear-gradient(
      180deg,
      color-mix(in oklch, var(--bg-tertiary) 90%, white) 0%,
      var(--bg-tertiary) 100%
    );
    border: 1px solid color-mix(in oklch, var(--text-dim) 50%, transparent);
    border-radius: 4px;
    box-shadow:
      0 2px 0 color-mix(in oklch, var(--text-dim) 40%, transparent),
      inset 0 1px 0 color-mix(in oklch, white 10%, transparent);
    text-transform: uppercase;
    opacity: 1;
    transition: opacity 1000ms ease-out;

    &.fading {
      opacity: 0;
    }
  }

  .btn-key--action {
    color: currentColor;
    background: transparent;
    border: 1.5px solid currentColor;
    box-shadow: none;
  }
</style>

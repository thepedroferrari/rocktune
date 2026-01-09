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
}: Props = $props()

let panelRef = $state<HTMLElement | null>(null)

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
  <aside
    bind:this={panelRef}
    class="guide-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="panel-title"
    tabindex="-1"
    transition:fly={{ x: 400, duration: 300, easing: cubicOut }}
  >
    <header class="panel-header">
      <h3 id="panel-title" class="panel-title">{item.title}</h3>
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
            <li>
              <Icon name="check" size="xs" variant="success" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(benefit)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Risks -->
      {#if item.guide.risks.length > 0}
        <h4 class="panel-heading">Risks</h4>
        <ul class="panel-list panel-list--considerations">
          {#each item.guide.risks as risk}
            <li>
              <Icon name="warning" size="xs" variant="warning" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(risk)}</div>
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
              <Icon name="close" size="xs" variant="muted" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(skip)}</div>
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
              <Icon name="check" size="xs" variant="accent" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(verify)}</div>
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
              <Icon name="refresh" size="xs" variant="warning" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(rollback)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.symptoms && item.guide.symptoms.length > 0}
        <h4 class="panel-heading">Only If You See</h4>
        <ul class="panel-list panel-list--symptoms">
          {#each item.guide.symptoms as symptom}
            <li>
              <Icon name="warning" size="xs" variant="warning" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(symptom)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.compatibilityNotes && item.guide.compatibilityNotes.length > 0}
        <h4 class="panel-heading">Compatibility Notes</h4>
        <ul class="panel-list panel-list--compat">
          {#each item.guide.compatibilityNotes as note}
            <li>
              <Icon name="info" size="xs" variant="accent" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(note)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.bottleneckHint && item.guide.bottleneckHint.length > 0}
        <h4 class="panel-heading">Bottleneck Hint</h4>
        <ul class="panel-list panel-list--bottleneck">
          {#each item.guide.bottleneckHint as hint}
            <li>
              <Icon name="info" size="xs" variant="muted" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(hint)}</div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if item.guide.techNotes.length > 0}
        <h4 class="panel-heading">Tech Notes</h4>
        <ul class="panel-list panel-list--tech">
          {#each item.guide.techNotes as note}
            <li>
              <Icon name="code" size="xs" variant="muted" class="panel-icon" />
              <div class="panel-text">{@html formatGuideHtml(note)}</div>
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
      <button
        type="button"
        class="panel-nav"
        onclick={() => onPrev && onPrev()}
        disabled={!hasPrev}
        aria-label="Previous item"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        class="panel-action"
        class:completed={isCompleted}
        onclick={() => onToggleComplete()}
      >
        {isCompleted ? 'Marked as Done' : 'Mark as Done'}
      </button>
      <button
        type="button"
        class="panel-nav"
        onclick={() => onNext && onNext()}
        disabled={!hasNext}
        aria-label="Next item"
      >
        <span aria-hidden="true">›</span>
      </button>
    </footer>
  </aside>
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
    width: min(420px, 90vw);
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

  .panel-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
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
    font-size: var(--text-sm);
    line-height: 1.5;
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
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--cyber-cyan);
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 50%, transparent);
    border-radius: 6px;
  }

  .step-text {
    display: block;
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: 1.5;
  }

  .panel-list {
    display: grid;
    gap: var(--space-xs);
    margin: 0 0 var(--space-md);
    padding: 0;
    list-style: none;
  }

  .panel-list li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .panel-icon {
    margin-top: 0.2em;
    flex-shrink: 0;
  }

  .panel-text {
    flex: 1;
    min-width: 0;
    line-height: 1.5;
  }

  .guide-inline-code {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 30%, transparent);
    background: color-mix(in oklch, var(--cyber-cyan) 12%, transparent);
    font-family: var(--font-mono);
    font-size: 0.78em;
    color: var(--text-primary);
  }

  .guide-pre {
    display: inline-block;
    margin: 0;
    padding: var(--space-xs) var(--space-sm);
    border-radius: 12px;
    border: 1px solid color-mix(in oklch, var(--cyber-cyan) 25%, transparent);
    background: color-mix(in oklch, var(--cyber-cyan) 8%, transparent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-primary);
    white-space: pre-wrap;
    max-width: 100%;
    overflow-x: auto;
  }

  .guide-kbd {
    display: inline-flex;
    align-items: center;
    padding: 0.12rem 0.45rem;
    border-radius: 10px;
    border: 1px solid color-mix(in oklch, var(--text-secondary) 35%, transparent);
    background: color-mix(in oklch, var(--text-secondary) 12%, transparent);
    font-family: var(--font-mono);
    font-size: 0.78em;
    color: var(--text-primary);
    letter-spacing: 0.02em;
    text-transform: capitalize;
  }

  .kbd-plus {
    margin: 0 0.2rem;
    color: var(--text-dim);
    font-size: 0.75em;
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
    margin: 0 0 var(--space-md);
  }

  .assessment-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-sm);
    font-size: var(--text-xs);
  }

  .assessment-row dt {
    color: var(--text-dim);
    font-weight: 500;
  }

  .assessment-row dd {
    margin: 0;
    color: var(--text-primary);
    text-align: right;
  }

  .assessment-row--impact dd {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    justify-content: flex-end;
  }

  .impact-pill {
    padding: 2px 6px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--cyber-cyan) 12%, transparent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-primary);
  }

  .panel-list--sources li,
  .panel-list--videos li {
    font-size: var(--text-xs);
  }

  .panel-automation {
    display: grid;
    gap: var(--space-xs);
    margin: 0 0 var(--space-md);
  }

  .automation-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-sm);
    font-size: var(--text-xs);
  }

  .automation-row dt {
    color: var(--text-dim);
  }

  .automation-row dd {
    margin: 0;
    color: var(--text-secondary);
  }

  .panel-footer {
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    gap: var(--space-sm);
    align-items: center;
    padding: var(--space-lg);
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .panel-action {
    width: 100%;
    padding: var(--space-sm);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--bg-primary);
    background: var(--cyber-yellow);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all var(--duration-fast) ease;
  }

  .panel-action.completed {
    background: var(--safe);
  }

  .panel-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: color-mix(in oklch, var(--bg-secondary) 70%, transparent);
    color: var(--text-secondary);
    font-size: var(--text-lg);
    cursor: pointer;
    transition: all var(--duration-fast) ease;
  }

  .panel-nav:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: var(--text-dim);
  }

  .panel-nav:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

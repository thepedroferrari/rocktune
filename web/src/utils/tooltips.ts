/**
 * Rich Tooltip System
 * Supports markdown-like formatting in tooltips:
 * - **bold** for emphasis
 * - ⚠️ prefix for warnings
 * - ✓ prefix for benefits
 * - Lines starting with "- " become list items
 * - Empty line creates paragraph break
 */

const TOOLTIP_ID = 'rich-tooltip'

interface TooltipConfig {
  showDelay: number
  hideDelay: number
  offset: number
}

const config: TooltipConfig = {
  showDelay: 200,
  hideDelay: 100,
  offset: 8,
}

let showTimeout: number | null = null
let hideTimeout: number | null = null
let currentTrigger: HTMLElement | null = null

function createTooltipElement(): HTMLElement {
  const existing = document.getElementById(TOOLTIP_ID)
  if (existing) return existing

  const el = document.createElement('div')
  el.id = TOOLTIP_ID
  el.setAttribute('role', 'tooltip')
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  return el
}

function parseRichContent(raw: string): string {
  const lines = raw.split('\n')
  const parts: string[] = []
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) {
        parts.push('</ul>')
        inList = false
      }
      continue
    }

    // List items
    if (trimmed.startsWith('- ')) {
      if (!inList) {
        parts.push('<ul>')
        inList = true
      }
      const content = formatInline(trimmed.slice(2))
      parts.push(`<li>${content}</li>`)
      continue
    }

    // Close list if we're not in a list item
    if (inList) {
      parts.push('</ul>')
      inList = false
    }

    // Warning line
    if (trimmed.startsWith('⚠️') || trimmed.startsWith('⚠')) {
      parts.push(`<p class="tt-warn">${formatInline(trimmed)}</p>`)
      continue
    }

    // Success/benefit line
    if (trimmed.startsWith('✓') || trimmed.startsWith('✔')) {
      parts.push(`<p class="tt-ok">${formatInline(trimmed)}</p>`)
      continue
    }

    // Regular paragraph
    parts.push(`<p>${formatInline(trimmed)}</p>`)
  }

  if (inList) parts.push('</ul>')

  return parts.join('')
}

function formatInline(text: string): string {
  // **bold** → <strong>bold</strong>
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function positionTooltip(tooltip: HTMLElement, trigger: HTMLElement): void {
  const triggerRect = trigger.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Default: below the trigger
  let top = triggerRect.bottom + config.offset
  let left = triggerRect.left

  // If tooltip would go off right edge, align to right of trigger
  if (left + tooltipRect.width > viewportWidth - 16) {
    left = triggerRect.right - tooltipRect.width
  }

  // If tooltip would go off left edge
  if (left < 16) {
    left = 16
  }

  // If tooltip would go off bottom, show above
  if (top + tooltipRect.height > viewportHeight - 16) {
    top = triggerRect.top - tooltipRect.height - config.offset
    tooltip.classList.add('tt-above')
  } else {
    tooltip.classList.remove('tt-above')
  }

  tooltip.style.top = `${top + window.scrollY}px`
  tooltip.style.left = `${left + window.scrollX}px`
}

function showTooltip(trigger: HTMLElement): void {
  const tooltip = createTooltipElement()
  const content = trigger.dataset.tooltip || ''

  if (!content) return

  // Check if it's rich content (has newlines or formatting)
  const isRich = content.includes('\n') || content.includes('**') || content.includes('- ')

  if (isRich) {
    tooltip.innerHTML = parseRichContent(content)
    tooltip.classList.add('tt-rich')
  } else {
    tooltip.textContent = content
    tooltip.classList.remove('tt-rich')
  }

  tooltip.classList.add('tt-visible')
  tooltip.setAttribute('aria-hidden', 'false')
  currentTrigger = trigger

  // Position after content is set (need dimensions)
  requestAnimationFrame(() => {
    positionTooltip(tooltip, trigger)
  })
}

function hideTooltip(): void {
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (tooltip) {
    tooltip.classList.remove('tt-visible')
    tooltip.setAttribute('aria-hidden', 'true')
  }
  currentTrigger = null
}

function handleMouseEnter(e: Event): void {
  const trigger = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null
  if (!trigger) return

  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }

  if (currentTrigger === trigger) return

  showTimeout = window.setTimeout(() => {
    showTooltip(trigger)
  }, config.showDelay)
}

function handleMouseLeave(): void {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }

  hideTimeout = window.setTimeout(() => {
    hideTooltip()
  }, config.hideDelay)
}

function handleFocusIn(e: Event): void {
  const trigger = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null
  if (trigger) showTooltip(trigger)
}

function handleFocusOut(): void {
  hideTooltip()
}

export function setupRichTooltips(): void {
  // Use event delegation on document
  document.addEventListener('mouseenter', handleMouseEnter, true)
  document.addEventListener('mouseleave', handleMouseLeave, true)
  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('focusout', handleFocusOut)

  // Handle scroll/resize
  window.addEventListener(
    'scroll',
    () => {
      if (currentTrigger) {
        const tooltip = document.getElementById(TOOLTIP_ID)
        if (tooltip) positionTooltip(tooltip, currentTrigger)
      }
    },
    { passive: true },
  )
}


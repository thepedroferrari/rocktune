import { store } from '../state'
import type { SoftwarePackage } from '../types'
import { SIMPLE_ICONS_CDN } from '../types'
import { $id } from '../utils/dom'
import { createRipple } from '../utils/effects'

// SVG fallback icons by category (Lucide-style)
const CATEGORY_SVG_ICONS: Record<string, string> = {
  launcher:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
  gaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m8 0h.01m2-2h.01"/></svg>',
  streaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><circle cx="2" cy="20" r="1"/></svg>',
  monitoring:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  media:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  utility:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  rgb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  runtime:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>',
  benchmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20v-6m6 6v-4m-12 4V10m12-6 2 2-2 2m-4-2h4M6 6H2m4 0 2 2M6 6l2-2"/></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
}

export function renderSoftwareGrid(): void {
  const grid = $id('software-grid')
  if (!grid) return

  grid.innerHTML = ''
  let delay = 0

  for (const [key, pkg] of Object.entries(store.software)) {
    const card = createCard(key, pkg, delay)
    grid.appendChild(card)
    delay += 30
  }

  updateSoftwareCounter()
}

export function createCard(key: string, pkg: SoftwarePackage, delay: number): HTMLElement {
  const card = document.createElement('div')
  card.className = 'software-card entering'
  card.dataset.key = key
  card.dataset.category = pkg.category
  card.style.animationDelay = `${delay}ms`

  // Accessibility
  card.setAttribute('tabindex', '0')
  card.setAttribute('role', 'switch')
  const isSelected = store.selectedSoftware.has(key)
  card.setAttribute('aria-checked', isSelected ? 'true' : 'false')
  card.setAttribute(
    'aria-label',
    `${pkg.name}: ${pkg.desc || pkg.category}. Press Enter or Space to ${isSelected ? 'remove from' : 'add to'} selection.`,
  )

  if (isSelected) {
    card.classList.add('selected')
  }

  // Build logo HTML
  let logoHtml: string
  const fallbackIcon = CATEGORY_SVG_ICONS[pkg.category] || CATEGORY_SVG_ICONS.default

  if (pkg.icon) {
    if (pkg.icon.endsWith('.svg') || pkg.icon.startsWith('icons/')) {
      const iconId = pkg.icon.replace('icons/', '').replace('.svg', '')
      logoHtml = `<svg class="sprite-icon" role="img" aria-label="${pkg.name} icon"><use href="icons/sprite.svg#${iconId}"></use></svg>`
    } else {
      logoHtml = `<img src="${SIMPLE_ICONS_CDN}/${pkg.icon}/white" alt="${pkg.name} logo" loading="lazy" data-category="${pkg.category}" data-fallback="${pkg.emoji || ''}">`
    }
  } else if (pkg.emoji) {
    logoHtml = `<span class="emoji-icon" role="img" aria-label="${pkg.name} icon">${pkg.emoji}</span>`
  } else {
    logoHtml = fallbackIcon
  }

  const descText = pkg.desc || 'No description available.'
  const shortDesc = descText.length > 60 ? `${descText.slice(0, 57)}...` : descText

  card.innerHTML = `
    <div class="software-card-inner">
      <div class="software-card-front">
        <div class="logo">${logoHtml}</div>
        <span class="name">${pkg.name}</span>
        <span class="list-desc">${shortDesc}</span>
        <span class="list-category">${pkg.category}</span>
      </div>
      <div class="software-card-back">
        <span class="back-name">${pkg.name}</span>
        <span class="back-desc">${descText}</span>
        <span class="back-category">${pkg.category}</span>
        <span class="back-action">${isSelected ? '✓ Selected' : 'Click to add'}</span>
      </div>
    </div>
  `

  // Click handler
  card.addEventListener('click', (e) => {
    toggleSoftware(key, card)
    createRipple(e, card)
  })

  // Keyboard handler
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSoftware(key, card)
    }
  })

  // Magnetic hover
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    card.style.transform = `translate(${x * 0.05}px, ${y * 0.05}px)`
  })

  card.addEventListener('mouseleave', () => {
    card.style.transform = ''
  })

  card.addEventListener('animationend', () => {
    card.classList.remove('entering')
  })

  return card
}

export function toggleSoftware(key: string, card: HTMLElement): void {
  const _wasSelected = store.selectedSoftware.has(key)
  const isNowSelected = store.toggleSoftware(key)

  const actionBtn = card.querySelector('.back-action')
  const pkg = store.getPackage(key)
  const pkgName = pkg?.name || key
  const pkgDesc = pkg?.desc || pkg?.category || ''

  if (isNowSelected) {
    card.classList.add('selected')
    card.setAttribute('aria-checked', 'true')
    card.setAttribute(
      'aria-label',
      `${pkgName}: ${pkgDesc}. Press Enter or Space to remove from selection.`,
    )
    if (actionBtn) actionBtn.textContent = '✓ Selected'
  } else {
    card.classList.remove('selected')
    card.setAttribute('aria-checked', 'false')
    card.setAttribute(
      'aria-label',
      `${pkgName}: ${pkgDesc}. Press Enter or Space to add to selection.`,
    )
    if (actionBtn) actionBtn.textContent = 'Click to add'
  }

  updateSoftwareCounter()
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

export function updateSoftwareCounter(): void {
  const counter = $id('software-counter')
  if (counter) {
    counter.textContent = `${store.selectedSoftware.size} selected`
  }
}

export function updateCategoryBadges(): void {
  const counts = store.getCategoryCounts()
  for (const [cat, count] of Object.entries(counts)) {
    const el = $id(`count-${cat}`)
    if (el) el.textContent = String(count)
  }
}

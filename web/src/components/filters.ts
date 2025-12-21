import { store } from '../state'
import { $, $$, $id, announce, debounce } from '../utils/dom'

export function setupFilters(): void {
  const buttons = $$('.filter')

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      for (const b of buttons) {
        b.classList.remove('active')
      }
      btn.classList.add('active')

      const filter = btn.dataset.filter || '*'
      const cards = $$('.software-card')

      let i = 0
      for (const card of cards) {
        const show = filter === '*' || card.dataset.category === filter
        card.classList.toggle('hidden', !show)

        if (show) {
          card.style.animationDelay = `${i * 20}ms`
          card.classList.add('entering')
          card.addEventListener(
            'animationend',
            () => {
              card.classList.remove('entering')
            },
            { once: true },
          )
        }
        i++
      }

      store.setFilter(filter === '*' ? 'all' : filter)
    })
  }
}

export function setupSearch(): void {
  const input = $id('software-search') as HTMLInputElement | null
  if (!input) return

  const announceResults = debounce((count: number) => {
    announce(`${count} package${count !== 1 ? 's' : ''} found`)
  }, 500)

  input.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    const query = target.value.toLowerCase().trim()
    const cards = $$('.software-card')
    const activeFilter = $('.filter.active')?.dataset.filter || '*'

    let visibleCount = 0

    for (const card of cards) {
      const key = card.dataset.key
      if (!key) continue

      const pkg = store.getPackage(key)
      if (!pkg) continue

      const matchesSearch =
        !query ||
        pkg.name.toLowerCase().includes(query) ||
        pkg.desc?.toLowerCase().includes(query) ||
        pkg.category.toLowerCase().includes(query)

      const matchesFilter = activeFilter === '*' || card.dataset.category === activeFilter
      const isVisible = matchesSearch && matchesFilter

      card.classList.toggle('hidden', !isVisible)
      if (isVisible) visibleCount++
    }

    store.setSearchTerm(query)
    announceResults(visibleCount)
  })
}

export function setupViewToggle(): void {
  const buttons = $$('.view-btn')
  const grid = $id('software-grid')
  if (!buttons.length || !grid) return

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      for (const b of buttons) {
        b.classList.remove('active')
      }
      btn.classList.add('active')

      const view = btn.dataset.view as 'grid' | 'list'
      grid.classList.toggle('list-view', view === 'list')
      store.setView(view)
    })
  }
}

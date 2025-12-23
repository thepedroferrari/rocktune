
export function setupCursorGlow(): void {
  const glow = document.querySelector('.cursor-glow') as HTMLElement | null
  if (!glow) return

  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0

  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX
    targetY = e.clientY
  })

  function animate(): void {
    const ease = 0.08
    currentX += (targetX - currentX) * ease
    currentY += (targetY - currentY) * ease
    glow.style.left = `${currentX}px`
    glow.style.top = `${currentY}px`
    requestAnimationFrame(animate)
  }
  animate()
}

export function setupScrollAnimations(): void {
  const stepSections = document.querySelectorAll('.step')
  if (!stepSections.length) return

  stepSections.forEach((section, idx) => {
    ;(section as HTMLElement).style.setProperty('--stagger', String(idx))
  })

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '-30px' },
  )

  for (const section of stepSections) {
    revealObserver.observe(section)
  }

  setupProgressNav()
}

function setupProgressNav(): void {
  const dots = document.querySelectorAll<HTMLAnchorElement>('.step-dot')
  if (!dots.length) return

  const quickStart = document.getElementById('quick-start')
  const stepSections = document.querySelectorAll<HTMLElement>('.step')
  const allSections = quickStart ? [quickStart, ...stepSections] : [...stepSections]

  if (!allSections.length) return

  let currentSection: string | null = null

  function updateActiveNav(sectionId: string): void {
    if (currentSection === sectionId) return
    currentSection = sectionId

    dots.forEach((dot) => {
      dot.removeAttribute('aria-current')
      if (dot.getAttribute('href') === `#${sectionId}`) {
        dot.setAttribute('aria-current', 'step')
      }
    })
  }

  const progressObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => {
          const aTop = a.boundingClientRect.top
          const bTop = b.boundingClientRect.top
          return Math.abs(aTop) - Math.abs(bTop)
        })

      if (visible.length > 0) {
        updateActiveNav(visible[0].target.id)
      }
    },
    { threshold: [0, 0.1, 0.25, 0.5], rootMargin: '-45% 0px -45% 0px' },
  )

  for (const section of allSections) {
    progressObserver.observe(section)
  }

  handleEdgeCases(allSections, updateActiveNav)
}

function handleEdgeCases(
  sections: HTMLElement[],
  updateActiveNav: (id: string) => void,
): void {
  const firstSection = sections[0]
  const lastSection = sections[sections.length - 1]

  let ticking = false
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true

    requestAnimationFrame(() => {
      const scrollTop = window.scrollY
      const scrollBottom = scrollTop + window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      if (scrollTop < 100 && firstSection) {
        updateActiveNav(firstSection.id)
      } else if (scrollBottom >= docHeight - 50 && lastSection) {
        updateActiveNav(lastSection.id)
      }

      ticking = false
    })
  })
}

export function createRipple(e: MouseEvent, card: HTMLElement): void {
  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  const rect = card.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`
  const front = card.querySelector('.software-card-front')
  if (front) {
    front.appendChild(ripple)
    ripple.addEventListener('animationend', () => ripple.remove())
  }
}

export function setupImageFallbacks(categoryIcons: Record<string, string>): void {
  document.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.software-card')) {
        const img = target as HTMLImageElement
        const customFallback = img.dataset.fallback
        const category = img.dataset.category || 'default'
        const fallbackIcon = customFallback || categoryIcons[category] || categoryIcons.default
        img.style.display = 'none'
        if (img.parentElement) {
          img.parentElement.innerHTML = fallbackIcon
        }
      }
    },
    true,
  )
}

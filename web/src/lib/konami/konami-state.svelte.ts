/**
 * Konami Code State Management
 * Reactive state using Svelte 5 $state runes
 */

const STORAGE_KEY = 'rocktune_konami_highscore'

interface KonamiState {
  active: boolean
  highScore: number
}

const state: KonamiState = $state({
  active: false,
  highScore: loadHighScore(),
})

/**
 * Load high score from localStorage
 */
function loadHighScore(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      return Number.isNaN(parsed) ? 0 : parsed
    }
  } catch {
    // localStorage not available or error
  }
  return 0
}

/**
 * Save high score to localStorage
 */
function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, score.toString())
  } catch {
    // localStorage not available or error
  }
}

/**
 * Get the Konami state (reactive)
 */
export function getKonamiState(): KonamiState {
  return state
}

/**
 * Activate the Konami easter egg
 */
export function activateKonami(): void {
  state.active = true
}

/**
 * Deactivate the Konami easter egg
 */
export function deactivateKonami(): void {
  state.active = false
}

/**
 * Update high score if new score is higher
 */
export function updateHighScore(score: number): void {
  if (score > state.highScore) {
    state.highScore = score
    saveHighScore(score)
  }
}

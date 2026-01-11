/**
 * Konami Code Detector
 * Listens for the classic Konami Code sequence: ↑↑↓↓←→←→BA Enter
 */

type KonamiCallback = () => void

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
  'Enter',
] as const

const RESET_TIMEOUT = 2000 // Reset sequence after 2 seconds of inactivity

export class KonamiDetector {
  private buffer: string[] = []
  private callbacks = new Set<KonamiCallback>()
  private resetTimer: ReturnType<typeof setTimeout> | null = null
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null

  /**
   * Start listening for Konami Code
   */
  start(): void {
    if (this.handleKeyDown) {
      return // Already started
    }

    this.handleKeyDown = (e: KeyboardEvent) => {
      // Add key to buffer
      this.buffer.push(e.code)

      // Keep only last 11 keys (length of Konami Code)
      if (this.buffer.length > KONAMI_SEQUENCE.length) {
        this.buffer.shift()
      }

      // Check if sequence matches
      if (this.isSequenceComplete()) {
        this.triggerCallbacks()
        this.reset()
      }

      // Reset buffer after inactivity
      this.resetBufferAfterTimeout()
    }

    window.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Stop listening for Konami Code
   */
  stop(): void {
    if (this.handleKeyDown) {
      window.removeEventListener('keydown', this.handleKeyDown)
      this.handleKeyDown = null
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }

    this.reset()
  }

  /**
   * Register a callback to be called when Konami Code is detected
   */
  onActivate(callback: KonamiCallback): () => void {
    this.callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Check if the current buffer matches the Konami Code sequence
   */
  private isSequenceComplete(): boolean {
    if (this.buffer.length !== KONAMI_SEQUENCE.length) {
      return false
    }

    return KONAMI_SEQUENCE.every((key, index) => this.buffer[index] === key)
  }

  /**
   * Trigger all registered callbacks
   */
  private triggerCallbacks(): void {
    for (const callback of this.callbacks) {
      callback()
    }
  }

  /**
   * Reset the key buffer
   */
  private reset(): void {
    this.buffer = []

    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
  }

  /**
   * Reset buffer after timeout (2 seconds of inactivity)
   */
  private resetBufferAfterTimeout(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
    }

    this.resetTimer = setTimeout(() => {
      this.reset()
    }, RESET_TIMEOUT)
  }
}

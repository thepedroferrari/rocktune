/**
 * Spring physics animation utilities
 * ES2022+ features: private class fields, static blocks
 */

// =============================================================================
// Math Utilities - Pure functions with const assertions
// =============================================================================

/** Round to specified precision (default 3 decimal places) */
export const round = (value: number, precision = 3): number => parseFloat(value.toFixed(precision))

/** Clamp value between min and max bounds */
export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(Math.max(value, min), max)

/** Linear interpolation: map value from one range to another */
export const adjust = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number => round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))

/** Linear interpolation between two values */
export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * clamp(t, 0, 1)

// =============================================================================
// Types
// =============================================================================

export interface SpringConfig {
  readonly stiffness?: number
  readonly damping?: number
}

export interface SpringValue {
  x: number
  y: number
  o?: number // opacity
}

// Default spring configurations for common use cases
export const SPRING_PRESETS = {
  /** Snappy interaction response */
  INTERACTIVE: { stiffness: 0.066, damping: 0.25 } as const,
  /** Gentle snap-back animation */
  GENTLE: { stiffness: 0.01, damping: 0.06 } as const,
  /** Bouncy, playful motion */
  BOUNCY: { stiffness: 0.1, damping: 0.15 } as const,
  /** Stiff, responsive */
  STIFF: { stiffness: 0.2, damping: 0.4 } as const,
} as const satisfies Record<string, SpringConfig>

// =============================================================================
// Spring Class - Physics-based animation with ES2022 private fields
// =============================================================================

export class Spring {
  // ES2022 Private class fields - true encapsulation
  #target: SpringValue
  #current: SpringValue
  #velocity: SpringValue
  #stiffness: number
  #damping: number

  // ES2022 Static initialization block
  static {
    // Freeze the prototype to prevent runtime modifications
    Object.freeze(Spring.prototype)
  }

  constructor(initialValue: SpringValue, config: SpringConfig = SPRING_PRESETS.INTERACTIVE) {
    this.#target = { ...initialValue }
    this.#current = { ...initialValue }
    this.#velocity = { x: 0, y: 0, o: 0 }
    this.#stiffness = config.stiffness ?? SPRING_PRESETS.INTERACTIVE.stiffness
    this.#damping = config.damping ?? SPRING_PRESETS.INTERACTIVE.damping
  }

  // ---------------------------------------------------------------------------
  // Public getters - readonly access to internal state
  // ---------------------------------------------------------------------------

  get target(): Readonly<SpringValue> {
    return this.#target
  }

  get current(): Readonly<SpringValue> {
    return this.#current
  }

  get velocity(): Readonly<SpringValue> {
    return this.#velocity
  }

  get stiffness(): number {
    return this.#stiffness
  }

  set stiffness(value: number) {
    this.#stiffness = value
  }

  get damping(): number {
    return this.#damping
  }

  set damping(value: number) {
    this.#damping = value
  }

  // ---------------------------------------------------------------------------
  // Animation control methods
  // ---------------------------------------------------------------------------

  /**
   * Set new target value
   * @param target - New target position
   * @param options.hard - If true, snap immediately without animation
   */
  set(target: SpringValue, options?: { soft?: boolean; hard?: boolean }): void {
    this.#target = { ...target }
    if (options?.hard) {
      this.#current = { ...target }
      this.#velocity = { x: 0, y: 0, o: 0 }
    }
  }

  /**
   * Apply spring physics to move current toward target
   * Call this in requestAnimationFrame loop
   */
  update(): SpringValue {
    const keys = ['x', 'y', 'o'] as const

    for (const key of keys) {
      const targetVal = this.#target[key]
      const currentVal = this.#current[key]

      if (targetVal !== undefined && currentVal !== undefined) {
        const delta = targetVal - currentVal
        const newVelocity =
          ((this.#velocity[key] ?? 0) + delta * this.#stiffness) * (1 - this.#damping)
        this.#velocity[key] = newVelocity
        ;(this.#current as Record<string, number>)[key] = currentVal + newVelocity
      }
    }

    return this.#current
  }

  /**
   * Check if spring has settled (reached equilibrium)
   * @param threshold - Movement threshold below which spring is considered settled
   */
  isSettled(threshold = 0.01): boolean {
    const dx = Math.abs(this.#target.x - this.#current.x)
    const dy = Math.abs(this.#target.y - this.#current.y)
    const vx = Math.abs(this.#velocity.x)
    const vy = Math.abs(this.#velocity.y)

    return dx < threshold && dy < threshold && vx < threshold && vy < threshold
  }

  /**
   * Reset spring to initial state with new config
   */
  reset(value: SpringValue, config?: SpringConfig): void {
    this.#target = { ...value }
    this.#current = { ...value }
    this.#velocity = { x: 0, y: 0, o: 0 }
    if (config) {
      this.#stiffness = config.stiffness ?? this.#stiffness
      this.#damping = config.damping ?? this.#damping
    }
  }
}

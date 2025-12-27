import { type AnimationFrameId, asAnimationFrameId, asTimeoutId, type TimeoutId } from '../types'

type CleanupFn = () => void

// =============================================================================
// CleanupController - RAII-style resource management for the browser
// =============================================================================

export interface CleanupController {
  /** AbortSignal for cancellation - use with fetch, addEventListener, etc. */
  readonly signal: AbortSignal
  /** Trigger cleanup of all managed resources */
  cleanup: CleanupFn
  /** Register a cleanup function to run on cleanup() */
  onCleanup: (fn: CleanupFn) => void
  /** Add event listener with automatic cleanup via AbortSignal */
  addEventListener: <T extends EventTarget>(
    target: T,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => void
  /** setTimeout with automatic cleanup - returns branded TimeoutId */
  setTimeout: (fn: () => void, delay: number) => TimeoutId
  /** Clear a managed timeout */
  clearTimeout: (id: TimeoutId) => void
  /** setInterval with automatic cleanup - returns branded TimeoutId */
  setInterval: (fn: () => void, delay: number) => TimeoutId
  /** Clear a managed interval */
  clearInterval: (id: TimeoutId) => void
  /** requestAnimationFrame with automatic cleanup - returns branded AnimationFrameId */
  requestAnimationFrame: (cb: FrameRequestCallback) => AnimationFrameId
  /** Cancel a managed animation frame */
  cancelAnimationFrame: (id: AnimationFrameId) => void
  /** Register an observer for automatic disconnect on cleanup */
  addObserver: (observer: IntersectionObserver | MutationObserver | ResizeObserver) => void
  /**
   * ES2024: Create a timeout that auto-aborts via AbortSignal.any()
   * Combines controller signal with timeout signal for automatic cancellation
   */
  withTimeout: <T>(promise: Promise<T>, ms: number) => Promise<T>
}

export function createCleanupController(): CleanupController {
  const controller = new AbortController()

  // ES2024+ Set methods available on these collections
  const timeoutIds = new Set<TimeoutId>()
  const intervalIds = new Set<TimeoutId>()
  const animationFrameIds = new Set<AnimationFrameId>()
  const observers = new Set<IntersectionObserver | MutationObserver | ResizeObserver>()
  const cleanupFns: CleanupFn[] = []
  const listenerCleanups: CleanupFn[] = []

  const cleanup: CleanupFn = () => {
    controller.abort()

    // Clear all timeouts
    for (const id of timeoutIds) {
      globalThis.clearTimeout(id as unknown as number)
    }
    timeoutIds.clear()

    // Clear all intervals
    for (const id of intervalIds) {
      globalThis.clearInterval(id as unknown as number)
    }
    intervalIds.clear()

    // Cancel all animation frames
    for (const id of animationFrameIds) {
      globalThis.cancelAnimationFrame(id as unknown as number)
    }
    animationFrameIds.clear()

    // Disconnect all observers
    for (const observer of observers) {
      observer.disconnect()
    }
    observers.clear()

    // Run listener cleanups
    for (const fn of listenerCleanups) {
      try {
        fn()
      } catch (e) {
        console.error('Listener cleanup error:', e)
      }
    }
    listenerCleanups.length = 0

    // Run registered cleanup functions
    for (const fn of cleanupFns) {
      try {
        fn()
      } catch (e) {
        console.error('Cleanup error:', e)
      }
    }
    cleanupFns.length = 0
  }

  return {
    signal: controller.signal,
    cleanup,

    onCleanup: (fn: CleanupFn) => {
      cleanupFns.push(fn)
    },

    addEventListener: <T extends EventTarget>(
      target: T,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void => {
      if (controller.signal.aborted) return

      // Merge user options with our abort signal
      const listenerOptions: AddEventListenerOptions =
        options === undefined
          ? { signal: controller.signal }
          : typeof options === 'boolean'
            ? { capture: options, signal: controller.signal }
            : { ...options, signal: controller.signal }

      target.addEventListener(type, handler, listenerOptions)

      // Backup cleanup in case signal doesn't work (older browsers)
      listenerCleanups.push(() => {
        target.removeEventListener(type, handler, listenerOptions)
      })
    },

    setTimeout: (fn: () => void, delay: number): TimeoutId => {
      const id = asTimeoutId(
        globalThis.setTimeout(() => {
          timeoutIds.delete(id)
          if (!controller.signal.aborted) {
            fn()
          }
        }, delay),
      )
      timeoutIds.add(id)
      return id
    },

    clearTimeout: (id: TimeoutId) => {
      timeoutIds.delete(id)
      globalThis.clearTimeout(id as unknown as number)
    },

    setInterval: (fn: () => void, delay: number): TimeoutId => {
      const id = asTimeoutId(
        globalThis.setInterval(() => {
          if (!controller.signal.aborted) {
            fn()
          }
        }, delay),
      )
      intervalIds.add(id)
      return id
    },

    clearInterval: (id: TimeoutId) => {
      intervalIds.delete(id)
      globalThis.clearInterval(id as unknown as number)
    },

    requestAnimationFrame: (cb: FrameRequestCallback): AnimationFrameId => {
      const id = asAnimationFrameId(
        globalThis.requestAnimationFrame((time) => {
          animationFrameIds.delete(id)
          if (!controller.signal.aborted) {
            cb(time)
          }
        }),
      )
      animationFrameIds.add(id)
      return id
    },

    cancelAnimationFrame: (id: AnimationFrameId) => {
      animationFrameIds.delete(id)
      globalThis.cancelAnimationFrame(id as unknown as number)
    },

    addObserver: (observer: IntersectionObserver | MutationObserver | ResizeObserver) => {
      observers.add(observer)
    },

    /**
     * ES2024: AbortSignal.any() - Combines multiple abort signals
     * Race between controller abort, timeout, and promise completion
     */
    withTimeout: async <T>(promise: Promise<T>, ms: number): Promise<T> => {
      // ES2024: AbortSignal.any() combines multiple signals
      const timeoutSignal = AbortSignal.timeout(ms)
      const combinedSignal = AbortSignal.any([controller.signal, timeoutSignal])

      return new Promise<T>((resolve, reject) => {
        // Abort if either signal fires
        combinedSignal.addEventListener(
          'abort',
          () => reject(new DOMException('Operation aborted', 'AbortError')),
          { once: true },
        )

        promise.then(resolve).catch(reject)
      })
    },
  }
}

// =============================================================================
// Global Controller - App-wide resource management
// =============================================================================

let globalController: CleanupController | null = null

export function getGlobalController(): CleanupController {
  globalController ??= createCleanupController()
  return globalController
}

export function resetGlobalController(): void {
  globalController?.cleanup()
  globalController = null
}

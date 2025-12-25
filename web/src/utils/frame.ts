import type { CleanupController } from './lifecycle'

export interface FrameScheduler {
  schedule: (fn: () => void) => void
  clear: () => void
}

function createScheduler(
  requestFrame: (cb: FrameRequestCallback) => number,
  cancelFrame: (id: number) => void,
): FrameScheduler {
  let rafId: number | null = null
  const queue = new Set<() => void>()

  const flush = (): void => {
    rafId = null
    const tasks = Array.from(queue)
    queue.clear()

    for (const task of tasks) {
      task()
    }

    if (queue.size > 0) {
      rafId = requestFrame(() => flush())
    }
  }

  return {
    schedule: (fn: () => void) => {
      queue.add(fn)
      if (rafId === null) {
        rafId = requestFrame(() => flush())
      }
    },
    clear: () => {
      if (rafId !== null) {
        cancelFrame(rafId)
        rafId = null
      }
      queue.clear()
    },
  }
}

const schedulerByController = new WeakMap<CleanupController, FrameScheduler>()
let globalScheduler: FrameScheduler | null = null

export function getFrameScheduler(controller?: CleanupController): FrameScheduler {
  if (controller) {
    const cached = schedulerByController.get(controller)
    if (cached) return cached

    const scheduler = createScheduler(
      controller.requestAnimationFrame,
      controller.cancelAnimationFrame,
    )
    schedulerByController.set(controller, scheduler)
    controller.onCleanup(() => {
      scheduler.clear()
    })
    return scheduler
  }

  if (!globalScheduler) {
    globalScheduler = createScheduler(requestAnimationFrame, cancelAnimationFrame)
  }
  return globalScheduler
}

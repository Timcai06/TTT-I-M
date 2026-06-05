type IdleCallbackHandle = number

interface IdleDeadlineLike {
  didTimeout: boolean
  timeRemaining: () => number
}

interface IdleCallbackWindow {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout?: number }) => IdleCallbackHandle
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void
}

const MIN_IDLE_BUDGET_MS = 6
const DEFAULT_IDLE_TIMEOUT_MS = 1800

const queue: Array<{
  image: HTMLImageElement
  reject: (error: unknown) => void
  resolve: () => void
}> = []

let scheduled = false

function schedule(callback: (deadline: IdleDeadlineLike) => void) {
  const idleWindow = window as IdleCallbackWindow
  if (typeof idleWindow.requestIdleCallback === 'function') {
    return idleWindow.requestIdleCallback(callback, { timeout: DEFAULT_IDLE_TIMEOUT_MS })
  }

  return window.setTimeout(() => callback({
    didTimeout: true,
    timeRemaining: () => MIN_IDLE_BUDGET_MS,
  }), 32)
}

function runQueue(deadline: IdleDeadlineLike) {
  scheduled = false

  const item = queue.shift()
  if (!item) return

  const decode = typeof item.image.decode === 'function'
    ? item.image.decode()
    : Promise.resolve()

  void decode.then(item.resolve, item.reject).finally(() => {
    if (queue.length === 0) return

    if (deadline.didTimeout || deadline.timeRemaining() >= MIN_IDLE_BUDGET_MS) {
      scheduled = true
      schedule(runQueue)
      return
    }

    scheduled = true
    window.requestAnimationFrame(() => schedule(runQueue))
  })
}

export function enqueueImageDecode(image: HTMLImageElement): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!image.complete || image.naturalWidth <= 0) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    queue.push({ image, reject, resolve })
    if (scheduled) return
    scheduled = true
    schedule(runQueue)
  })
}

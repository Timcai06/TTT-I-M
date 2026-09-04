type IdleCallbackHandle = number

interface IdleDeadlineLike {
  didTimeout: boolean
  timeRemaining: () => number
}

interface IdleCallbackWindow {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout?: number }) => IdleCallbackHandle
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void
}

interface DecodeItem {
  image: HTMLImageElement
  signal?: AbortSignal
  onAbort?: () => void
  reject: (error: unknown) => void
  resolve: () => void
  settled: boolean
}

const MIN_IDLE_BUDGET_MS = 6
const DEFAULT_IDLE_TIMEOUT_MS = 1800
const INTERACTION_QUIET_MS = 420

let lastInteractionAt = 0
let activityListenersAttached = false
let activeDecodes = 0
let cancelScheduled: (() => void) | null = null
const queue: DecodeItem[] = []

function signalError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason
  return new Error(signal.reason ? String(signal.reason) : 'Image decode aborted')
}

function markInteraction() {
  lastInteractionAt = performance.now()
}

function ensureActivityListeners() {
  if (activityListenersAttached || typeof window === 'undefined') return
  activityListenersAttached = true
  window.addEventListener('wheel', markInteraction, { passive: true })
  window.addEventListener('scroll', markInteraction, { passive: true })
  window.addEventListener('touchmove', markInteraction, { passive: true })
  window.addEventListener('pointerdown', markInteraction, { passive: true })
}

function detachActivityListeners() {
  if (!activityListenersAttached || typeof window === 'undefined') return
  activityListenersAttached = false
  window.removeEventListener('wheel', markInteraction)
  window.removeEventListener('scroll', markInteraction)
  window.removeEventListener('touchmove', markInteraction)
  window.removeEventListener('pointerdown', markInteraction)
}

function releaseQueueInfrastructure() {
  if (queue.length > 0 || activeDecodes > 0) return
  cancelScheduled?.()
  cancelScheduled = null
  detachActivityListeners()
}

function isInteractionWindowBusy() {
  return performance.now() - lastInteractionAt < INTERACTION_QUIET_MS
}

function schedule(callback: (deadline: IdleDeadlineLike) => void) {
  if (cancelScheduled) return
  const idleWindow = window as IdleCallbackWindow
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback((deadline) => {
      cancelScheduled = null
      callback(deadline)
    }, { timeout: DEFAULT_IDLE_TIMEOUT_MS })
    cancelScheduled = () => idleWindow.cancelIdleCallback?.(handle)
    return
  }

  const handle = window.setTimeout(() => {
    cancelScheduled = null
    callback({ didTimeout: true, timeRemaining: () => MIN_IDLE_BUDGET_MS })
  }, 32)
  cancelScheduled = () => window.clearTimeout(handle)
}

function scheduleAfterInteraction() {
  if (cancelScheduled) return
  const remainingQuietTime = Math.max(
    16,
    INTERACTION_QUIET_MS - (performance.now() - lastInteractionAt),
  )
  const timer = window.setTimeout(() => {
    cancelScheduled = null
    if (queue.length > 0) schedule(runQueue)
    else releaseQueueInfrastructure()
  }, remainingQuietTime)
  cancelScheduled = () => window.clearTimeout(timer)
}

function settleItem(item: DecodeItem, error?: unknown) {
  if (item.settled) return
  item.settled = true
  if (item.signal && item.onAbort) item.signal.removeEventListener('abort', item.onAbort)
  if (error === undefined) item.resolve()
  else item.reject(error)
}

function scheduleNext(deadline: IdleDeadlineLike) {
  if (queue.length === 0) {
    releaseQueueInfrastructure()
    return
  }
  if (!isInteractionWindowBusy() && (deadline.didTimeout || deadline.timeRemaining() >= MIN_IDLE_BUDGET_MS)) {
    schedule(runQueue)
  } else {
    scheduleAfterInteraction()
  }
}

/** Decode at most one image per idle turn to avoid a burst of main-thread work. */
function runQueue(deadline: IdleDeadlineLike) {
  if (deadline.didTimeout && isInteractionWindowBusy()) {
    scheduleAfterInteraction()
    return
  }

  const item = queue.shift()
  if (!item) {
    releaseQueueInfrastructure()
    return
  }
  if (item.signal?.aborted) {
    settleItem(item, signalError(item.signal))
    scheduleNext(deadline)
    return
  }

  activeDecodes += 1
  const decode = typeof item.image.decode === 'function'
    ? item.image.decode()
    : Promise.resolve()

  void decode.then(
    () => settleItem(item),
    (error: unknown) => settleItem(item, error),
  ).finally(() => {
    activeDecodes -= 1
    scheduleNext(deadline)
  })
}

/**
 * Queue an already-loaded image for idle decode. Aborting removes queued work
 * immediately (or rejects an in-flight decode), and global activity listeners
 * exist only while the queue has pending or active work.
 */
export function enqueueImageDecode(image: HTMLImageElement, signal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!image.complete || image.naturalWidth <= 0) return Promise.resolve()
  if (signal?.aborted) return Promise.reject(signalError(signal))
  ensureActivityListeners()

  return new Promise<void>((resolve, reject) => {
    const item: DecodeItem = { image, reject, resolve, settled: false, signal }
    if (signal) {
      item.onAbort = () => {
        const index = queue.indexOf(item)
        if (index >= 0) queue.splice(index, 1)
        settleItem(item, signalError(signal))
        releaseQueueInfrastructure()
      }
      signal.addEventListener('abort', item.onAbort, { once: true })
    }
    queue.push(item)
    schedule(runQueue)
  })
}

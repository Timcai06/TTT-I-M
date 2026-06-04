interface IdleScheduler {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (id: number) => void
}

export function scheduleIdle(callback: () => void, timeout = 1200, fallbackDelay = 320) {
  let cancelled = false
  const idleWindow = window as unknown as IdleScheduler
  const run = () => {
    if (!cancelled) callback()
  }

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(run, { timeout })
    return () => {
      cancelled = true
      idleWindow.cancelIdleCallback?.(id)
    }
  }

  const id = globalThis.setTimeout(run, fallbackDelay)
  return () => {
    cancelled = true
    globalThis.clearTimeout(id)
  }
}

export class ResourceTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`timed out after ${timeoutMs}ms`)
    this.name = 'ResourceTimeoutError'
  }
}

function abortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason
  return new Error(signal.reason ? String(signal.reason) : 'Resource task aborted')
}

/**
 * Runs one resource task under a child AbortSignal. Both the deadline and the
 * parent lifecycle abort the underlying loader before this wrapper settles.
 */
export function runTaskWithDeadline(
  load: (signal: AbortSignal) => Promise<void>,
  timeoutMs: number,
  parentSignal: AbortSignal,
): Promise<void> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Promise.reject(new RangeError('Resource task timeout must be a positive finite number.'))
  }
  if (parentSignal.aborted) return Promise.reject(abortReason(parentSignal))

  const controller = new AbortController()
  const forwardParentAbort = () => controller.abort(abortReason(parentSignal))
  parentSignal.addEventListener('abort', forwardParentAbort, { once: true })

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      parentSignal.removeEventListener('abort', forwardParentAbort)
      controller.signal.removeEventListener('abort', onAbort)
      callback()
    }
    const onAbort = () => finish(() => reject(abortReason(controller.signal)))
    const timer = setTimeout(() => {
      controller.abort(new ResourceTimeoutError(timeoutMs))
    }, timeoutMs)

    controller.signal.addEventListener('abort', onAbort, { once: true })
    if (controller.signal.aborted) {
      onAbort()
      return
    }
    let task: Promise<void>
    try {
      task = load(controller.signal)
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))))
      return
    }
    void task.then(
      () => finish(resolve),
      (error: unknown) => finish(() => reject(error instanceof Error ? error : new Error(String(error)))),
    )
  })
}

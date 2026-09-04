interface ActiveRequest<T> {
  controller: AbortController
  consumers: number
  promise: Promise<T>
  settled: boolean
}

export interface SharedResource<T> {
  clear(reason?: Error): void
  load(signal?: AbortSignal): Promise<T>
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error('Shared resource request aborted')
}

function requestError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Deduplicates an immutable resource while preserving real cancellation.
 * One consumer aborting only rejects that consumer; the underlying request is
 * aborted once every active consumer has left. Failed loads are never cached.
 */
export function createSharedResource<T>(loader: (signal: AbortSignal) => Promise<T>): SharedResource<T> {
  let cached: { value: T } | null = null
  let active: ActiveRequest<T> | null = null

  const createRequest = (): ActiveRequest<T> => {
    const controller = new AbortController()
    const state: ActiveRequest<T> = {
      controller,
      consumers: 0,
      promise: Promise.resolve(undefined as T),
      settled: false,
    }
    state.promise = Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Shared resource request aborted before it started')
        }
        return loader(controller.signal)
      })
      .then((value) => {
        if (controller.signal.aborted) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Shared resource request completed after cancellation')
        }
        cached = { value }
        return value
      })
      .finally(() => {
        state.settled = true
        if (active === state) active = null
      })
    return state
  }

  const subscribe = (state: ActiveRequest<T>, signal?: AbortSignal): Promise<T> => {
    state.consumers += 1

    return new Promise((resolve, reject) => {
      let finished = false

      const release = () => {
        if (finished) return
        finished = true
        signal?.removeEventListener('abort', onAbort)
        state.consumers = Math.max(0, state.consumers - 1)
        if (state.consumers === 0 && !state.settled) {
          state.controller.abort(new Error('Shared resource request has no active consumers'))
        }
      }
      const onAbort = () => {
        const reason = signal ? abortReason(signal) : new Error('Shared resource request aborted')
        release()
        reject(reason)
      }

      signal?.addEventListener('abort', onAbort, { once: true })
      state.promise.then(
        (value) => {
          if (finished) return
          release()
          resolve(value)
        },
        (error: unknown) => {
          if (finished) return
          release()
          reject(requestError(error))
        },
      )
    })
  }

  return {
    clear(reason = new Error('Shared resource cache cleared')) {
      cached = null
      if (active && !active.settled) active.controller.abort(reason)
    },
    load(signal) {
      if (signal?.aborted) return Promise.reject(abortReason(signal))
      if (cached) return Promise.resolve(cached.value)
      if (!active || active.controller.signal.aborted) active = createRequest()
      return subscribe(active, signal)
    },
  }
}

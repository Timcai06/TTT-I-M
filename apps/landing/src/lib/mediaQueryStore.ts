type MediaQueryListener = () => void

export interface MediaQueryStore {
  getServerSnapshot: () => boolean
  getSnapshot: () => boolean
  subscribe: (listener: MediaQueryListener) => () => void
}

/**
 * One native MediaQueryList listener fans out to every React consumer. This
 * keeps motion/device capability changes atomic across the page and avoids one
 * browser listener plus one state effect per visual component.
 */
export function createMediaQueryStore(query: string): MediaQueryStore {
  const listeners = new Set<MediaQueryListener>()
  let mediaQuery: MediaQueryList | null = null
  let listening = false

  const readMediaQuery = (): MediaQueryList | null => {
    if (mediaQuery) return mediaQuery
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
    mediaQuery = window.matchMedia(query)
    return mediaQuery
  }
  const emit = () => listeners.forEach((listener) => listener())
  const start = () => {
    const current = readMediaQuery()
    if (!current || listening) return
    listening = true
    current.addEventListener('change', emit)
  }
  const stop = () => {
    if (!mediaQuery || !listening) return
    listening = false
    mediaQuery.removeEventListener('change', emit)
  }

  return {
    getServerSnapshot: () => false,
    getSnapshot: () => readMediaQuery()?.matches ?? false,
    subscribe: (listener) => {
      listeners.add(listener)
      start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stop()
      }
    },
  }
}

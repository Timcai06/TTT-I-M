import { useSyncExternalStore } from 'react'
import { createMediaQueryStore } from './mediaQueryStore.ts'

const QUERY = '(prefers-reduced-motion: reduce)'
const reducedMotionStore = createMediaQueryStore(QUERY)

/** Synchronous read — safe in event handlers / module scope (SSR-guarded). */
export function prefersReducedMotion(): boolean {
  return reducedMotionStore.getSnapshot()
}

/** Reactive hook — re-renders if the user toggles the OS setting at runtime. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    reducedMotionStore.subscribe,
    reducedMotionStore.getSnapshot,
    reducedMotionStore.getServerSnapshot,
  )
}

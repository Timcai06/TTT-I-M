import { useSyncExternalStore } from 'react'

/**
 * Runtime lifecycle SSOT.
 *
 * Composition has a single source of truth (`src/chapters/registry.ts`); this
 * is the matching SSOT for *runtime phase*. It replaces the previously scattered
 * ad-hoc flags (`introExited`, `introExitedOnce`, ChapterTransition's `busyRef`)
 * and the loose `INTRO_EXIT_EVENT` window event with one observable machine:
 *
 *   booting ──(loader title landed)──▶ intro
 *   intro ──(loader hands off / 2.2s fallback)──▶ live
 *   live ──(chapter jump request)──▶ transitioning
 *   transitioning ──(transition timeline ends)──▶ live
 *
 * Anything that used to ask "has the intro finished?" or "are we mid-transition?"
 * now reads from here, and heavy WebGL surfaces subscribe so they can self-pause
 * during a transition (the GPU-heaviest moment).
 */
export type Stage = 'booting' | 'intro' | 'live' | 'transitioning'

let current: Stage = 'booting'
const listeners = new Set<(stage: Stage) => void>()

export function getStage(): Stage {
  return current
}

/** True once the intro has handed off — i.e. we're live or transitioning. */
export function isLive(): boolean {
  return current === 'live' || current === 'transitioning'
}

export function setStage(next: Stage): void {
  if (current === next) return
  current = next
  listeners.forEach((listener) => listener(current))
}

export function subscribeStage(listener: (stage: Stage) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React binding (purity-safe: no window/random read during render). */
export function useStage(): Stage {
  return useSyncExternalStore(subscribeStage, getStage, getStage)
}

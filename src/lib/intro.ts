import { isLive, setStage, subscribeStage } from './stage'

// The intro lifecycle is now backed by the runtime stage machine (lib/stage.ts).
// This module keeps the small, ergonomic surface its callers already use
// (Loader hands off, Hero/ParticlePortrait react to the hand-off), but the
// truth lives in `stage` — no more separate `introExited` flag or window event.

const INTRO_FALLBACK_MS = 2200

/** True once the intro has handed off to the live page. */
export function hasIntroExited() {
  return isLive()
}

/** Loader calls this when its exit timeline reaches the hand-off beat. */
export function dispatchIntroExit() {
  setStage('live')
}

/**
 * Fire `callback` once the intro has exited (immediately if it already has).
 * Includes a safety fallback so a missed hand-off can't strand a subscriber —
 * the fallback also forces the stage to `live` so the global truth stays honest.
 */
export function onIntroExit(callback: () => void) {
  if (isLive()) {
    callback()
    return () => {}
  }

  let fired = false
  let unsub = () => {}
  let timer = 0

  const cleanup = () => {
    unsub()
    window.clearTimeout(timer)
  }

  const runOnce = () => {
    if (fired) return
    fired = true
    cleanup()
    setStage('live')
    callback()
  }

  unsub = subscribeStage((stage) => {
    if (stage === 'live' || stage === 'transitioning') runOnce()
  })
  timer = window.setTimeout(runOnce, INTRO_FALLBACK_MS)

  return cleanup
}

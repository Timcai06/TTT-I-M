export const INTRO_EXIT_EVENT = 'loader:exit'
export const INTRO_FALLBACK_MS = 2200

export function dispatchIntroExit() {
  window.dispatchEvent(new CustomEvent(INTRO_EXIT_EVENT))
}

export function onIntroExit(callback: () => void) {
  let fired = false
  const runOnce = () => {
    if (fired) return
    fired = true
    callback()
  }

  window.addEventListener(INTRO_EXIT_EVENT, runOnce, { once: true })
  const timer = window.setTimeout(runOnce, INTRO_FALLBACK_MS)

  return () => {
    window.removeEventListener(INTRO_EXIT_EVENT, runOnce)
    window.clearTimeout(timer)
  }
}

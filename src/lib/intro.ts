export const INTRO_EXIT_EVENT = 'loader:exit'
export const INTRO_FALLBACK_MS = 2200

let introExited = false

export function hasIntroExited() {
  return introExited
}

export function dispatchIntroExit() {
  introExited = true
  window.dispatchEvent(new CustomEvent(INTRO_EXIT_EVENT))
}

export function onIntroExit(callback: () => void) {
  if (introExited) {
    callback()
    return () => {}
  }

  let fired = false
  const runOnce = () => {
    if (fired) return
    fired = true
    introExited = true
    callback()
  }

  window.addEventListener(INTRO_EXIT_EVENT, runOnce, { once: true })
  const timer = window.setTimeout(runOnce, INTRO_FALLBACK_MS)

  return () => {
    window.removeEventListener(INTRO_EXIT_EVENT, runOnce)
    window.clearTimeout(timer)
  }
}

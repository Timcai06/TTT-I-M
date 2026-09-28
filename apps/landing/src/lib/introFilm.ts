import { dispatchIntroExit } from './intro'
import { getStage } from './stage'

/**
 * The hand-off between the loader and the intro film.
 *
 * The film lives in its own lazy chunk (components/film) and registers a player
 * here only once everything it needs is prepared. The loader asks at its exit
 * beat; with no ready player it hands off to the page exactly as it always has,
 * so a film that failed to load, or is not wanted, costs the visitor nothing.
 *
 * This module is deliberately tiny and dependency-free apart from the stage
 * machine: the loader imports it eagerly.
 */

/**
 * The loader's dot at the moment of hand-off (red by then). A player can measure
 * it synchronously inside `start` to open the film from the same spot, so the
 * hand-off reads as one continuous mark rather than a cut.
 */
export interface FilmOrigin {
  glyph: HTMLElement
}

export interface FilmPlayer {
  /** Start the film from the loader's dot. False declines, and the loader carries on. */
  start: (origin: FilmOrigin) => boolean
  /** Abandon the film immediately (watchdog). Must leave the page usable. */
  abort: () => void
}

/**
 * The film runs 12-15 s. Anything past this is a stuck film, not a slow one: go
 * live regardless. Time spent in a hidden tab does not count — the film pauses there.
 */
const WATCHDOG_MS = 26_000

let player: FilmPlayer | null = null
let disarm: (() => void) | null = null

export function registerFilmPlayer(next: FilmPlayer) {
  player = next
  return () => {
    if (player === next) player = null
  }
}

export function hasFilmPlayer() {
  return player !== null
}

/**
 * Called by the loader at its exit beat. True means the film has taken the
 * viewport and will move the stage to `live` itself.
 */
export function requestIntroFilm(origin: FilmOrigin): boolean {
  const current = player
  if (!current) return false
  let accepted: boolean
  try {
    accepted = current.start(origin)
  } catch {
    accepted = false
  }
  if (!accepted) return false
  armWatchdog(current)
  return true
}

/**
 * The film calls this once its overlay is gone. Until then the watchdog runs —
 * past the switch to `live`, because an overlay that never tears down would hold
 * the page just as surely as a stage that never advances.
 */
export function finishIntroFilm() {
  disarm?.()
}

function armWatchdog(current: FilmPlayer) {
  disarm?.()
  let visibleMs = 0
  let last = performance.now()
  let interval = 0
  const stop = () => {
    window.clearInterval(interval)
    if (disarm === stop) disarm = null
  }
  disarm = stop
  interval = window.setInterval(() => {
    const now = performance.now()
    if (!document.hidden) visibleMs += now - last
    last = now
    if (visibleMs < WATCHDOG_MS) return
    stop()
    try {
      current.abort()
    } finally {
      if (getStage() === 'film') dispatchIntroExit()
    }
  }, 500)
}

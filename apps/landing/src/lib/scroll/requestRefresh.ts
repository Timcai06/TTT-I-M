import { ScrollTrigger } from '../gsap'

/**
 * Single coordinator for `ScrollTrigger.refresh()`.
 *
 * refresh() is a global O(n) layout-reading pass over every trigger. It used to
 * be fired uncoordinated from App, lenis and ChapterTransition,
 * so an intro hand-off or a chapter jump could trigger a burst of redundant
 * refreshes in the same tick → layout thrash. This coalesces same-frame bursts
 * into one refresh, while keeping an `immediate` bypass for the few moments that
 * must refresh synchronously (intro→live hand-off, font-ready relayout, the
 * mid-transition re-measure where order matters).
 */
let frame = 0

function flush() {
  frame = 0
  ScrollTrigger.refresh()
}

export function requestScrollRefresh(immediate = false): void {
  if (immediate) {
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
    ScrollTrigger.refresh()
    return
  }
  if (frame) return
  frame = requestAnimationFrame(flush)
}

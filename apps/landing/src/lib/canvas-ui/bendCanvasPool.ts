import { acquireOptionalContextWhenAvailable, type ContextLease } from '../webgl/contextRegistry'
import { disposeHorizontalBendCanvas } from './horizontalBend'

interface Slot { canvas: HTMLCanvasElement; lease: ContextLease }
// Keep one reusable shader/context while Frame is nearby. The second ordinary
// context slot remains available to title particles and other chapter effects.
let idle: Slot | null = null
let observer: IntersectionObserver | null = null
let nearby = false
const waiting = new Set<(slot: Slot) => void>()

function dispose(slot: Slot) {
  slot.canvas.remove()
  disposeHorizontalBendCanvas(slot.canvas)
  slot.lease.release()
}

function observeFrame() {
  if (observer) return
  const frame = document.getElementById('frame')
  if (!frame || typeof IntersectionObserver === 'undefined') return
  nearby = true
  observer = new IntersectionObserver(([entry]) => {
    nearby = entry?.isIntersecting ?? false
    if (!nearby && idle) {
      const slot = idle; idle = null; dispose(slot)
    }
    if (!nearby) { observer?.disconnect(); observer = null }
  }, { rootMargin: '100% 0px' })
  observer.observe(frame)
}

export function acquireBendCanvas(onReady: (canvas: HTMLCanvasElement, release: (discard?: boolean) => void) => void): () => void {
  observeFrame()
  let cancelled = false
  let delivered = false
  let stopWaiting = () => {}
  const accept = (slot: Slot) => {
    if (cancelled || delivered) { dispose(slot); return }
    delivered = true
    waiting.delete(accept)
    stopWaiting()
    let released = false
    const release = (discard = false) => {
      if (released) return
      released = true
      slot.canvas.remove()
      if (discard) { dispose(slot); return }
      const next = waiting.values().next().value
      if (next) { next(slot); return }
      if (nearby && !idle) idle = slot
      else dispose(slot)
    }
    try { onReady(slot.canvas, release) } catch (error) { release(true); throw error }
  }
  if (idle) {
    const slot = idle; idle = null; accept(slot)
  } else {
    waiting.add(accept)
    stopWaiting = acquireOptionalContextWhenAvailable('horizontal-bend', lease => {
      accept({ canvas: document.createElement('canvas'), lease })
    })
  }
  return () => { cancelled = true; waiting.delete(accept); stopWaiting() }
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  observer?.disconnect(); observer = null; nearby = false
  if (idle) { const slot = idle; idle = null; dispose(slot) }
})

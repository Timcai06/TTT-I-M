import { getPreparedArchiveRuntime } from '../components/personal-archive/archiveRuntime'

/**
 * Click-to-enlarge for the Index living on the room's monitor.
 *
 * The room camera deliberately does not move for this: `solveArchiveCamera`'s
 * index branch says so in as many words, because a second camera owner would
 * fight the story clock. The zoom is entirely a projection change — the Index
 * page is already projected onto the StackReading quad, and projectArchiveQuad
 * lerps that quad toward the full viewport as `targetExpand` rises. At expand 1
 * the homography degenerates to an axis-aligned rectangle, which is the only
 * state where a rounded frame can read as a frame rather than a warped smear.
 *
 * `setIndexInspection` and the story's `user.indexInspection` already existed for
 * this and were never called by anything.
 */
const SETTLE = .16
let value = 0
let target = 0
let frame = 0

function publish() {
  const root = document.documentElement
  root.style.setProperty('--index-zoom', value.toFixed(4))
  if (value > .02) root.dataset.indexZoomed = 'true'
  else delete root.dataset.indexZoomed
  getPreparedArchiveRuntime()?.setIndexInspection(value)
}

function step() {
  frame = 0
  const delta = target - value
  value = Math.abs(delta) < .0015 ? target : value + delta * SETTLE
  publish()
  if (value !== target) frame = requestAnimationFrame(step)
}

export function setIndexZoom(next: number) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(next) ? next : 0))
  if (clamped === target) return
  target = clamped
  if (!frame) frame = requestAnimationFrame(step)
}

export function toggleIndexZoom() {
  setIndexZoom(target > .5 ? 0 : 1)
}

export function indexZoomed() {
  return target > .5
}

/** Leaving the Index must not strand an enlarged panel over the room. */
export function resetIndexZoom() {
  if (frame) { cancelAnimationFrame(frame); frame = 0 }
  target = 0
  value = 0
  publish()
}

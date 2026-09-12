/**
 * The signature rounded frame on the Index panel.
 *
 * The Index lives projected on the room's monitor, so a radius on it normally
 * cuts into the quad and shows the room through the corners. It is legal in
 * exactly one state: when the camera stands on the monitor's normal and the
 * homography degenerates to an axis-aligned rectangle. That state is the opening
 * shot — camera pullback 0 — so the frame retires as the pull-back opens the room.
 *
 * This was `indexZoom`, a click-driven rAF settle loop that owned its own
 * animation and pushed `indexInspection` into the story as a second camera owner.
 * The pull-back put that same movement on the scroll clock, so there is nothing
 * left to settle: the story hands over a number and this publishes it.
 */
const EPSILON = .002
let published = -1

export function publishIndexFrame(next: number) {
  const value = Math.max(0, Math.min(1, Number.isFinite(next) ? next : 0))
  if (value === published) return
  // Endpoints always land exactly, so the frame fully arrives and fully retires.
  if (published >= 0 && value !== 0 && value !== 1 && Math.abs(value - published) < EPSILON) return
  published = value
  document.documentElement.style.setProperty('--index-frame', value.toFixed(4))
}

/** Leaving the Index must not strand a framed panel over the room. */
export function resetIndexFrame() {
  published = -1
  publishIndexFrame(0)
}

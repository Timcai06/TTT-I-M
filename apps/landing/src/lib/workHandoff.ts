export const WORK_HANDOFF_EVENT = 'portfolio:work-enter'

export interface WorkHandoffDetail {
  source: 'work-transition-cta'
}

let pending = false

export function markWorkHandoffPending(): void {
  pending = true
}

export function consumePendingWorkHandoff(): boolean {
  if (!pending) return false
  pending = false
  return true
}

/**
 * Announces the deliberate Stack → Work handoff. The transition owns the
 * gate; Projects owns the short visual response. Keeping the event here avoids
 * coupling the two lazy chapters through React composition or global state.
 */
export function dispatchWorkHandoff(): void {
  markWorkHandoffPending()
  window.dispatchEvent(new CustomEvent<WorkHandoffDetail>(WORK_HANDOFF_EVENT, {
    detail: { source: 'work-transition-cta' },
  }))
}

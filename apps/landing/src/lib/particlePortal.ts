export type ParticlePortalMode =
  | 'frame-building'
  | 'frame-cuisine'
  | 'frame-scenery'
  | 'case-expand'
  | 'case-collapse'

export interface ParticlePortalRequest {
  /** The live image whose pixels become the portal material. */
  source: HTMLImageElement
  /** Optional larger visual wrapper used for the selected/transitioning state. */
  sourceContainer?: HTMLElement | null
  /** Resolved after commit because chapter jumps and dialogs change layout. */
  resolveTarget: () => HTMLImageElement | null
  /** The atomic state change hidden beneath the densest part of the cloud. */
  commit: () => void | Promise<void>
  mode: ParticlePortalMode
  label: string
  onComplete?: () => void
}

type ParticlePortalListener = (request: ParticlePortalRequest) => void

let listener: ParticlePortalListener | null = null

/**
 * Requests the one app-level particle portal. Returning false means the portal
 * has not mounted yet, so callers must immediately execute their semantic
 * fallback (chapter jump or dialog open) instead of swallowing the action.
 */
export function requestParticlePortal(request: ParticlePortalRequest): boolean {
  if (!listener) return false
  listener(request)
  return true
}

/** The app root owns exactly one listener and releases it on unmount/HMR. */
export function onParticlePortalRequest(next: ParticlePortalListener): () => void {
  listener = next
  return () => {
    if (listener === next) listener = null
  }
}


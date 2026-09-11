export type LocalEffectOwner = 'frame' | 'projects' | 'contact'

const EXCLUDED_SURFACE = '[data-archive-clone], [data-canvas-ui-capture], .archive-bridge__page'

/**
 * Everything except whether the chapter has been revealed yet.
 *
 * A chapter waiting behind the archive's projection is held at opacity 0 with its
 * layout fully resolved. It can be measured and painted into a canvas there; what
 * it cannot do is be seen. Separating that from the rest of the gate is what lets
 * an effect be *built* early and only *shown* late.
 *
 * The refusals kept here are the ones that would make initialisation wrong rather
 * than merely invisible: a background tab (real power waste), a live archive route
 * (the chapter is mid-flight and its geometry is not settled), a clone or bridge
 * surface (not the real chapter), `display: none` (no layout to measure at all),
 * and inert / aria-hidden (content deliberately taken out of the experience).
 */
function passesStructuralGate(host: HTMLElement | null, ownerId: LocalEffectOwner) {
  if (!host?.isConnected) return null
  const document = host.ownerDocument
  if (document.hidden || document.documentElement.hasAttribute('data-archive-routing')) return null
  const owner = host.closest(`#${ownerId}`)
  if (!owner || document.getElementById(ownerId) !== owner) return null
  if (host.closest(EXCLUDED_SURFACE)) return null
  const view = document.defaultView
  if (!view) return null
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    if (node.inert || node.hidden || node.getAttribute('aria-hidden') === 'true') return null
    if (view.getComputedStyle(node).display === 'none') return null
  }
  return view
}

/**
 * May this effect allocate its GPU context and compile its shaders yet?
 *
 * Measured: building a chapter-local WebGL effect on the frame its chapter first
 * becomes visible costs one 33-52ms frame against an 8.3ms median, and that frame
 * is exactly the 3D->2D handoff -- the moment the projected page finishes
 * expanding to full height and the reader is watching it. The spike reproduced on
 * every pass through Work and disappeared entirely when local effects were
 * refused, which is what identified it.
 *
 * Preparation is therefore allowed while the chapter is still held invisible
 * behind the projection. The effect renders into a surface nobody can see for the
 * last stretch of the bridge, and the handoff frame only has to reveal something
 * that already exists.
 */
export function canPrepareLocalEffect(host: HTMLElement | null, ownerId: LocalEffectOwner): boolean {
  return passesStructuralGate(host, ownerId) !== null
}

/** Read the real chapter surface only; local effects never write archive state. */
export function canRunLocalEffect(host: HTMLElement | null, ownerId: LocalEffectOwner): boolean {
  const view = passesStructuralGate(host, ownerId)
  if (!view) return false
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    const style = view.getComputedStyle(node)
    if (
      style.visibility === 'hidden'
      || style.visibility === 'collapse'
      || Number(style.opacity) === 0
    ) return false
  }
  return true
}

/** Observe the bounded ancestor chain and isolate a decoration consumer failure. */
export function observeLocalEffectEligibility(
  host: HTMLElement | null,
  ownerId: LocalEffectOwner,
  notify: (eligible: boolean) => void,
): () => void {
  if (!host) return () => {}
  const document = host.ownerDocument
  const Observer = document.defaultView?.MutationObserver
  if (!Observer) return () => {}
  // Both predicates, because they move independently: a chapter becomes
  // preparable while still held invisible behind the projection, and becomes
  // runnable one commit later when it is revealed. Watching only one of them
  // silently drops the other transition. Consumers still receive `canRun`.
  const key = () => `${canPrepareLocalEffect(host, ownerId)}|${canRunLocalEffect(host, ownerId)}`
  let previousKey = key()
  const refresh = () => {
    const nextKey = key()
    if (nextKey === previousKey) return
    previousKey = nextKey
    const current = canRunLocalEffect(host, ownerId)
    try {
      notify(current)
    } catch {
      // A decorative consumer cannot interrupt archive presentation commits.
    }
  }
  const observer = new Observer(refresh)
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    observer.observe(node, {
      attributes: true,
      attributeFilter: [
        'inert',
        'hidden',
        'aria-hidden',
        'style',
        'class',
        'data-archive-routing',
        'data-archive-live-target',
      ],
    })
  }
  document.addEventListener('visibilitychange', refresh)
  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', refresh)
  }
}

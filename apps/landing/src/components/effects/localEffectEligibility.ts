export type LocalEffectOwner = 'frame' | 'projects' | 'contact'

const EXCLUDED_SURFACE = '[data-archive-clone], [data-canvas-ui-capture], .archive-bridge__page'

/** Read the real chapter surface only; local effects never write archive state. */
export function canRunLocalEffect(host: HTMLElement | null, ownerId: LocalEffectOwner): boolean {
  if (!host?.isConnected) return false
  const document = host.ownerDocument
  if (document.hidden || document.documentElement.hasAttribute('data-archive-routing')) return false
  const owner = host.closest(`#${ownerId}`)
  if (!owner || document.getElementById(ownerId) !== owner) return false
  if (host.closest(EXCLUDED_SURFACE)) return false
  const view = document.defaultView
  if (!view) return false
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    if (node.inert || node.hidden || node.getAttribute('aria-hidden') === 'true') return false
    const style = view.getComputedStyle(node)
    if (
      style.display === 'none'
      || style.visibility === 'hidden'
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
  let previous = canRunLocalEffect(host, ownerId)
  const refresh = () => {
    const current = canRunLocalEffect(host, ownerId)
    if (current === previous) return
    previous = current
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

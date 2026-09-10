/** Read the semantic DOM owned by the archive; never write its reading state. */
export function canCaptureAbout(host: HTMLElement | null): boolean {
  if (!host?.isConnected) return false
  const document = host.ownerDocument
  if (document.hidden || document.documentElement.hasAttribute('data-archive-routing')) return false
  const about = host.closest('#about')
  if (!about || document.getElementById('about') !== about) return false
  if (host.closest('[data-archive-clone], [data-canvas-ui-capture], .archive-bridge__page, .about--archive-return')) return false
  const view = document.defaultView
  if (!view) return false
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    if (node.inert || node.hidden || node.getAttribute('aria-hidden') === 'true') return false
    const style = view.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false
  }
  return true
}

/** Ancestors only: no whole-document subtree observer or animation polling. */
export function observeAboutCapture(host: HTMLElement | null, notify: () => void): () => void {
  if (!host) return () => {}
  const document = host.ownerDocument
  const Observer = document.defaultView?.MutationObserver
  if (!Observer) return () => {}
  let previous = canCaptureAbout(host)
  const refresh = () => {
    const current = canCaptureAbout(host)
    if (current === previous) return
    previous = current
    notify()
  }
  const observer = new Observer(refresh)
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['inert', 'hidden', 'aria-hidden', 'style', 'class', 'data-archive-routing', 'data-archive-live-target'],
    })
  }
  document.addEventListener('visibilitychange', refresh)
  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', refresh)
  }
}

import { navChapters, progressChapters } from '../chapters/registry'

// The chrome (Nav, ScrollIndicator) binds observers/ScrollTriggers to section
// DOM ids. Those sections are lazy-loaded, so they may not exist yet when the
// eager chrome mounts. This resolves once every referenced section id is in
// the DOM — then the chrome can safely bind. Self-healing via MutationObserver,
// so it works regardless of loader/chunk timing.

const requiredIds = [
  ...new Set([...navChapters, ...progressChapters].map((c) => c.id)),
]

function allPresent(): boolean {
  return requiredIds.every((id) => document.getElementById(id))
}

/**
 * Invoke `cb` once all chapter sections are mounted (immediately if they
 * already are). Returns a disposer to cancel before it fires.
 */
export function onChaptersReady(cb: () => void): () => void {
  if (allPresent()) {
    cb()
    return () => {}
  }

  const observer = new MutationObserver(() => {
    if (allPresent()) {
      observer.disconnect()
      cb()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

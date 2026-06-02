import { getLenis } from './lenis'

export function scrollToChapter(id: string, options: { updateHash?: boolean } = {}) {
  const el = document.getElementById(id)
  if (!el) return

  if (options.updateHash) {
    window.history.replaceState(null, '', `#${id}`)
  }

  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(el, { offset: -40, duration: 1.4 })
  } else {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

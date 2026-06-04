import { getLenis } from './lenis'

interface ChapterScrollOptions {
  immediate?: boolean
  updateHash?: boolean
}

export function scrollToChapter(id: string, options: ChapterScrollOptions = {}) {
  const el = document.getElementById(id)
  if (!el) return

  if (options.updateHash) {
    window.history.replaceState(null, '', `#${id}`)
  }

  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(el, {
      offset: -40,
      duration: options.immediate ? 0 : 1.4,
      force: options.immediate,
      immediate: options.immediate,
    })
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - 40
    window.scrollTo({
      top,
      behavior: options.immediate ? 'auto' : 'smooth',
    })
  }
}

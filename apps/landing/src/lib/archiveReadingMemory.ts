const positions = new Map<string, number>()

function flowRoot(id: string): HTMLElement | null {
  const chapter = document.getElementById(id)
  if (!chapter) return null
  const parent = chapter.parentElement
  return parent?.classList.contains('pin-spacer') ? parent : chapter
}

export function rememberChapterPosition(id: string) {
  const chapter = flowRoot(id)
  if (!chapter) return
  const top = chapter.getBoundingClientRect().top + scrollY
  const range = Math.max(1, chapter.offsetHeight - innerHeight)
  positions.set(id, Math.max(0, Math.min(1, (scrollY - top) / range)))
}

export function restoredChapterTop(id: string) {
  const ratio = positions.get(id)
  const chapter = flowRoot(id)
  if (ratio === undefined || !chapter) return null
  const top = chapter.getBoundingClientRect().top + scrollY
  return Math.max(0, top + ratio * Math.max(1, chapter.offsetHeight - innerHeight))
}

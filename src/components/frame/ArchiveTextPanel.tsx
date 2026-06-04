import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { revealWordsOnce } from '../../lib/wordReveal'
import type { ArchiveTextPanel as ArchiveTextPanelData } from '../../data/frames'

export default function ArchiveTextPanel({
  panel,
  layout,
}: {
  panel: ArchiveTextPanelData
  layout: 'intro' | 'outro'
}) {
  const ref = useRef<HTMLElement>(null)

  // Vertical panels use a one-shot per-word reveal on enter.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealWordsOnce(el, '.archive-theme-marker__title', { start: 'top 82%' })
      revealWordsOnce(el, '.frame-panel__body', { start: 'top 78%' })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <article ref={ref} className={`archive-frame-text archive-frame-text--${layout}`}>
      <p className="frame-panel__eyebrow">{panel.eyebrow}</p>
      <h2 className="archive-theme-marker__title">{panel.title}</h2>
      <p className="frame-panel__body archive-theme-marker__body">{panel.body}</p>
    </article>
  )
}

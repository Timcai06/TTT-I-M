import { useEffect } from 'react'
import { useChapterState } from '../../lib/chapterState'
import { returnToArchiveObject } from '../../lib/archiveReturn'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'

export default function ArchiveReturnControl() {
  const { activeId } = useChapterState()
  const mobile = useMobileExperience()
  const reduced = useReducedMotion()
  const available = !mobile && !reduced && activeId !== 'hero'

  useEffect(() => {
    if (!available) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"], dialog[open]')) return
      returnToArchiveObject(activeId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeId, available])

  if (!available) return null
  return <button
    className="archive-return"
    type="button"
    aria-label="RETURN TO OBJECT ↖"
    aria-keyshortcuts="Escape"
    onClick={() => returnToArchiveObject(activeId)}
  >
    <svg className="archive-return__arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M 12 12 L 4 4 M 4 4 H 10 M 4 4 V 10" />
    </svg>
    <span className="archive-return__label">RETURN TO OBJECT</span>
    <span className="archive-return__hint" aria-hidden="true">ESC</span>
  </button>
}

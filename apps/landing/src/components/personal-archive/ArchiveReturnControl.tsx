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
  return <button className="archive-return" type="button" onClick={() => returnToArchiveObject(activeId)}>RETURN TO OBJECT ↖</button>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollTrigger } from './gsap'
import { onChaptersReady } from './chaptersReady'
import { pickActiveChapterId, type ChapterRectSnapshot } from './activeChapter'

interface ChapterLike {
  id: string
}

function readChapterRects(chapters: ChapterLike[]): ChapterRectSnapshot[] {
  return chapters.flatMap((chapter) => {
    const el = document.getElementById(chapter.id)
    if (!el) return []

    const rect = el.getBoundingClientRect()
    return [{ id: chapter.id, top: rect.top, bottom: rect.bottom }]
  })
}

export function useActiveChapter(chapters: ChapterLike[], fallbackId: string) {
  const chapterIds = useMemo(() => chapters.map((chapter) => chapter.id), [chapters])
  const [activeId, setActiveId] = useState(fallbackId)
  const frameRef = useRef(0)

  useEffect(() => {
    let disposeActiveTrigger = () => {}

    const update = () => {
      const nextActive = pickActiveChapterId(readChapterRects(chapters), window.innerHeight, fallbackId)
      setActiveId((current) => (current === nextActive ? current : nextActive))
    }

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = window.requestAnimationFrame(update)
    }

    const cancelReady = onChaptersReady(() => {
      update()

      const trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        invalidateOnRefresh: true,
        onUpdate: scheduleUpdate,
        onRefresh: scheduleUpdate,
      })

      window.addEventListener('resize', scheduleUpdate)

      disposeActiveTrigger = () => {
        trigger.kill()
        window.removeEventListener('resize', scheduleUpdate)
      }
    })

    return () => {
      cancelReady()
      disposeActiveTrigger()
      window.cancelAnimationFrame(frameRef.current)
    }
  }, [chapterIds, chapters, fallbackId])

  return activeId
}

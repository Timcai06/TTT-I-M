import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { ChapterStateContext } from '../lib/chapterState'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'
import { narrativeChapters } from '../lib/narrativeChapters'
import { useStage } from '../lib/stage'

const fallbackChapterId = narrativeChapters[0]?.id ?? 'hero'
const scrollKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])

function hasStartedScrollNavigation(key: string): boolean {
  return scrollKeys.has(key)
}

function resolveChapterUrl(activeId: string): string {
  if (activeId === fallbackChapterId) {
    return `${window.location.pathname}${window.location.search}`
  }

  return `#${activeId}`
}

function hasMatchingChapterUrl(activeId: string, nextUrl: string): boolean {
  if (activeId === fallbackChapterId) {
    return !window.location.hash
  }

  return window.location.hash === nextUrl
}

export default function ChapterStateProvider({ children }: { children: ReactNode }): ReactElement {
  const { activeId } = useLandingScrollNarrative(narrativeChapters, fallbackChapterId)
  const [userScrollStarted, setUserScrollStarted] = useState(false)
  const stage = useStage()

  useEffect(() => {
    const markUserScroll = () => {
      setUserScrollStarted(true)
    }
    const markKeyboardScroll = (event: KeyboardEvent) => {
      if (hasStartedScrollNavigation(event.key)) {
        markUserScroll()
      }
    }

    window.addEventListener('wheel', markUserScroll, { passive: true })
    window.addEventListener('touchmove', markUserScroll, { passive: true })
    window.addEventListener('keydown', markKeyboardScroll)
    return () => {
      window.removeEventListener('wheel', markUserScroll)
      window.removeEventListener('touchmove', markUserScroll)
      window.removeEventListener('keydown', markKeyboardScroll)
    }
  }, [])

  useEffect(() => {
    // Explicit chapter jumps already own their hash update. Natural scrolling
    // used to update only the internal active chapter, leaving the address bar
    // inconsistent. Replace (never push) the URL once the user actually scrolls
    // so browser history is not polluted and deep links are not overwritten on
    // initial load or while the cinematic transition owns the viewport.
    if (!userScrollStarted || stage !== 'live') return

    const nextUrl = resolveChapterUrl(activeId)
    if (hasMatchingChapterUrl(activeId, nextUrl)) return
    window.history.replaceState(null, '', nextUrl)
  }, [activeId, stage, userScrollStarted])

  return (
    <ChapterStateContext.Provider value={{ activeId }}>
      {children}
    </ChapterStateContext.Provider>
  )
}

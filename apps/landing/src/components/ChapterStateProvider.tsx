import { useEffect, useRef, type ReactNode } from 'react'
import { ChapterStateContext } from '../lib/chapterState'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'
import { narrativeChapters } from '../lib/narrativeChapters'
import { getStage } from '../lib/stage'

const fallbackChapterId = narrativeChapters[0]?.id ?? 'hero'

export default function ChapterStateProvider({ children }: { children: ReactNode }) {
  const { activeId } = useLandingScrollNarrative(narrativeChapters, fallbackChapterId)
  const userScrollStarted = useRef(false)

  useEffect(() => {
    const markUserScroll = () => {
      userScrollStarted.current = true
    }
    const markKeyboardScroll = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
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
    if (!userScrollStarted.current || getStage() !== 'live') return

    const nextUrl = activeId === fallbackChapterId
      ? `${window.location.pathname}${window.location.search}`
      : `#${activeId}`
    if (activeId === fallbackChapterId ? !window.location.hash : window.location.hash === nextUrl) return
    window.history.replaceState(null, '', nextUrl)
  }, [activeId])

  return (
    <ChapterStateContext.Provider value={{ activeId }}>
      {children}
    </ChapterStateContext.Provider>
  )
}

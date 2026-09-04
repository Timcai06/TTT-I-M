import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { ChapterStateContext } from '../lib/chapterState'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'
import { narrativeChapters } from '../lib/narrativeChapters'
import { useStage } from '../lib/stage'
import { isKeyboardScrollIntent } from '../lib/scroll/scrollIntent'

const fallbackChapterId = narrativeChapters[0]?.id ?? 'hero'

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
  const contextValue = useMemo(() => ({ activeId }), [activeId])

  useEffect(() => {
    if (userScrollStarted) return

    const markUserScroll = () => {
      setUserScrollStarted(true)
    }
    const markKeyboardScroll = (event: KeyboardEvent) => {
      if (isKeyboardScrollIntent(event)) {
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
  }, [userScrollStarted])

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
    <ChapterStateContext.Provider value={contextValue}>
      {children}
    </ChapterStateContext.Provider>
  )
}

import type { ReactNode } from 'react'
import { ChapterStateContext } from '../lib/chapterState'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'
import { narrativeChapters } from '../lib/narrativeChapters'

const fallbackChapterId = narrativeChapters[0]?.id ?? 'hero'

export default function ChapterStateProvider({ children }: { children: ReactNode }) {
  const { activeId } = useLandingScrollNarrative(narrativeChapters, fallbackChapterId)

  return (
    <ChapterStateContext.Provider value={{ activeId }}>
      {children}
    </ChapterStateContext.Provider>
  )
}

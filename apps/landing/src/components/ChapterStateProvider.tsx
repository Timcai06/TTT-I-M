import type { ReactNode } from 'react'
import { navChapters, progressChapters } from '../chapters/registry'
import { ChapterStateContext } from '../lib/chapterState'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'

const trackedChapters = [...new Map(
  [...navChapters, ...progressChapters].map((chapter) => [chapter.id, chapter])
).values()]
const fallbackChapterId = trackedChapters[0]?.id ?? 'hero'

export default function ChapterStateProvider({ children }: { children: ReactNode }) {
  const { activeId } = useLandingScrollNarrative(trackedChapters, fallbackChapterId)

  return (
    <ChapterStateContext.Provider value={{ activeId }}>
      {children}
    </ChapterStateContext.Provider>
  )
}

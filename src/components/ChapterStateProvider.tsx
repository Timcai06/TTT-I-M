import type { ReactNode } from 'react'
import { navChapters, progressChapters } from '../chapters/registry'
import { ChapterStateContext } from '../lib/chapterState'
import { useActiveChapter } from '../lib/useActiveChapter'

const trackedChapters = [...new Map(
  [...navChapters, ...progressChapters].map((chapter) => [chapter.id, chapter])
).values()]
const fallbackChapterId = trackedChapters[0]?.id ?? 'hero'

export default function ChapterStateProvider({ children }: { children: ReactNode }) {
  const activeId = useActiveChapter(trackedChapters, fallbackChapterId)

  return (
    <ChapterStateContext.Provider value={{ activeId }}>
      {children}
    </ChapterStateContext.Provider>
  )
}

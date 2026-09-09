import { rememberChapterPosition } from './archiveReadingMemory'
import { routeToArchiveObject } from './archiveRoute'

/** Collapse the visible reading surface into its room object without rewinding the chapter. */
export function returnToArchiveObject(id: string) {
  const center = innerHeight / 2
  const current = ['hero', 'about', 'life', 'frame', 'skills', 'projects', 'contact']
    .map(chapterId => document.getElementById(chapterId))
    .find(element => {
      const rect = element?.getBoundingClientRect()
      return Boolean(rect && rect.top <= center && rect.bottom >= center)
    })?.id ?? id
  rememberChapterPosition(current)
  void routeToArchiveObject(current)
}

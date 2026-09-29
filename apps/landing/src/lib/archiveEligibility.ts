import { useSyncExternalStore } from 'react'
import { createMediaQueryStore } from './mediaQueryStore'

// CSS hides the room for either of these conditions. Use the same predicate for
// both the preload manifest and React mount, including after a viewport resize.
export const ARCHIVE_VISIBLE_QUERY = '(min-width: 769px) and (prefers-reduced-motion: no-preference)'
const archiveVisible = createMediaQueryStore(ARCHIVE_VISIBLE_QUERY)

export const canShowArchive = () => archiveVisible.getSnapshot()

export function useArchiveVisible(): boolean {
  return useSyncExternalStore(archiveVisible.subscribe, archiveVisible.getSnapshot, archiveVisible.getServerSnapshot)
}

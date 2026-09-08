import { useEffect, type RefObject } from 'react'
import { chapterTracks, type ArchiveTrack } from './chapterTracks'

/** Copy content scalars only. Live chapter DOM, pins and backdrops never enter 3D. */
export function useChapterPreview(host: RefObject<HTMLDivElement | null>, track: ArchiveTrack, enabled: boolean) {
  useEffect(() => {
    const container = host.current
    if (!enabled || !container) return
    const source = document.getElementById(chapterTracks[track].target)
    const title = document.createElement('h2'), caption = document.createElement('p')
    title.textContent = source?.querySelector('h1,h2')?.textContent?.trim() || chapterTracks[track].title
    caption.textContent = chapterTracks[track].index
    container.replaceChildren(caption, title)
    container.setAttribute('data-preview-ready', 'true')
    return () => { container.replaceChildren(); container.removeAttribute('data-preview-ready') }
  }, [host, track, enabled])
}

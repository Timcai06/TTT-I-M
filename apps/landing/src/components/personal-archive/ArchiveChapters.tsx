import type { ReactNode } from 'react'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import ArchiveChapterBridge from './ArchiveChapterBridge'
import { chapterTracks, type ArchiveTrack } from './chapterTracks'

export default function ArchiveChapter({ track, children }: { track: ArchiveTrack; children: ReactNode }) {
  const mobile = useMobileExperience(), reduced = useReducedMotion()
  if (mobile || reduced) return <>{children}</>
  return <div className="archive-chapter-sequence" data-archive-destination={chapterTracks[track].target}><ArchiveChapterBridge track={track} />{children}</div>
}

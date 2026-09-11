import { useEffect, useRef } from 'react'
import { useChapterState } from '../lib/chapterState'
import { useSound } from '../lib/sound/SoundContext'
import type { SoundCue } from '../lib/sound/SoundContext'

/**
 * Plays the soundtrack cues as the reader moves between chapters.
 *
 * SoundProvider is a complete Web Audio engine — four authored segments of
 * sciscope-soundtrack.mp3, master gain, cross-fades, film-mode hand-off — and
 * nothing in the tree had ever called `playSegment`. Its only two consumers were
 * the Nav toggle and the film player, so with sound switched on a visitor still
 * heard silence for the entire narrative. That is why no sound was reachable.
 *
 * The mapping follows the arc the segments were cut for rather than assigning one
 * per chapter: arrival, looking, evidence, and the closing statement.
 */
const CHAPTER_CUE: Record<string, SoundCue> = {
  hero: 'entry',
  about: 'entry',
  life: 'query',
  frame: 'query',
  skills: 'evidence',
  'work-transition': 'evidence',
  projects: 'evidence',
  contact: 'synthesis',
}

export default function ChapterSoundCues() {
  const { activeId } = useChapterState()
  const { enabled, playSegment } = useSound()
  const lastCue = useRef<SoundCue | null>(null)

  useEffect(() => {
    if (!enabled) { lastCue.current = null; return }
    const cue = CHAPTER_CUE[activeId]
    if (!cue || cue === lastCue.current) return
    lastCue.current = cue
    playSegment(cue)
  }, [activeId, enabled, playSegment])

  return null
}

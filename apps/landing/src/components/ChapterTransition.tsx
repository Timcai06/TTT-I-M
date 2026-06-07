import { useEffect, useMemo, useRef, useState } from 'react'
import { navChapters, progressChapters } from '../chapters/registry'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  dispatchChapterArrived,
  onChapterTransitionRequest,
  transitionToChapter,
  type ChapterTransitionRequest,
} from '../lib/chapterTransition'
import { scrollToChapter } from '../lib/chapterScroll'
import { getStage, setStage } from '../lib/stage'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { createTransitionTimeline } from '../lib/timelines/transitionTimeline'
import { prefersReducedMotion } from '../lib/motion'
import { usePretextTextInteraction } from '../lib/pretextIntroText'

const transitionChapters = navChapters.map((chapter) => {
  const progress = progressChapters.find((entry) => entry.id === chapter.id)?.progress
  return {
    id: chapter.id,
    index: progress?.index ?? chapter.nav.label.slice(0, 2),
    label: chapter.nav.label.replace(/^\d+\s*·\s*/, ''),
    name: progress?.name ?? chapter.nav.label,
  }
})

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

function splitText(text: string, className: string) {
  return text.split('').map((char, index) => {
    const displayChar = char === ' ' ? '\u00a0' : char
    return (
      <span className={className} data-final={char} key={`${char}-${index}`}>
        {displayChar}
      </span>
    )
  })
}

export default function ChapterTransition() {
  const rootRef = useRef<HTMLDivElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const queuedRef = useRef<ChapterTransitionRequest | null>(null)
  const [active, setActive] = useState(false)
  const [pretextReady, setPretextReady] = useState(false)
  const [pretextRefreshKey, setPretextRefreshKey] = useState(0)
  const [targetId, setTargetId] = useState<string>('hero')

  const target = useMemo(
    () => transitionChapters.find((chapter) => chapter.id === targetId) ?? transitionChapters[0],
    [targetId]
  )

  usePretextTextInteraction(targetNameRef, {
    enabled: active && pretextReady,
    glyphSelector: '.chapter-transition__target-glyph',
    refreshKey: pretextRefreshKey,
    strength: 0.5,
    text: target?.name ?? '',
  })

  useEffect(() => {
    const runTransition = async (request: ChapterTransitionRequest) => {
      if (getStage() === 'transitioning') {
        queuedRef.current = request
        return
      }

      if (prefersReducedMotion()) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        return
      }

      setStage('transitioning')
      setPretextReady(false)
      setTargetId(request.id)
      setActive(true)
      await nextFrame()

      const root = rootRef.current
      if (!root) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        setStage('live')
        return
      }

      await new Promise<void>((resolve) => {
        createTransitionTimeline(root, null, {
          onRevealTarget: () => {
            setPretextReady(true)
            setPretextRefreshKey((key) => key + 1)
          },
          onLand: () => {
            setPretextReady(false)
            scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
            window.requestAnimationFrame(() => {
              requestScrollRefresh(true)
              ScrollTrigger.update()
              dispatchChapterArrived(request.id)
            })
          },
          onComplete: resolve,
        })
      })

      gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
      setActive(false)
      setPretextReady(false)
      setStage('live')

      const queued = queuedRef.current
      queuedRef.current = null
      if (queued) void runTransition(queued)
    }

    return onChapterTransitionRequest((request) => {
      void runTransition(request)
    })
  }, [])

  return (
    <div
      className={`chapter-transition${active ? ' is-active' : ''}`}
      ref={rootRef}
      aria-hidden={!active}
    >
      <div className="chapter-transition__shutter chapter-transition__shutter--top" />
      <div className="chapter-transition__shutter chapter-transition__shutter--bottom" />
      <div className="chapter-transition__grain" aria-hidden="true" />

      <div className="chapter-transition__content">
        <div className="chapter-transition__target">
          <span className="chapter-transition__target-index">SEC {target?.index}</span>
          <strong>
            <span className="chapter-transition__target-name" ref={targetNameRef}>
              {splitText(target?.name ?? '', 'chapter-transition__target-glyph')}
            </span>
          </strong>
        </div>
      </div>
    </div>
  )
}

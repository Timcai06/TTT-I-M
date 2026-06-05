import { useEffect, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { progressChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'
import { useChapterState } from '../lib/chapterState'
import { transitionToChapter } from '../lib/chapterTransition'
import { computeChapterProgressFills } from '../lib/chapterProgress'
import type { ChapterRectSnapshot } from '../lib/activeChapter'

const sections = progressChapters.map((c) => ({
  id: c.id,
  index: c.progress.index,
  name: c.progress.name,
}))
const firstSection = sections[0] ?? { id: 'hero', index: '01', name: 'HOME' }

function readProgressRects(): ChapterRectSnapshot[] {
  return sections.map((section) => {
    const el = document.getElementById(section.id)
    const rect = el?.getBoundingClientRect()
    return {
      id: section.id,
      top: rect?.top ?? Number.POSITIVE_INFINITY,
      bottom: rect?.bottom ?? Number.POSITIVE_INFINITY,
    }
  })
}

export default function ScrollIndicator() {
  const { activeId } = useChapterState()
  const [fills, setFills] = useState<number[]>(() => sections.map(() => 0))

  useEffect(() => {
    const ctx = gsap.context(() => {})
    let frame = 0
    let disposeScrollTrigger = () => {}

    const updateFills = () => {
      frame = 0
      const nextFills = computeChapterProgressFills(readProgressRects(), window.innerHeight)
      setFills((current) => {
        const changed = nextFills.some((fill, index) => Math.abs(fill - (current[index] ?? 0)) > 0.002)
        return changed ? nextFills : current
      })
    }

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateFills)
    }

    const cancel = onChaptersReady(() => {
      ctx.add(() => {
        updateFills()
        const trigger = ScrollTrigger.create({
          start: 0,
          end: 'max',
          invalidateOnRefresh: true,
          onUpdate: scheduleUpdate,
          onRefresh: scheduleUpdate,
        })

        window.addEventListener('resize', scheduleUpdate)

        disposeScrollTrigger = () => {
          trigger.kill()
          window.removeEventListener('resize', scheduleUpdate)
        }
      })
    })

    return () => {
      cancel()
      disposeScrollTrigger()
      ctx.revert()
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const activeIdx = sections.findIndex((s) => s.id === activeId)
  const activeSection = sections[activeIdx] ?? firstSection

  const handleSegmentClick = (id: string) => {
    transitionToChapter(id, { updateHash: true })
  }

  return (
    <div className="scroll-indicator" aria-hidden="true">
      <div className="scroll-indicator__label">
        <span key={`idx-${activeSection.id}`} className="scroll-indicator__index animate-slide-up">
          {activeSection.index}
        </span>
        <span className="scroll-indicator__divider">//</span>
        <span key={`name-${activeSection.id}`} className="scroll-indicator__name animate-slide-up">
          {activeSection.name}
        </span>
      </div>

      <div className="scroll-indicator__track-container">
        {sections.map((sec, i) => {
          const fill = Math.min(1, Math.max(0, fills[i] ?? 0))
          const isActive = i === activeIdx

          return (
            <button
              key={sec.id}
              className={`scroll-indicator__segment${isActive ? ' is-active' : ''}`}
              onClick={() => handleSegmentClick(sec.id)}
              tabIndex={-1}
              aria-label={`Scroll to ${sec.name}`}
            >
              <span className="scroll-indicator__tooltip">
                <span className="scroll-indicator__tooltip-num">{sec.index}</span>
                <span className="scroll-indicator__tooltip-name">{sec.name}</span>
              </span>
              <span className="scroll-indicator__segment-bar">
                <span
                  className="scroll-indicator__segment-fill"
                  style={{ transform: `scaleY(${fill.toFixed(4)})` }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

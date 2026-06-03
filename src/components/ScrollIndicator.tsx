import { useEffect, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { progressChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'
import { scrollToChapter } from '../lib/chapterScroll'

const sections = progressChapters.map((c) => ({
  id: c.id,
  index: c.progress.index,
  name: c.progress.name,
}))
const firstSection = sections[0] ?? { id: 'hero', index: '01', name: 'HOME' }

export default function ScrollIndicator() {
  const [activeId, setActiveId] = useState(firstSection.id)
  const [fills, setFills] = useState<number[]>(() => sections.map(() => 0))

  useEffect(() => {
    const ctx = gsap.context(() => {})

    // Every segment is driven by its OWN section's ScrollTrigger, with the same
    // `top 50% → bottom 50%` span used for the active state. So all chapters
    // share one identical behaviour: the bar fills 0→1 exactly as that section
    // passes the viewport middle — same easing, same appearance, no chapter
    // filling faster or differently than another. Because each fill is its own
    // section's progress, it can never race ahead of the page either.
    const cancel = onChaptersReady(() => {
      ctx.add(() => {
        sections.forEach((sec, i) => {
          ScrollTrigger.create({
            trigger: `#${sec.id}`,
            start: 'top 50%',
            end: 'bottom 50%',
            onUpdate: (self) => {
              setFills((prev) => {
                if (prev[i] === self.progress) return prev
                const next = prev.slice()
                next[i] = self.progress
                return next
              })
            },
            onToggle: (self) => {
              if (self.isActive) setActiveId(sec.id)
            },
          })
        })
      })
    })

    return () => {
      cancel()
      ctx.revert()
    }
  }, [])

  const activeIdx = sections.findIndex((s) => s.id === activeId)
  const activeSection = sections[activeIdx] ?? firstSection

  const handleSegmentClick = (id: string) => {
    scrollToChapter(id, { updateHash: true })
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

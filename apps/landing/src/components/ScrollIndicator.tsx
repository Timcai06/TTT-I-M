import { useMemo } from 'react'
import { progressChapters } from '../chapters/registry'
import { useChapterState } from '../lib/chapterState'
import { transitionToChapter } from '../lib/chapterTransition'
import { computeChapterProgressFills } from '../lib/chapterProgress'
import { useChapterScrollMetrics } from '../lib/chapterScrollMetrics'

const sections = progressChapters.map((c) => ({
  id: c.id,
  index: c.progress.index,
  name: c.progress.name,
}))
const firstSection = sections[0] ?? { id: 'hero', index: '01', name: 'HOME' }

export default function ScrollIndicator() {
  const { activeId } = useChapterState()
  const { rects, viewportHeight } = useChapterScrollMetrics(sections)
  const fills = useMemo(() => (
    rects.length === 0 || viewportHeight <= 0
      ? sections.map(() => 0)
      : computeChapterProgressFills(rects, viewportHeight)
  ), [rects, viewportHeight])

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

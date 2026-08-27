import { useMemo } from 'react'
import { transitionToChapter } from '../lib/chapterTransition'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'
import { narrativeChapters, narrativeProgressById } from '../lib/narrativeChapters'

const sections = narrativeChapters.map(({ id }) => ({
  id,
  index: narrativeProgressById[id]?.index ?? '',
  name: narrativeProgressById[id]?.name ?? id,
}))
const firstSection = sections[0] ?? { id: 'hero', index: '01', name: 'HOME' }

export default function ScrollIndicator() {
  const { activeId, progressFills: fills } = useLandingScrollNarrative(sections, firstSection.id)

  const activeIdx = useMemo(() => {
    const index = sections.findIndex((section) => section.id === activeId)
    return index === -1 ? 0 : index
  }, [activeId])
  const activeSection = sections[activeIdx] ?? firstSection

  const handleSegmentClick = (id: string) => {
    transitionToChapter(id, { updateHash: true })
  }

  return (
    <div className="scroll-indicator" role="group" aria-label="章节导航">
      <div className="scroll-indicator__label" aria-hidden="true">
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
              aria-label={`Scroll to ${sec.name}`}
            >
              <span className="scroll-indicator__tooltip" aria-hidden="true">
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

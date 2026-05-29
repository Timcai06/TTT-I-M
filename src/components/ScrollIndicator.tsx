import { useEffect, useState, useCallback } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { progressChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'

const sections = progressChapters.map((c) => ({
  id: c.id,
  index: c.progress.index,
  name: c.progress.name,
}))

export default function ScrollIndicator() {
  const [activeSection, setActiveSection] = useState(sections[0])
  const [scrollPercent, setScrollPercent] = useState(0)
  const [proportions, setProportions] = useState<number[]>(
    sections.map(() => 1 / sections.length)
  )

  const measureSections = useCallback(() => {
    const heights = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[]

    const total = heights.reduce((sum, el) => sum + el.offsetHeight, 0)
    if (total <= 0) return

    setProportions(heights.map((el) => el.offsetHeight / total))
  }, [])

  useEffect(() => {
    window.addEventListener('resize', measureSections)
    // Sections are lazy-loaded; measure only once they exist.
    const cancel = onChaptersReady(measureSections)
    return () => {
      cancel()
      window.removeEventListener('resize', measureSections)
    }
  }, [measureSections])

  useEffect(() => {
    // The overall progress trigger has no element dependency.
    const progressTrigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        setScrollPercent(self.progress)
      },
    })

    // Per-section triggers must be created after the (lazy) sections mount —
    // otherwise `#about`…`#contact` resolve to null and collapse to scroll 0,
    // making the last section spuriously "active" at the top of the page.
    let sectionTriggers: ScrollTrigger[] = []
    const cancel = onChaptersReady(() => {
      sectionTriggers = sections.map((sec) =>
        ScrollTrigger.create({
          trigger: `#${sec.id}`,
          start: 'top 50%',
          end: 'bottom 50%',
          onToggle: (self) => {
            if (self.isActive) {
              setActiveSection(sec)
            }
          },
        })
      )
    })

    return () => {
      cancel()
      progressTrigger.kill()
      sectionTriggers.forEach((t) => t.kill())
    }
  }, [])

  const activeIdx = sections.findIndex((s) => s.id === activeSection.id)

  return (
    <div className="scroll-indicator" aria-hidden="true">
      <div className="scroll-indicator__label">
        <span className="scroll-indicator__index">{activeSection.index}</span>
        <span className="scroll-indicator__divider">//</span>
        <span className="scroll-indicator__name">{activeSection.name}</span>
      </div>

      <div className="scroll-indicator__track-container">
        {sections.map((sec, i) => {
          const prop = proportions[i]
          const prevSum = proportions
            .slice(0, i)
            .reduce((a, b) => a + b, 0)

          const rawFill =
            prop > 0
              ? ((scrollPercent - prevSum) / prop) * 100
              : 0
          const fill = Math.min(100, Math.max(0, rawFill))

          return (
            <div
              key={sec.id}
              className={`scroll-indicator__segment${i === activeIdx ? ' is-active' : ''}`}
              style={{ height: `calc(${prop} * 280px)` }}
            >
              <div
                className="scroll-indicator__segment-fill"
                style={{ height: `${fill}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

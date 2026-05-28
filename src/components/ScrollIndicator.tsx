import { useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const sections = [
  { id: 'hero', index: '01', name: 'HOME' },
  { id: 'about', index: '02', name: 'ABOUT' },
  { id: 'skills', index: '03', name: 'STACK' },
  { id: 'projects', index: '04', name: 'WORK' },
  { id: 'contact', index: '05', name: 'CONTACT' },
]

export default function ScrollIndicator() {
  const [activeSection, setActiveSection] = useState(sections[0])
  const [scrollPercent, setScrollPercent] = useState(0)

  useEffect(() => {
    // 1. 监听全局滚动进度
    const progressTrigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        setScrollPercent(self.progress)
      },
    })

    // 2. 监听各个章节与视口中线的接触，切换活动章节
    const sectionTriggers = sections.map((sec) => {
      return ScrollTrigger.create({
        trigger: `#${sec.id}`,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => {
          if (self.isActive) {
            setActiveSection(sec)
          }
        },
      })
    })

    return () => {
      progressTrigger.kill()
      sectionTriggers.forEach((t) => t.kill())
    }
  }, [])

  return (
    <div className="scroll-indicator" aria-hidden="true">
      {/* 活跃章节信息 (微型 Monospace 排版) */}
      <div className="scroll-indicator__label">
        <span className="scroll-indicator__index">{activeSection.index}</span>
        <span className="scroll-indicator__divider">//</span>
        <span className="scroll-indicator__name">{activeSection.name}</span>
      </div>

      {/* 垂直进度条 */}
      <div className="scroll-indicator__bar">
        <div
          className="scroll-indicator__fill"
          style={{ height: `${scrollPercent * 100}%` }}
        />
      </div>
    </div>
  )
}

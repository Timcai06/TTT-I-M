import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { gsap } from '../lib/gsap'
import { scrollToChapter } from '../lib/chapterScroll'

export interface AccordionGalleryItem {
  image: string
  label?: string
  link?: string
  alt?: string
}

interface AccordionGalleryProps {
  items: AccordionGalleryItem[]
  defaultIndex?: number
  accentColor?: string
  overlayColor?: string
  textColor?: string
  height?: number
  gap?: number
  radius?: number
  expandRatio?: number
  orientation?: 'horizontal' | 'vertical'
  duration?: number
  ease?: string
  parallax?: number
  tilt?: number
  stagger?: number
  trigger?: 'hover' | 'click'
  showLabels?: boolean
  grayscale?: boolean
  className?: string
}

export default function AccordionGallery({
  items,
  defaultIndex = 1,
  accentColor = '#d8bd86',
  overlayColor = '#08090a',
  textColor = '#f5f2ea',
  height = 520,
  gap = 10,
  radius = 18,
  expandRatio = 0.56,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = '',
}: AccordionGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const mediaRefs = useRef<(HTMLElement | null)[]>([])
  const barRefs = useRef<(HTMLElement | null)[]>([])
  const textRefs = useRef<(HTMLElement | null)[]>([])
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const firstRunRef = useRef(true)
  const mediaSizeRef = useRef(320)
  const count = items.length
  const vertical = orientation === 'vertical'
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(count - 1, 0)))
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const applyLayout = useCallback((animate: boolean) => {
    if (items.length === 0) return
    const ratio = Math.min(Math.max(expandRatio, 0.2), 0.9)
    const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1
    timelineRef.current?.kill()
    const activeDuration = animate && !reducedMotion ? duration : 0
    const timeline = gsap.timeline()
    panelRefs.current.forEach((panel, index) => {
      if (!panel) return
      const selected = index === active
      const rotation = selected ? 0 : index < active ? tilt : -tilt
      timeline.to(panel, {
        flexGrow: selected ? grow : 1,
        ...(vertical ? { rotationX: -rotation } : { rotationY: rotation }),
        duration: activeDuration,
        ease,
      }, 0)
      const media = mediaRefs.current[index]
      if (media) {
        const drift = Math.max(-1.5, Math.min(1.5, active - index))
        const shift = drift * parallax * mediaSizeRef.current * 0.06
        timeline.to(media, {
          xPercent: -50,
          yPercent: -50,
          x: vertical ? 0 : selected ? 0 : shift,
          y: vertical ? selected ? 0 : shift : 0,
          '--ag-gray': grayscale ? selected ? 0 : 1 : 0,
          '--ag-dim': selected ? 0 : 0.35,
          duration: activeDuration,
          ease,
        }, 0)
      }
      const bar = barRefs.current[index]
      const text = textRefs.current[index]
      if (showLabels && bar && text) {
        timeline.to([bar, text], selected
          ? { autoAlpha: 1, x: 0, duration: activeDuration, ease, stagger: reducedMotion ? 0 : stagger }
          : { autoAlpha: 0, x: -14, duration: activeDuration * 0.6, ease }, 0)
      }
    })
    timelineRef.current = timeline
  }, [active, count, duration, ease, expandRatio, grayscale, items.length, parallax, reducedMotion, showLabels, stagger, tilt, vertical])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const rect = root.getBoundingClientRect()
      const total = vertical ? rect.height : rect.width
      const usable = Math.max(total - gap * (count - 1), 120)
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22)
      mediaSizeRef.current = size
      root.style.setProperty('--ag-media-size', `${size}px`)
      applyLayout(!firstRunRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [applyLayout, count, expandRatio, gap, vertical])

  useEffect(() => {
    applyLayout(!firstRunRef.current)
    firstRunRef.current = false
  }, [applyLayout])

  useEffect(() => () => {
    timelineRef.current?.kill()
  }, [])

  if (items.length === 0) return null

  const handleClick = (index: number, event: MouseEvent) => {
    if (index !== active) {
      setActive(index)
    }
    const link = items[index]?.link
    if (!link) {
      event.preventDefault()
      return
    }

    if (link.startsWith('#')) {
      const chapterId = decodeURIComponent(link.slice(1))
      if (chapterId && document.getElementById(chapterId)) {
        event.preventDefault()
        scrollToChapter(chapterId, { updateHash: true })
      }
    }
  }
  const handleKeyDown = (index: number, event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index + 1) % count)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index - 1 + count) % count)
    }
  }
  const rootStyle = {
    '--ag-accent': accentColor,
    '--ag-overlay': overlayColor,
    '--ag-text': textColor,
    '--ag-gap': `${gap}px`,
    '--ag-radius': `${radius}px`,
    height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={rootStyle}
      role="list"
      aria-label="Photography archive categories"
    >
      {items.map((item, index) => {
        const selected = index === active
        const panelProps = {
          ref: (node: HTMLElement | null) => { panelRefs.current[index] = node },
          className: `ag-panel${selected ? ' ag-panel--active' : ''}`,
          onClick: (event: MouseEvent) => handleClick(index, event),
          onMouseEnter: () => { if (trigger === 'hover') setActive(index) },
          onFocus: () => setActive(index),
          onKeyDown: (event: KeyboardEvent) => handleKeyDown(index, event),
          role: 'listitem',
          tabIndex: 0,
          'aria-current': selected ? 'true' as const : undefined,
          'aria-label': item.label,
          'data-cursor': 'hover',
          'data-cursor-label': 'OPEN ↘',
        }
        const contents = (
          <>
            <span className="ag-panel__frame">
              <span className="ag-panel__media" ref={(node) => { mediaRefs.current[index] = node }}>
                <img src={item.image} alt={item.alt || item.label || ''} draggable={false} loading="lazy" decoding="async" />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span className="ag-panel__bar" ref={(node) => { barRefs.current[index] = node }} />
                <span className="ag-panel__label-copy">
                  <span className="ag-panel__text" ref={(node) => { textRefs.current[index] = node }}>{item.label}</span>
                  <span className="ag-panel__action">Click to enter · 点击进入</span>
                </span>
              </span>
            )}
          </>
        )
        return item.link
          ? <a key={item.link} href={item.link} {...panelProps}>{contents}</a>
          : <div key={`${item.label}-${index}`} {...panelProps}>{contents}</div>
      })}
    </div>
  )
}

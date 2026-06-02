import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { framePanels } from '../data/frames'

export default function Frame() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const imagePanels = useMemo(
    () => framePanels.filter((panel) => panel.layout === 'image'),
    []
  )
  const imageCount = imagePanels.length
  const current = imagePanels[active]?.frame

  useEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    if (!rootEl || !trackEl) return

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.frame-horizontal__title .split-line__inner',
        { yPercent: 110, skewY: 6 },
        {
          yPercent: 0,
          skewY: 0,
          duration: 1.4,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: rootEl, start: 'top 78%' },
        }
      )

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const tween = gsap.to(trackEl, {
          x: () => -(trackEl.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: rootEl,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${Math.max(1, trackEl.scrollWidth - window.innerWidth)}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: () => {
              const panels = Array.from(trackEl.querySelectorAll<HTMLElement>('.frame-panel--image'))
              const center = window.innerWidth / 2
              let next = 0
              let closest = Number.POSITIVE_INFINITY
              panels.forEach((panel, index) => {
                const rect = panel.getBoundingClientRect()
                const distance = Math.abs(rect.left + rect.width / 2 - center)
                if (distance < closest) {
                  closest = distance
                  next = index
                }
              })
              setActive((prev) => (prev === next ? prev : next))
            },
          },
        })

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      gsap.utils.toArray<HTMLImageElement>('.frame-panel img').forEach((img) => {
        if (img.complete) return
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
      })
    }, rootEl)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [])

  return (
    <section className="frame-horizontal" id="frame" ref={root} data-horizontal-section>
      <div className="frame-horizontal__pin">
        <aside className="frame-horizontal__rail" aria-label="Frame gallery progress">
          <span className="frame-horizontal__rail-kicker">Frame</span>
          <span className="frame-horizontal__rail-title">Architecture</span>
          <span className="frame-horizontal__rail-count">
            {String(active + 1).padStart(2, '0')} / {String(imageCount).padStart(2, '0')}
          </span>
          {current && <span className="frame-horizontal__rail-current">{current.title}</span>}
        </aside>

        <div className="frame-horizontal__track" ref={track} data-horizontal-track>
          {framePanels.map((panel, index) => {
            if (panel.layout === 'intro' || panel.layout === 'callout' || panel.layout === 'outro') {
              return (
                <article className={`frame-panel frame-panel--${panel.layout}`} key={`${panel.layout}-${index}`}>
                  {panel.eyebrow && <p className="frame-panel__eyebrow">{panel.eyebrow}</p>}
                  {panel.title && (
                    <h2 className="section__title frame-horizontal__title">
                      <span className="split-line"><span className="split-line__inner">{panel.title}</span></span>
                    </h2>
                  )}
                  {panel.body && <p className="frame-panel__body">{panel.body}</p>}
                </article>
              )
            }

            const frame = panel.frame
            if (!frame) return null

            return (
              <figure
                className={`frame-panel frame-panel--image frame-panel--${frame.orientation}`}
                key={frame.src}
                data-tone={frame.tone}
                data-cursor="hover"
              >
                <div className="frame-panel__media">
                  <img src={frame.src} alt={frame.title} loading="lazy" decoding="async" />
                </div>
                <figcaption className="frame-panel__caption">
                  <span className="frame-panel__caption-title">{frame.title}</span>
                  <span>{frame.location}</span>
                  <span>{frame.meta}</span>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}

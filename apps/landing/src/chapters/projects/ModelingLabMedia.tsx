import { lazy, Suspense, useRef, useState, type MouseEvent } from 'react'
import type { Project } from '../../content'
import { gsap, useGSAP } from '../../lib/gsap'
import { openProjectLightbox } from './lightbox'
import { useMobileProjectMedia } from './useProjectMediaMode'

const MobileProjectCarousel = lazy(() => import('./MobileProjectCarousel'))

export default function ModelingLabMedia({ project }: { project: Project }) {
  const cases = project.caseStudies ?? []
  const [activeId, setActiveId] = useState(cases[0]?.id ?? '')
  const root = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const mobile = useMobileProjectMedia()
  const active = cases.find((study) => study.id === activeId) ?? cases[0]

  useGSAP(() => {
    if (!visual.current || !active || mobile) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(visual.current, { autoAlpha: 1, y: 0 })
      return
    }
    gsap.fromTo(
      visual.current,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.58, ease: 'power3.out', clearProps: 'transform' },
    )
  }, { scope: root, dependencies: [active?.id, mobile], revertOnUpdate: true })

  if (!active) return null

  if (mobile) {
    return (
      <div className="project-card__media project-card__media--modeling">
        <Suspense fallback={<div className="project-carousel project-carousel--loading" aria-hidden="true" />}>
          <MobileProjectCarousel shots={cases.map((study) => study.shot)} label="数学建模案例截图" />
        </Suspense>
      </div>
    )
  }

  const warmImage = (src: string) => {
    const image = new Image()
    image.decoding = 'async'
    image.src = src
  }

  const openActiveShot = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    const shots = cases.map((study) => study.shot)
    const index = Math.max(0, cases.findIndex((study) => study.id === active.id))
    void openProjectLightbox(shots, index, event.currentTarget)
  }

  return (
    <div className="project-card__media project-card__media--modeling modeling-lab" ref={root}>
      <div className="modeling-lab__cases" role="tablist" aria-label="数学建模案例">
        <div className="modeling-lab__cases-label">Case index</div>
        {cases.map((study) => {
          const selected = study.id === active.id
          return (
            <button
              key={study.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="modeling-lab-case-panel"
              className={`modeling-lab__case${selected ? ' is-active' : ''}`}
              data-case-id={study.id}
              onPointerEnter={() => warmImage(study.shot.src)}
              onFocus={() => {
                warmImage(study.shot.src)
                setActiveId(study.id)
              }}
              onClick={() => setActiveId(study.id)}
            >
              <span className="modeling-lab__case-index">{study.index}</span>
              <span className="modeling-lab__case-copy">
                <strong>{study.title}</strong>
                <small>{study.subtitle}</small>
              </span>
            </button>
          )
        })}
      </div>

      <figure
        id="modeling-lab-case-panel"
        className="media-frame media-frame--data modeling-lab__frame"
        data-cursor="hover"
        role="tabpanel"
      >
        <div className="media-frame__chrome">
          <span className="media-frame__dots"><i /><i /><i /></span>
          <span className="media-frame__label">CASE {active.index} · MODEL READOUT</span>
        </div>
        <div className="modeling-lab__visual" ref={visual}>
          <a
            className="media-frame__stage media-frame__open"
            href={active.shot.src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openActiveShot}
            aria-label={`全屏查看：${active.shot.label}`}
          >
            <img
              key={active.shot.src}
              src={active.shot.src}
              alt={active.shot.alt}
              loading={active.index === '01' ? 'eager' : 'lazy'}
              decoding="async"
              className="media-frame__img is-active"
            />
          </a>
          <figcaption className="modeling-lab__caption">
            <div>
              <span>{active.shot.label}</span>
              <p>{active.summary}</p>
            </div>
            <a href={active.repository} target="_blank" rel="noopener noreferrer">
              Case repo
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </a>
          </figcaption>
        </div>
      </figure>
    </div>
  )
}


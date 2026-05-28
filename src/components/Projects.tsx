import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '../data/projects'

gsap.registerPlugin(ScrollTrigger)

export default function Projects() {
  const root = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState(projects[0]?.id ?? '')
  const activeProject = projects.find((p) => p.id === activeId) ?? projects[0]

  useEffect(() => {
    if (!root.current) return
    let observer: IntersectionObserver | null = null
    const ctx = gsap.context(() => {
      gsap.from('.project-card', {
        scrollTrigger: {
          trigger: '.projects__list',
          start: 'top 75%',
        },
        y: 60,
        opacity: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: 'expo.out',
      })

      // hover accent color injection
      document.querySelectorAll<HTMLElement>('.project-card').forEach((card) => {
        const accent = card.dataset.accent || '#6b8fb5'
        card.style.setProperty('--accent', accent)
      })

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.projectId
              if (id) setActiveId(id)
            }
          })
        },
        { threshold: 0.42, rootMargin: '-18% 0px -36% 0px' }
      )

      document.querySelectorAll<HTMLElement>('.project-card').forEach((card) => {
        observer?.observe(card)
      })
    }, root)
    return () => {
      observer?.disconnect()
      ctx.revert()
    }
  }, [])

  return (
    <section className="section projects container" id="projects" ref={root}>
      <div className="projects__header">
        <div>
          <div className="section__label">Work — 选作</div>
          <h2 className="section__title">
            Six things <em>I made</em><br />in 2026.
          </h2>
        </div>
        <p className="projects__header-side">
          每个项目都对应一个 GitHub 仓库。点开看 README 里我留下的细节 —
          它们大多是阶段性的，但每一个我都在工程化上花过功夫。
        </p>
      </div>

      {activeProject && (
        <div className="projects__preview" style={{ '--accent': activeProject.accent } as CSSProperties}>
          <div className="projects__preview-orbit" aria-hidden="true" />
          <div className="projects__preview-grid" aria-hidden="true" />
          <div>
            <span>{activeProject.index}</span>
            <strong>{activeProject.name}</strong>
          </div>
          <p>{activeProject.tagline}</p>
        </div>
      )}

      <div className="projects__list">
        {projects.map((p) => (
          <article
            className="project-card"
            key={p.id}
            data-accent={p.accent}
            data-project-id={p.id}
            onMouseEnter={() => setActiveId(p.id)}
            onFocus={() => setActiveId(p.id)}
          >
            <div className="project-card__index">{p.index}</div>

            <div className="project-card__main">
              <h3 className="project-card__title">{p.name}</h3>
              <div className="project-card__cn">{p.cnTitle}</div>
              <div className="project-card__tagline">{p.tagline}</div>
            </div>

            <div className="project-card__detail">
              <p className="project-card__desc">{p.description}</p>
              <ul className="project-card__highlights">
                {p.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <div className="project-card__stack">
                {p.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="project-card__links" style={{ marginTop: 24 }}>
                <a className="project-card__link" href={p.github} target="_blank" rel="noreferrer">
                  GitHub
                  <svg viewBox="0 0 12 12" fill="none">
                    <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </a>
                {p.live && (
                  <a className="project-card__link" href={p.live} target="_blank" rel="noreferrer">
                    Live
                    <svg viewBox="0 0 12 12" fill="none">
                      <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <div className="project-card__year">{p.year}</div>
          </article>
        ))}
      </div>
    </section>
  )
}

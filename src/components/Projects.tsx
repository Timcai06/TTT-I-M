import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { projects } from '../data/projects'

export default function Projects() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.project-card').forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 88%',
          onEnter: () => card.classList.add('is-visible'),
          onLeaveBack: () => card.classList.remove('is-visible'), // 双向回退触发
        })
      })

      // hover accent color injection
      document.querySelectorAll<HTMLElement>('.project-card').forEach((card) => {
        const accent = card.dataset.accent || '#6b8fb5'
        card.style.setProperty('--accent', accent)
      })

      ScrollTrigger.refresh()
    }, root)
    return () => {
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

      <div className="projects__list">
        {projects.map((p) => (
          <article
            className="project-card"
            key={p.id}
            data-accent={p.accent}
            data-project-id={p.id}
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

import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { projects, type Project } from '../data/projects'

function ProjectMedia({ project }: { project: Project }) {
  const [active, setActive] = useState(0)

  if (!project.media) {
    return (
      <div className="project-card__media project-card__media--soon">
        <div className="media-frame media-frame--soon">
          <span className="media-frame__soon-mark">/ / /</span>
          <span className="media-frame__soon-text">in the lab</span>
        </div>
      </div>
    )
  }

  const { kind, shots } = project.media
  const shot = shots[active]
  const multi = shots.length > 1

  const chromeLabel =
    kind === 'terminal'
      ? `zsh — ${project.id}`
      : kind === 'data'
        ? 'DATA READOUT'
        : shot.label

  return (
    <div className={`project-card__media project-card__media--${kind}`}>
      <figure className={`media-frame media-frame--${kind}`} data-cursor="hover">
        {kind !== 'cinematic' && (
          <div className="media-frame__chrome">
            <span className="media-frame__dots">
              <i /><i /><i />
            </span>
            <span className="media-frame__label">{chromeLabel}</span>
          </div>
        )}

        <div className="media-frame__stage">
          {shots.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={`${project.name} — ${s.label}`}
              loading="lazy"
              className={`media-frame__img${i === active ? ' is-active' : ''}`}
            />
          ))}
          {kind === 'cinematic' && (
            <>
              <span className="media-frame__tick media-frame__tick--tl" />
              <span className="media-frame__tick media-frame__tick--br" />
              <figcaption className="media-frame__caption">{shot.label}</figcaption>
            </>
          )}
        </div>
      </figure>

      {multi && (
        <div className="media-frame__thumbs">
          {shots.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={`media-thumb${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={s.label}
            >
              <img src={s.src} alt="" loading="lazy" />
              <span className="media-thumb__label">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Projects() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.project-card').forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          onEnter: () => card.classList.add('is-visible'),
          onLeaveBack: () => card.classList.remove('is-visible'),
        })
      })

      document.querySelectorAll<HTMLElement>('.project-card').forEach((card) => {
        const accent = card.dataset.accent || '#6b8fb5'
        card.style.setProperty('--accent', accent)
      })

      ScrollTrigger.refresh()
    }, root)
    return () => ctx.revert()
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
            <div className="project-card__text">
              <div className="project-card__top">
                <span className="project-card__index">{p.index}</span>
                <span className="project-card__year">{p.year}</span>
              </div>

              <h3 className="project-card__title">{p.name}</h3>
              <div className="project-card__cn">{p.cnTitle}</div>
              <div className="project-card__tagline">{p.tagline}</div>

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
              <div className="project-card__links">
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

            <ProjectMedia project={p} />
          </article>
        ))}
      </div>
    </section>
  )
}

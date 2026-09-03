import type { CSSProperties } from 'react'
import { projects } from '../../content'
import BorderGlow from '../../components/BorderGlow'
import { getLenis } from '../../lib/lenis'
import { mixHexColor } from '../../lib/hex'

function scrollToProject(id: string, source: HTMLElement) {
  const card = source
    .closest<HTMLElement>('#projects')
    ?.querySelector<HTMLElement>(`[data-project-id="${id}"]`)
  if (!card) return

  const lenis = getLenis()
  if (lenis) lenis.scrollTo(card, { offset: -72 })
  else card.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function ProjectsBento() {
  return (
    <div className="projects__bento-shell">
      <div className="projects__bento" role="list" aria-label="项目速览">
        {projects.map((project, index) => {
          const shot = project.media?.shots[0]
          return (
            <div
              className="bento-glow"
              role="listitem"
              key={project.id}
              style={{ '--tile-i': index } as CSSProperties}
            >
              <BorderGlow
                as="button"
                type="button"
                className={`bento-tile${shot ? '' : ' bento-tile--soon'}`}
                style={{ '--tile-accent': project.accent } as CSSProperties}
                onClick={(event) => scrollToProject(project.id, event.currentTarget)}
                aria-label={`跳到项目 ${project.name} — ${project.tagline}`}
                data-cursor="hover"
                data-glass-target
                animated={project.id === 'educanvas'}
                edgeSensitivity={14}
                glowColor="39 46 72"
                glowIntensity={1.3}
                glowRadius={48}
                coneSpread={32}
                fillOpacity={0.46}
                borderRadius={18}
                colors={[mixHexColor(project.accent, '#777b79', 0.72), '#d8bd86', '#a6aaa7']}
              >
                {shot ? (
                  <img
                    className="bento-tile__img"
                    src={shot.src}
                    alt=""
                    loading="eager"
                    decoding="async"
                    fetchPriority={index < 2 ? 'high' : 'auto'}
                  />
                ) : (
                  <span className="bento-image__empty">in the lab / / /</span>
                )}
                <span className="bento-tile__scrim" aria-hidden="true" />
                <span className="bento-tile__top" aria-hidden="true">
                  <span className="bento-tile__index">{project.index}</span>
                  <span className="bento-tile__year">{project.year}</span>
                </span>
                <span className="bento-tile__name" aria-hidden="true">{project.name}</span>
                <span className="bento-tile__tag" aria-hidden="true">
                  {shot ? project.tagline : 'in the lab / / /'}
                </span>
                <span className="bento-tile__line" aria-hidden="true" />
              </BorderGlow>
            </div>
          )
        })}
      </div>
    </div>
  )
}

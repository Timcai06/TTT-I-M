import { lazy, Suspense, useState, type MouseEvent, type ReactElement } from 'react'
import type { Project } from '../../content'
import ModelingLabMedia from './ModelingLabMedia'
import { openProjectLightbox } from './lightbox'
import { useMobileProjectMedia } from './useProjectMediaMode'

const MobileProjectCarousel = lazy(() => import('./MobileProjectCarousel'))

type ProjectMediaModel = NonNullable<Project['media']>

function resolveChromeLabel(
  kind: ProjectMediaModel['kind'],
  projectId: Project['id'],
  fallbackLabel: string,
): string {
  if (kind === 'terminal') {
    return `zsh — ${projectId}`
  }

  if (kind === 'data') {
    return 'DATA READOUT'
  }

  return fallbackLabel
}

export default function ProjectMedia({ project }: { project: Project }): ReactElement | null {
  const [active, setActive] = useState(0)
  const mobile = useMobileProjectMedia()

  if (project.caseStudies?.length) return <ModelingLabMedia project={project} />

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
  const shot = shots[active] ?? shots[0]
  if (!shot) return null

  if (mobile) {
    return (
      <div className={`project-card__media project-card__media--${kind}`}>
        <Suspense fallback={<div className="project-carousel project-carousel--loading" aria-hidden="true" />}>
          <MobileProjectCarousel shots={shots} label={`${project.name} 项目截图`} />
        </Suspense>
      </div>
    )
  }

  const chromeLabel = resolveChromeLabel(kind, project.id, shot.label)

  const openShot = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    void openProjectLightbox(shots, active, event.currentTarget)
  }

  return (
    <div className={`project-card__media project-card__media--${kind}`}>
      <figure className={`media-frame media-frame--${kind}`} data-cursor="hover">
        {kind !== 'cinematic' ? (
          <div className="media-frame__chrome">
            <span className="media-frame__dots"><i /><i /><i /></span>
            <span className="media-frame__label">{chromeLabel}</span>
          </div>
        ) : null}

        <a
          className="media-frame__stage media-frame__open"
          href={shot.src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openShot}
          aria-label={`全屏查看：${shot.label}`}
        >
          {shots.map((item, index) => (
            <img
              key={item.src}
              src={item.src}
              alt={index === active ? item.alt : ''}
              aria-hidden={index === active ? undefined : true}
              loading="lazy"
              decoding="async"
              className={`media-frame__img${index === active ? ' is-active' : ''}`}
            />
          ))}
          {kind === 'cinematic' ? (
            <>
              <span className="media-frame__tick media-frame__tick--tl" aria-hidden="true" />
              <span className="media-frame__tick media-frame__tick--br" aria-hidden="true" />
              <span className="media-frame__caption">{shot.label}</span>
            </>
          ) : null}
        </a>
      </figure>

      {shots.length > 1 ? (
        <div className="media-frame__thumbs">
          {shots.map((item, index) => (
            <button
              key={item.src}
              type="button"
              className={`media-thumb${index === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              aria-label={item.label}
              aria-pressed={index === active}
            >
              <img src={item.src} alt="" loading="lazy" decoding="async" />
              <span className="media-thumb__label">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

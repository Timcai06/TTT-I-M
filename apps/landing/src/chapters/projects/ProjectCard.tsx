import { lazy, Suspense, type MouseEvent } from 'react'
import type { Project } from '../../content'
import ProjectMedia from './ProjectMedia'

const ProjectMetrics = lazy(() => import('./ProjectMetrics'))

interface ProjectCardProps {
  project: Project
  onOpenCaseStudy: (
    project: Project,
    trigger: HTMLButtonElement,
    sourceImage: HTMLImageElement | null,
  ) => void
}

export default function ProjectCard({ project, onOpenCaseStudy }: ProjectCardProps) {
  const hasCaseStudy = Boolean(project.media || project.caseStudies?.length || project.detail)
  const openCaseStudy = (event: MouseEvent<HTMLButtonElement>) => {
    const card = event.currentTarget.closest<HTMLElement>('[data-project-id]')
    const sourceImage = card?.querySelector<HTMLImageElement>('.media-frame__img.is-active') ?? null
    onOpenCaseStudy(project, event.currentTarget, sourceImage)
  }

  return (
    <article
      className="project-card"
      data-accent={project.accent}
      data-project-id={project.id}
      data-motion="project-card"
    >
      <div className="project-card__text">
        <div className="project-card__top">
          <span className="project-card__index">{project.index}</span>
          <span className="project-card__year">{project.year}</span>
        </div>

        <h3 className="project-card__title">{project.name}</h3>
        <div className="project-card__cn">{project.cnTitle}</div>
        <div className="project-card__tagline">{project.tagline}</div>
        <p className="project-card__desc">{project.description}</p>

        {project.metrics?.length ? (
          <Suspense fallback={null}>
            <ProjectMetrics metrics={project.metrics} />
          </Suspense>
        ) : null}

        <ul className="project-card__highlights">
          {project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
        </ul>
        <div className="project-card__stack">
          {project.stack.map((technology) => <span key={technology}>{technology}</span>)}
        </div>
        <div className="project-card__links">
          <a className="project-card__link" href={project.github} target="_blank" rel="noopener noreferrer">
            {project.caseStudies?.length ? 'Featured repo' : 'GitHub'}
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </a>
          {project.live ? (
            <a className="project-card__link" href={project.live} target="_blank" rel="noopener noreferrer">
              Live
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </a>
          ) : null}
          {hasCaseStudy ? (
            <button
              className="project-card__link project-card__case-trigger"
              type="button"
              onClick={openCaseStudy}
              aria-haspopup="dialog"
              data-case-study-trigger={project.id}
            >
              View case study
              <span aria-hidden="true">↗</span>
            </button>
          ) : null}
        </div>
      </div>

      <ProjectMedia project={project} />
    </article>
  )
}

import type { MouseEvent } from 'react'
import type { Project, ProjectShot } from '../../content'
import ProjectMetrics from './ProjectMetrics'
import { openProjectLightbox } from './lightbox'

function projectShots(project: Project): readonly ProjectShot[] {
  if (project.caseStudies?.length) return project.caseStudies.map((study) => study.shot)
  return project.media?.shots ?? []
}

export default function ProjectCaseContent({ project }: { project: Project }) {
  const shots = projectShots(project)
  const openShot = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    void openProjectLightbox(shots, index, event.currentTarget)
  }

  return (
    <div className="project-dialog__body">
      <section className="project-dialog__overview" aria-label="项目概览">
        <p>{project.description}</p>
        {project.metrics?.length ? <ProjectMetrics metrics={project.metrics} /> : null}
        <ul>{project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
      </section>

      {project.detail?.sections?.map((section) => (
        <section className="project-dialog__section" key={section.id}>
          <h3>{section.title}</h3>
          <p>{section.body}</p>
          {section.bullets?.length ? (
            <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          ) : null}
        </section>
      ))}

      {shots.length ? (
        <section className="project-dialog__gallery" aria-label="项目证据图库">
          <h3>Evidence gallery</h3>
          <div className="project-dialog__shots">
            {shots.map((shot, index) => (
              <a
                key={shot.src}
                href={shot.src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => openShot(event, index)}
                aria-label={`全屏查看：${shot.label}`}
              >
                <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
                <span>{shot.label}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="project-dialog__footer">
        <div className="project-dialog__stack" aria-label="技术栈">
          {project.stack.map((technology) => <span key={technology}>{technology}</span>)}
        </div>
        <div className="project-dialog__actions">
          <a href={project.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          {project.live ? <a href={project.live} target="_blank" rel="noopener noreferrer">Live ↗</a> : null}
        </div>
      </footer>
    </div>
  )
}


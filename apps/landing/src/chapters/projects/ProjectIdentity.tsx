import type { Project } from '../../content'

/** Exact identity block shared by the live Work card and its room handoff. */
export default function ProjectIdentity({ project }: { project: Project }) {
  return (
    <>
      <div className="project-card__top">
        <span className="project-card__index">{project.index}</span>
        <span className="project-card__year">{project.year}</span>
      </div>
      <h3 className="project-card__title" data-glass-target>{project.name}</h3>
      <div className="project-card__cn">{project.cnTitle}</div>
      <div className="project-card__tagline">{project.tagline}</div>
      <p className="project-card__desc">{project.description}</p>
    </>
  )
}

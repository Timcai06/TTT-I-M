import { Fragment, lazy, Suspense, useCallback, useRef, useState } from 'react'
import { projects, type Project } from '../../content'
import SciScopeFilm from '../../components/SciScopeFilm'
import ProjectCard from './ProjectCard'
import ProjectsIntro from './ProjectsIntro'
import { useProjectsNarrative } from './useProjectsNarrative'

const ProjectCaseDialog = lazy(() => import('./ProjectCaseDialog'))

interface ActiveCaseStudy {
  project: Project
  trigger: HTMLButtonElement
  open: boolean
}

export default function Projects() {
  const root = useRef<HTMLElement>(null)
  const [activeCaseStudy, setActiveCaseStudy] = useState<ActiveCaseStudy | null>(null)
  const { laserActive, laserHandle } = useProjectsNarrative(root)
  const openCaseStudy = useCallback((project: Project, trigger: HTMLButtonElement) => {
    void import('./ProjectCaseContent')
    setActiveCaseStudy({ project, trigger, open: true })
  }, [])

  return (
    <section className="section projects container" id="projects" ref={root}>
      <ProjectsIntro laserActive={laserActive} laserHandle={laserHandle} />

      <div className="projects__list">
        {projects.map((project) => (
          <Fragment key={project.id}>
            <ProjectCard
              project={project}
              onOpenCaseStudy={openCaseStudy}
            />
            {project.id === 'sciscope' ? <SciScopeFilm /> : null}
          </Fragment>
        ))}
      </div>

      {activeCaseStudy ? (
        <Suspense fallback={<span className="project-dialog__loading" role="status">Loading case study…</span>}>
          <ProjectCaseDialog
            project={activeCaseStudy.project}
            trigger={activeCaseStudy.trigger}
            open={activeCaseStudy.open}
            onOpenChange={(open) => {
              setActiveCaseStudy((current) => current ? { ...current, open } : current)
            }}
            onOpenChangeComplete={(open) => {
              if (!open) setActiveCaseStudy(null)
            }}
          />
        </Suspense>
      ) : null}
    </section>
  )
}

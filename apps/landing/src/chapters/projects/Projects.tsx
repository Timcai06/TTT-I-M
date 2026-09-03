import { Fragment, lazy, Suspense, useCallback, useRef, useState } from 'react'
import { projects, type Project, type ProjectShot } from '../../content'
import SciScopeFilm from '../../components/SciScopeFilm'
import ProjectGlassSurface from '../../components/effects/ProjectGlassSurface'
import { requestParticlePortal } from '../../lib/particlePortal'
import { requestPointerHitTest } from '../../lib/pointerCoordinator'
import ProjectCard from './ProjectCard'
import ProjectsIntro from './ProjectsIntro'
import { useProjectsNarrative } from './useProjectsNarrative'

const loadProjectCaseDialog = () => import('./ProjectCaseDialog')
const ProjectCaseDialog = lazy(loadProjectCaseDialog)

// Projects is already a below-the-fold lazy chapter. Warm the dialog chunk at
// chapter evaluation so the particle cloud never waits on a network boundary.
void loadProjectCaseDialog()

interface ActiveCaseStudy {
  project: Project
  trigger: HTMLButtonElement
  heroShot: ProjectShot
  open: boolean
  closing: boolean
}

function projectShots(project: Project): readonly ProjectShot[] {
  if (project.caseStudies?.length) return project.caseStudies.map((study) => study.shot)
  return project.media?.shots ?? []
}

function resolveHeroShot(project: Project, source: HTMLImageElement | null): ProjectShot | null {
  const shots = projectShots(project)
  const sourcePath = source?.getAttribute('src')
  return shots.find((shot) => shot.src === sourcePath) ?? shots[0] ?? null
}

function isVisibleImage(image: HTMLImageElement | null): image is HTMLImageElement {
  if (!image?.isConnected || !image.complete || image.naturalWidth <= 0) return false
  const rect = image.getBoundingClientRect()
  return rect.width > 1
    && rect.height > 1
    && rect.right > 0
    && rect.bottom > 0
    && rect.left < window.innerWidth
    && rect.top < window.innerHeight
}

function findProjectReturnImage(root: HTMLElement | null, projectId: string): HTMLImageElement | null {
  return root?.querySelector<HTMLImageElement>(
    `[data-work-glass-surface="${projectId}"] .media-frame__img.is-active`,
  ) ?? null
}

export default function Projects() {
  const root = useRef<HTMLElement>(null)
  const [activeCaseStudy, setActiveCaseStudy] = useState<ActiveCaseStudy | null>(null)
  const [glassActive, setGlassActive] = useState(false)
  const [glassSuppressed, setGlassSuppressed] = useState(false)
  const activeGlassSurfaces = useRef(new Set<string>())
  const { laserActive, laserHandle, glassReady } = useProjectsNarrative(root, glassActive)
  const changeGlassActive = useCallback((surfaceId: string, active: boolean) => {
    const surfaces = activeGlassSurfaces.current
    if (active) surfaces.add(surfaceId)
    else surfaces.delete(surfaceId)
    setGlassActive(surfaces.size > 0)
    requestPointerHitTest()
  }, [])
  const openCaseStudy = useCallback((
    project: Project,
    trigger: HTMLButtonElement,
    sourceImage: HTMLImageElement | null,
  ) => {
    void import('./ProjectCaseContent')
    const heroShot = resolveHeroShot(project, sourceImage)
    if (!heroShot) return

    const commit = () => {
      // Keep Glass alive through the particle detach, then release it beneath
      // the cloud's densest frame as the dialog becomes the interaction owner.
      setGlassSuppressed(true)
      setActiveCaseStudy({ project, trigger, heroShot, open: true, closing: false })
    }
    if (!sourceImage) {
      commit()
      return
    }

    const accepted = requestParticlePortal({
      source: sourceImage,
      sourceContainer: sourceImage.closest<HTMLElement>('.media-frame'),
      resolveTarget: () => document.querySelector<HTMLImageElement>(
        `[data-project-dialog="${project.id}"] [data-particle-portal-target] img`,
      ),
      commit,
      mode: 'case-expand',
      label: project.name,
    })
    if (!accepted) commit()
  }, [])

  const changeCaseStudyOpen = useCallback((open: boolean) => {
    const current = activeCaseStudy
    if (!current) return
    if (open) {
      setActiveCaseStudy({ ...current, open: true, closing: false })
      return
    }
    if (current.closing) return

    const commit = () => {
      setActiveCaseStudy((latest) => latest ? { ...latest, open: false, closing: true } : latest)
    }
    const resumeGlass = () => setGlassSuppressed(false)
    const hero = document.querySelector<HTMLImageElement>(
      `[data-project-dialog="${current.project.id}"] [data-particle-portal-target] img`,
    )
    const returnImage = findProjectReturnImage(root.current, current.project.id)
    if (!hero || !isVisibleImage(returnImage)) {
      commit()
      resumeGlass()
      return
    }

    setActiveCaseStudy({ ...current, closing: true })
    const accepted = requestParticlePortal({
      source: hero,
      sourceContainer: hero.closest<HTMLElement>('[data-particle-portal-target]'),
      resolveTarget: () => findProjectReturnImage(root.current, current.project.id),
      commit,
      mode: 'case-collapse',
      label: current.project.name,
      onComplete: resumeGlass,
    })
    if (!accepted) {
      commit()
      resumeGlass()
    }
  }, [activeCaseStudy])

  return (
    <section className="section projects container" id="projects" ref={root}>
      <ProjectsIntro
        laserActive={laserActive}
        laserHandle={laserHandle}
        glassEnabled={glassReady && !glassSuppressed}
        onGlassActiveChange={changeGlassActive}
      />

      <div className="projects__list">
        {projects.map((project, index) => (
          <Fragment key={project.id}>
            <ProjectGlassSurface
              surfaceId={project.id}
              enabled={glassReady && !glassSuppressed}
              onActiveChange={changeGlassActive}
            >
              <ProjectCard
                project={project}
                alternate={index % 2 === 1}
                onOpenCaseStudy={openCaseStudy}
              />
            </ProjectGlassSurface>
            {project.id === 'sciscope' ? <SciScopeFilm /> : null}
          </Fragment>
        ))}
      </div>

      {activeCaseStudy ? (
        <Suspense fallback={<span className="project-dialog__loading" role="status">Loading case study…</span>}>
          <ProjectCaseDialog
            project={activeCaseStudy.project}
            heroShot={activeCaseStudy.heroShot}
            trigger={activeCaseStudy.trigger}
            open={activeCaseStudy.open}
            onOpenChange={changeCaseStudyOpen}
            onOpenChangeComplete={(open) => {
              if (!open) {
                setActiveCaseStudy(null)
              }
            }}
          />
        </Suspense>
      ) : null}
    </section>
  )
}

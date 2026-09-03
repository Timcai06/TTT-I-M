import { useRef, type RefObject } from 'react'
import { projects } from '../../content'
import MaskedHeading from '../../components/MaskedHeading'
import ProjectLaser from '../../components/ProjectLaser'
import ProjectGlassSurface from '../../components/effects/ProjectGlassSurface'
import type { LaserHandle } from '../../lib/canvas-ui/laser'
import ProjectsBento from './ProjectsBento'

const headingSources = projects
  .map((project) => project.media?.shots[0]?.src)
  .filter((source): source is string => Boolean(source))

interface ProjectsIntroProps {
  laserActive: boolean
  laserHandle: RefObject<LaserHandle | null>
  glassEnabled: boolean
  onGlassActiveChange: (surfaceId: string, active: boolean) => void
}

export default function ProjectsIntro({
  laserActive,
  laserHandle,
  glassEnabled,
  onGlassActiveChange,
}: ProjectsIntroProps) {
  const portalContent = useRef<HTMLDivElement>(null)

  return (
    <div className="projects__intro">
      <div className="projects__intro-sticky">
        <ProjectLaser active={laserActive} handleRef={laserHandle} captureRef={portalContent} />
        <div className="projects__intro-content" ref={portalContent} data-project-laser-target>
          <div className="projects__header">
            <div className="projects__heading-wrap">
              <div className="section__label">Work — 选作</div>
              <MaskedHeading
                className="projects__masked-heading"
                text={'Six things I made\nin 2026.'}
                sources={headingSources}
                emphasis="I made"
                fillScale={1.12}
                parallax={18}
                reveal="wipe"
                trigger="view"
              />
            </div>
            <p className="projects__header-side">
              我不想把项目写成一张技术栈清单。每个仓库里都留着输入、运行结果、
              踩过的坑和复现方法。
            </p>
          </div>
          <ProjectGlassSurface
            surfaceId="project-overview"
            variant="overview"
            enabled={glassEnabled}
            onActiveChange={onGlassActiveChange}
          >
            <ProjectsBento />
          </ProjectGlassSurface>
        </div>
      </div>
    </div>
  )
}

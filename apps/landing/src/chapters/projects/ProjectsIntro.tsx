import type { RefObject } from 'react'
import { projects } from '../../content'
import MaskedHeading from '../../components/MaskedHeading'
import ProjectLaser from '../../components/ProjectLaser'
import type { LaserHandle } from '../../lib/canvas-ui/laser'
import ProjectsBento from './ProjectsBento'

const headingSources = projects
  .map((project) => project.media?.shots[0]?.src)
  .filter((source): source is string => Boolean(source))

interface ProjectsIntroProps {
  laserActive: boolean
  laserHandle: RefObject<LaserHandle | null>
}

export default function ProjectsIntro({ laserActive, laserHandle }: ProjectsIntroProps) {
  return (
    <div className="projects__intro">
      <div className="projects__intro-sticky">
        <ProjectLaser active={laserActive} handleRef={laserHandle} />
        <div className="projects__intro-content">
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
              项目不只按技术栈排列，也按证据链展开：输入、运行、结果、失败边界和复现方式，
              都在对应的 GitHub 仓库里留下记录。
            </p>
          </div>
          <ProjectsBento />
        </div>
      </div>
    </div>
  )
}


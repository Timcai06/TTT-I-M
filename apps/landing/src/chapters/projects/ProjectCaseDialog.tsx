import { lazy, Suspense, useEffect, useMemo, type CSSProperties, type ReactElement } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import type { Project, ProjectShot } from '../../content'
import { getLenis } from '../../lib/lenis'

const ProjectCaseContent = lazy(() => import('./ProjectCaseContent'))

interface ProjectCaseDialogProps {
  project: Project
  heroShot: ProjectShot
  open: boolean
  trigger: HTMLButtonElement | null
  onOpenChange: (open: boolean) => void
  onOpenChangeComplete: (open: boolean) => void
}

export default function ProjectCaseDialog({
  project,
  heroShot,
  open,
  trigger,
  onOpenChange,
  onOpenChangeComplete,
}: ProjectCaseDialogProps): ReactElement {
  const triggerRef = useMemo(() => ({ current: trigger }), [trigger])

  useEffect(() => {
    if (!open) return
    const lenis = getLenis()
    lenis?.stop()
    document.body.dataset.projectDialogOpen = 'true'

    return () => {
      delete document.body.dataset.projectDialogOpen
      lenis?.start()
    }
  }, [open])

  return (
    <Dialog.Root
      open={open}
      modal
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="project-dialog__backdrop" />
        <Dialog.Viewport className="project-dialog__viewport">
          <Dialog.Popup
            className="project-dialog"
            finalFocus={triggerRef}
            data-project-dialog={project.id}
            style={{ '--accent': project.accent } as CSSProperties}
          >
            <div className="project-dialog__utility">
              <Dialog.Close className="project-dialog__close" aria-label="关闭项目详情" data-cursor="hover">
                <span aria-hidden="true">×</span>
              </Dialog.Close>
            </div>

            <figure
              className="project-dialog__hero"
              data-particle-portal-target
              style={{ '--hero-aspect': `${heroShot.width} / ${heroShot.height}` } as CSSProperties}
            >
              <img
                src={heroShot.src}
                alt={heroShot.alt}
                width={heroShot.width}
                height={heroShot.height}
                decoding="async"
              />
              <figcaption>{heroShot.label}</figcaption>
            </figure>

            <header className="project-dialog__header">
              <div>
                <span className="project-dialog__eyebrow">Case study · {project.index}</span>
                <Dialog.Title className="project-dialog__title">{project.name}</Dialog.Title>
                <Dialog.Description className="project-dialog__description">
                  {project.detail?.lede ?? project.tagline}
                </Dialog.Description>
              </div>
            </header>

            <Suspense fallback={<div className="project-dialog__body" role="status">Loading evidence…</div>}>
              <ProjectCaseContent project={project} heroShot={heroShot} />
            </Suspense>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

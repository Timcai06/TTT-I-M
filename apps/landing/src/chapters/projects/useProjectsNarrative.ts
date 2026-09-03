import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { attachTilt } from '../../lib/tilt'
import type { LaserHandle } from '../../lib/canvas-ui/laser'
import { LASER_CONFIG } from '../../lib/canvas-ui/laserConfig.ts'
import { prefersReducedMotion } from '../../lib/motion'
import { consumePendingWorkHandoff, WORK_HANDOFF_EVENT } from '../../lib/workHandoff'

interface ProjectsNarrative {
  laserActive: boolean
  laserHandle: RefObject<LaserHandle | null>
  glassReady: boolean
}

export function useProjectsNarrative(
  root: RefObject<HTMLElement | null>,
  glassActive: boolean,
): ProjectsNarrative {
  const laserHandle = useRef<LaserHandle | null>(null)
  const [laserActive, setLaserActive] = useState(false)
  const [glassReady, setGlassReady] = useState(true)

  useEffect(() => {
    if (!root.current) return
    const section = root.current
    const context = gsap.context(() => {
      const setRevealState = (surface: HTMLElement, revealed: boolean) => {
        surface.classList.toggle('is-visible', revealed)
        surface.querySelector<HTMLElement>('.projects__bento, .project-card')
          ?.classList.toggle('is-visible', revealed)
        surface.dispatchEvent(new Event('canvas-ui:invalidate'))
      }

      const bentoSurface = section.querySelector<HTMLElement>('.project-glass--overview')
      const bento = section.querySelector<HTMLElement>('.projects__bento')
      if (bentoSurface && bento) {
        ScrollTrigger.create({
          trigger: bento,
          start: 'top 86%',
          onEnter: () => setRevealState(bentoSurface, true),
          onEnterBack: () => setRevealState(bentoSurface, true),
          onLeaveBack: () => setRevealState(bentoSurface, false),
        })
      }

      section.querySelectorAll<HTMLElement>('.project-glass--card').forEach((surface) => {
        const card = surface.querySelector<HTMLElement>('[data-motion="project-card"]')
        if (!card) return
        ScrollTrigger.create({
          trigger: surface,
          start: 'top 85%',
          onEnter: () => setRevealState(surface, true),
          onEnterBack: () => setRevealState(surface, true),
          onLeaveBack: () => setRevealState(surface, false),
        })
        card.style.setProperty('--accent', card.dataset.accent || '#6b8fb5')
      })
      requestScrollRefresh()
    }, section)

    const onWorkHandoff = () => {
      if (!consumePendingWorkHandoff()) return
      if (prefersReducedMotion()) return
      setGlassReady(false)
      setLaserActive(true)
    }
    window.addEventListener(WORK_HANDOFF_EVENT, onWorkHandoff)
    onWorkHandoff()

    return () => {
      window.removeEventListener(WORK_HANDOFF_EVENT, onWorkHandoff)
      context.revert()
    }
  }, [root])

  useEffect(() => {
    const section = root.current
    if (!section) return
    const fineDesktop = window.matchMedia('(min-width: 769px) and (pointer: fine)')
    let disposeTilts: Array<() => void> = []
    let restoreTimer = 0
    const syncTilts = () => {
      window.clearTimeout(restoreTimer)
      disposeTilts.forEach((dispose) => dispose())
      disposeTilts = []
      if (!fineDesktop.matches || glassActive) return
      // A Glass surface handoff briefly reports inactive while the next source
      // captures its first frame. Delay Tilt restoration so two interaction
      // systems never alternate during that internal handoff.
      restoreTimer = window.setTimeout(() => {
        disposeTilts = Array.from(section.querySelectorAll<HTMLElement>('.media-frame'))
          .map((frame) => attachTilt(frame, { damp: 0.22 }))
      }, 320)
    }
    syncTilts()
    fineDesktop.addEventListener('change', syncTilts)
    return () => {
      fineDesktop.removeEventListener('change', syncTilts)
      window.clearTimeout(restoreTimer)
      disposeTilts.forEach((dispose) => dispose())
    }
  }, [glassActive, root])

  useGSAP(() => {
    if (!laserActive) return
    const intro = root.current?.querySelector<HTMLElement>('.projects__intro')
    const content = root.current?.querySelector<HTMLElement>('.projects__intro-content')
    const laser = root.current?.querySelector<HTMLElement>('.projects__laser')
    const lastPreview = root.current?.querySelector<HTMLElement>('.projects__bento .bento-glow:last-child')
    if (!intro || !content || !laser || !lastPreview) return

    intro.dataset.handoff = 'active'
    let lastScrollY = window.scrollY
    let contentDocumentTop = 0
    let contentHeight = 1
    let latestProgress = 0
    let finishing = false
    let finishTimeline: gsap.core.Timeline | null = null

    const measurePortal = () => {
      const rect = content.getBoundingClientRect()
      contentDocumentTop = rect.top + window.scrollY
      contentHeight = Math.max(rect.height, 1)
    }

    const settle = () => {
      intro.dataset.handoff = 'settled'
      // A retained clip-path would become a containing clip for the fixed Work
      // Glass output. Once the portal is complete, release that boundary before
      // handing interaction to the chapter-wide optical plane.
      content.style.removeProperty('clip-path')
      setLaserActive(false)
      setGlassReady(true)
    }

    const syncPortal = (progress = 0) => {
      if (finishing) return
      latestProgress = progress
      const beamY = window.innerHeight - LASER_CONFIG.offset
      const contentTop = contentDocumentTop - window.scrollY
      const revealed = Math.min(Math.max(beamY - contentTop, 0), contentHeight)
      const clipped = Math.max(contentHeight - revealed, 0)
      content.style.clipPath = `inset(0px 0px ${clipped}px 0px)`

      const scrollY = window.scrollY
      laserHandle.current?.setScrollActivity({
        progress,
        delta: scrollY - lastScrollY,
      })
      lastScrollY = scrollY

      // Lenis can settle a fraction of a pixel before ScrollTrigger's exact
      // end boundary. Treat the final half-percent as complete so the portal
      // closes once the sixth preview has fully crossed the seam.
      if (progress >= 0.995) finishPortal()
    }

    const finishPortal = () => {
      if (finishing) return
      finishing = true
      finishTimeline = gsap.timeline({ onComplete: settle })
        .to(content, {
          clipPath: 'inset(0px 0px 0px 0px)',
          duration: 0.42,
          ease: 'power3.out',
        })
        .to(laser, { autoAlpha: 0, duration: 0.34, ease: 'power2.out' }, 0.1)
        .call(() => laserHandle.current?.setScrollActivity({ progress: 1, delta: 0 }), [], 0.24)
    }

    gsap.set(content, { clipPath: 'inset(0px 0px 100% 0px)' })
    gsap.fromTo(
      laser,
      { autoAlpha: 0 },
      { autoAlpha: 0.96, duration: 0.22, ease: 'power2.out' },
    )
    measurePortal()
    syncPortal()

    const resizeObserver = new ResizeObserver(() => {
      measurePortal()
      syncPortal(latestProgress)
    })
    resizeObserver.observe(content)

    const portalTrigger = ScrollTrigger.create({
      trigger: intro,
      start: 'top 100%',
      endTrigger: lastPreview,
      end: () => `bottom bottom-=${LASER_CONFIG.offset}px`,
      onRefreshInit: measurePortal,
      onRefresh: (self) => syncPortal(self.progress),
      onUpdate: (self) => syncPortal(self.progress),
      onLeave: finishPortal,
      onLeaveBack: finishPortal,
    })

    return () => {
      resizeObserver.disconnect()
      portalTrigger.kill()
      finishTimeline?.kill()
      content.style.removeProperty('clip-path')
      intro.dataset.handoff = 'settled'
    }
  }, { scope: root, dependencies: [laserActive], revertOnUpdate: true })

  return { laserActive, laserHandle, glassReady }
}

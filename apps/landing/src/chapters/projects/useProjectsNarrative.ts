import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { attachTilt } from '../../lib/tilt'
import type { LaserHandle } from '../../lib/canvas-ui/laser'
import { prefersReducedMotion } from '../../lib/motion'
import { consumePendingWorkHandoff, WORK_HANDOFF_EVENT } from '../../lib/workHandoff'

interface ProjectsNarrative {
  laserActive: boolean
  laserHandle: RefObject<LaserHandle | null>
}

export function useProjectsNarrative(root: RefObject<HTMLElement | null>): ProjectsNarrative {
  const laserHandle = useRef<LaserHandle | null>(null)
  const [laserActive, setLaserActive] = useState(false)

  useEffect(() => {
    if (!root.current) return
    const section = root.current
    const context = gsap.context(() => {
      const bento = section.querySelector<HTMLElement>('.projects__bento')
      if (bento) {
        ScrollTrigger.create({
          trigger: bento,
          start: 'top 86%',
          onEnter: () => bento.classList.add('is-visible'),
          onLeaveBack: () => bento.classList.remove('is-visible'),
        })
      }

      section.querySelectorAll<HTMLElement>('[data-motion="project-card"]').forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          onEnter: () => card.classList.add('is-visible'),
          onLeaveBack: () => card.classList.remove('is-visible'),
        })
        card.style.setProperty('--accent', card.dataset.accent || '#6b8fb5')
      })
      requestScrollRefresh()
    }, section)

    const fineDesktop = window.matchMedia('(min-width: 769px) and (pointer: fine)')
    let disposeTilts: Array<() => void> = []
    const syncTilts = () => {
      disposeTilts.forEach((dispose) => dispose())
      disposeTilts = []
      if (!fineDesktop.matches) return
      disposeTilts = Array.from(section.querySelectorAll<HTMLElement>('.media-frame'))
        .map((frame) => attachTilt(frame, { damp: 0.22 }))
    }
    syncTilts()
    fineDesktop.addEventListener('change', syncTilts)

    const onWorkHandoff = () => {
      if (!consumePendingWorkHandoff()) return
      if (!prefersReducedMotion()) setLaserActive(true)
    }
    window.addEventListener(WORK_HANDOFF_EVENT, onWorkHandoff)
    onWorkHandoff()

    return () => {
      window.removeEventListener(WORK_HANDOFF_EVENT, onWorkHandoff)
      fineDesktop.removeEventListener('change', syncTilts)
      disposeTilts.forEach((dispose) => dispose())
      context.revert()
    }
  }, [root])

  useGSAP(() => {
    if (!laserActive) return
    const intro = root.current?.querySelector<HTMLElement>('.projects__intro')
    const content = root.current?.querySelector<HTMLElement>('.projects__intro-content')
    const laser = root.current?.querySelector<HTMLElement>('.projects__laser')
    if (!intro || !content || !laser) return

    intro.dataset.handoff = 'active'
    laserHandle.current?.setScrollActivity({ progress: 0.5, delta: 0.06 })
    const settle = () => {
      intro.dataset.handoff = 'settled'
      setLaserActive(false)
    }
    const timeline = gsap.timeline()
      .fromTo(
        content,
        { autoAlpha: 0.14, y: 58, clipPath: 'inset(49% 0 49% 0)' },
        { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0 0% 0)', duration: 1.08, ease: 'power3.out' },
        0.08,
      )
      .fromTo(
        laser,
        { autoAlpha: 0, scaleX: 0.08, yPercent: 24 },
        { autoAlpha: 0.86, scaleX: 1, yPercent: 0, duration: 0.32, ease: 'power3.out' },
        0,
      )
      .to(laser, { autoAlpha: 0, yPercent: -22, duration: 0.52, ease: 'power2.in' }, 0.62)
      .call(() => laserHandle.current?.setScrollActivity({ progress: 1, delta: 0 }), [], 0.82)
      .call(settle, [], 1.45)

    return () => {
      timeline.kill()
      intro.dataset.handoff = 'settled'
    }
  }, { scope: root, dependencies: [laserActive], revertOnUpdate: true })

  return { laserActive, laserHandle }
}


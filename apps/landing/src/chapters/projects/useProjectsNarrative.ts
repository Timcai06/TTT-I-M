import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { attachTilt } from '../../lib/tilt'
import type { LaserHandle } from '../../lib/canvas-ui/laser'
import {
  normalizeLocalEffectState,
  type LocalEffectState,
} from '../../lib/canvas-ui/localEffectControl'
import { useReducedMotion } from '../../lib/motion'
import {
  canRunLocalEffect,
  observeLocalEffectEligibility,
} from '../../components/effects/localEffectEligibility'

interface ProjectsNarrative {
  laserActive: boolean
  laserHandle: RefObject<LaserHandle | null>
  laserState: RefObject<LocalEffectState>
  glassReady: boolean
}

export function useProjectsNarrative(
  root: RefObject<HTMLElement | null>,
  glassActive: boolean,
): ProjectsNarrative {
  const laserHandle = useRef<LaserHandle | null>(null)
  const laserState = useRef<LocalEffectState>({ progress: 0, delta: 0 })
  const reducedMotion = useReducedMotion()
  const [laserActive, setLaserActive] = useState(false)

  useEffect(() => {
    if (!root.current) return
    const section = root.current
    const intro = section.querySelector<HTMLElement>('.projects__intro')
    let inRange = false
    let lastScrollY = window.scrollY
    const syncLaserEligibility = () => {
      setLaserActive(!reducedMotion && inRange && canRunLocalEffect(section, 'projects'))
    }
    const updateLaser = (progress: number) => {
      const scrollY = window.scrollY
      const next = normalizeLocalEffectState({
        progress,
        delta: scrollY - lastScrollY,
      })
      lastScrollY = scrollY
      laserState.current = next
      try {
        laserHandle.current?.setScrollActivity(next)
      } catch {
        setLaserActive(false)
      }
    }
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
      if (intro) {
        ScrollTrigger.create({
          trigger: intro,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            inRange = self.isActive
            syncLaserEligibility()
          },
          onRefresh: (self) => {
            inRange = self.isActive
            updateLaser(self.progress)
            syncLaserEligibility()
          },
          onUpdate: (self) => updateLaser(self.progress),
        })
      }
      requestScrollRefresh()
    }, section)
    const stopObservingEligibility = observeLocalEffectEligibility(
      section,
      'projects',
      syncLaserEligibility,
    )

    return () => {
      stopObservingEligibility()
      context.revert()
    }
  }, [reducedMotion, root])

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

  return { laserActive, laserHandle, laserState, glassReady: true }
}

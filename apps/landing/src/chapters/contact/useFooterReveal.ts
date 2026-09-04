import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from '../../lib/gsap'
import { useReducedMotion } from '../../lib/motion'
import { useMobileExperience } from '../../lib/device'
import type { FooterLiquidController } from '../../components/FooterLiquidCursor'

interface FooterRevealResult {
  clockRef: RefObject<HTMLTimeElement | null>
  liquidRef: RefObject<FooterLiquidController | null>
  root: RefObject<HTMLElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  wrapRef: RefObject<HTMLDivElement | null>
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function setFooterCursorState(active: boolean): void {
  document.querySelector('.cursor')?.classList.toggle('is-over-footer', active)
}

/** Owns Contact's scroll reveal, full-viewport liquid gate, and local clock. */
export function useFooterReveal(): FooterRevealResult {
  const root = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLTimeElement>(null)
  const liquidRef = useRef<FooterLiquidController | null>(null)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()

  useEffect(() => {
    const rootEl = root.current
    const svgEl = svgRef.current
    const wrapEl = wrapRef.current
    if (!rootEl || !svgEl || !wrapEl) return

    const animated = !reducedMotion && !mobileExperience
    const aura = svgEl.querySelector<SVGCircleElement>('[data-iris-aura]')
    const core = svgEl.querySelector<SVGCircleElement>('[data-iris-core]')
    const rim = svgEl.querySelector<SVGCircleElement>('[data-iris-rim]')
    const satellites = Array.from(svgEl.querySelectorAll<SVGCircleElement>('[data-iris-sat]'))
    const iris = { progress: 0 }
    let viewportWidth = window.innerWidth
    let viewportHeight = window.innerHeight

    const sizeSvg = () => {
      viewportWidth = window.innerWidth
      viewportHeight = window.innerHeight
      svgEl.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`)
    }

    const renderIris = () => {
      if (!core || !rim) return
      const originX = viewportWidth * 0.86
      const originY = viewportHeight * 1.02
      const maximumRadius = Math.hypot(
        Math.max(originX, viewportWidth - originX),
        Math.max(originY, viewportHeight - originY),
      ) * 1.08
      const progress = clamp01(iris.progress)
      const radius = progress * maximumRadius
      const phase = progress * 8

      if (aura) {
        aura.setAttribute('cx', `${originX}`)
        aura.setAttribute('cy', `${originY}`)
        aura.setAttribute('r', `${Math.max(0, radius - 2)}`)
        aura.style.opacity = `${clamp01(progress * 2.7) * (1 - clamp01((progress - 0.92) / 0.08)) * 0.78}`
      }
      core.setAttribute('cx', `${originX}`)
      core.setAttribute('cy', `${originY}`)
      core.setAttribute('r', `${radius}`)
      satellites.forEach((satellite, index) => {
        const angle = phase * 0.5 + (index * Math.PI * 2) / Math.max(1, satellites.length)
        const orbit = radius * 0.84
        satellite.setAttribute('cx', `${originX + Math.cos(angle) * orbit}`)
        satellite.setAttribute('cy', `${originY + Math.sin(angle) * orbit}`)
        satellite.setAttribute('r', `${Math.max(0, radius * (0.14 + 0.05 * Math.sin(phase + index)))}`)
      })
      rim.setAttribute('cx', `${originX}`)
      rim.setAttribute('cy', `${originY}`)
      rim.setAttribute('r', `${Math.max(0, radius - 1)}`)
      rim.style.opacity = `${clamp01(progress * 3) * (1 - clamp01((progress - 0.88) / 0.12)) * 0.82}`
    }

    if (animated) {
      rootEl.classList.add('is-iris-reveal')
      sizeSvg()
      renderIris()
    }

    const updateVisibility = (progress = 0) => {
      const rect = rootEl.getBoundingClientRect()
      const isNearContact = rect.top <= window.innerHeight * 1.02 && rect.bottom >= 0
      if (animated && window.location.hash === '#contact' && isNearContact) {
        iris.progress = 1
        renderIris()
      }
      gsap.set(wrapEl, { autoAlpha: isNearContact && progress > 0.001 ? 1 : 0 })
      const liquidActive = animated && isNearContact && progress > 0.88
      liquidRef.current?.setActive(liquidActive)
      setFooterCursorState(liquidActive)
    }

    let directContactFrame = 0
    let directContactTimer = 0
    const context = gsap.context(() => {
      gsap.set('.footer__kicker', { opacity: 0, y: 15 })
      gsap.set('.footer__title .split-line__inner', { yPercent: 110, skewY: 6 })
      gsap.set('.contact__btn', { opacity: 0 })
      gsap.set('.footer__meta', { opacity: 0 })
      gsap.set(wrapEl, { autoAlpha: 0 })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootEl,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: (self) => updateVisibility(self.progress),
          onUpdate: (self) => updateVisibility(self.progress),
          onLeaveBack: () => updateVisibility(0),
        },
      })

      if (animated) {
        timeline.to(iris, { progress: 1, duration: 0.6, ease: 'none', onUpdate: renderIris }, 0)
      }
      timeline.to('.footer__inner', { opacity: 1, duration: 0.1, ease: 'none' }, 0.18)
      timeline.to('.footer__kicker', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.18)
      timeline.to('.footer__title .split-line__inner', { yPercent: 0, skewY: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.22)
      timeline.to('.contact__btn', { opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)
      timeline.to('.footer__meta', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.45)

      const settleDirectContact = () => {
        if (window.location.hash !== '#contact') return
        const rect = rootEl.getBoundingClientRect()
        if (rect.top > window.innerHeight || rect.bottom < 0) return
        timeline.progress(1)
        if (animated) {
          iris.progress = 1
          renderIris()
        }
        updateVisibility(1)
      }
      directContactFrame = window.requestAnimationFrame(settleDirectContact)
      directContactTimer = window.setTimeout(settleDirectContact, 700)
    }, root)

    const onResize = () => {
      if (!animated) return
      sizeSvg()
      renderIris()
    }
    window.addEventListener('resize', onResize)

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const updateClock = () => {
      if (clockRef.current) clockRef.current.textContent = formatter.format(new Date())
    }
    updateClock()
    const clockId = window.setInterval(updateClock, 30000)

    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(directContactFrame)
      window.clearTimeout(directContactTimer)
      window.clearInterval(clockId)
      rootEl.classList.remove('is-iris-reveal')
      setFooterCursorState(false)
      context.revert()
    }
  }, [mobileExperience, reducedMotion])

  return { clockRef, liquidRef, root, svgRef, wrapRef }
}

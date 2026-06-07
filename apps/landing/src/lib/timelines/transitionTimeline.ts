import { gsap } from '../gsap'

export interface TransitionTimelineCallbacks {
  onRevealTarget: () => void
  onLand: () => void
  onComplete: () => void
}

export function createTransitionTimeline(
  root: HTMLElement,
  _rail: HTMLElement | null,
  cb: TransitionTimelineCallbacks,
): gsap.core.Timeline {
  const topShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--top')
  const bottomShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--bottom')
  const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
  const grain = root.querySelector<HTMLElement>('.chapter-transition__grain')
  const index = root.querySelector<HTMLElement>('.chapter-transition__target-index')

  gsap.set(root, { autoAlpha: 1, pointerEvents: 'auto' })
  gsap.set(topShutter, { yPercent: -100 })
  gsap.set(bottomShutter, { yPercent: 100 })
  gsap.set(grain, { opacity: 0 })
  gsap.set(targetChars, { opacity: 0, filter: 'blur(8px)', scale: 1.05 })
  gsap.set(index, { opacity: 0, y: 10 })

  const tl = gsap.timeline({ onComplete: cb.onComplete })

  // 1. 0 - 0.35s: Shutters slam shut (extended from 0.25)
  tl.to([topShutter, bottomShutter], {
    yPercent: 0,
    duration: 0.35,
    ease: 'expo.inOut'
  }, 0)

  // 2. 0.20 - 0.50s: Grain and text flash in
  tl.to(grain, { opacity: 1, duration: 0.15 }, 0.2)
  tl.to(index, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.2)
  tl.to(targetChars, {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    duration: 0.25,
    stagger: 0.02,
    ease: 'power3.out'
  }, 0.2)
  .call(cb.onRevealTarget, undefined, 0.25)

  // 3. 0.55s: The Landing Moment (Hold the black screen slightly longer)
  tl.call(cb.onLand, undefined, 0.55)

  // 4. 0.65 - 1.05s: Shutters snap open (extended from 0.3)
  tl.to(topShutter, {
    yPercent: -100,
    duration: 0.4,
    ease: 'expo.inOut'
  }, 0.65)
  tl.to(bottomShutter, {
    yPercent: 100,
    duration: 0.4,
    ease: 'expo.inOut'
  }, 0.65)
  
  // 5. Fade out text and grain as shutters open
  tl.to([index, ...targetChars], {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  }, 0.65)
  tl.to(grain, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.inOut'
  }, 0.65)

  return tl
}

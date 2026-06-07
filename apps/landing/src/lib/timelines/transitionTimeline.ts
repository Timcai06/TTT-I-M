import { gsap } from '../gsap'

export interface TransitionTimelineCallbacks {
  onRevealTarget: () => void
  onLand: () => void
  onComplete: () => void
}

export function createTransitionTimeline(
  root: HTMLElement,
  rail: HTMLElement | null,
  cb: TransitionTimelineCallbacks,
): gsap.core.Timeline {
  const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item'))
  const itemChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item-char'))
  const topShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--top')
  const bottomShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--bottom')
  const targetName = root.querySelector<HTMLElement>('.chapter-transition__target-name')
  const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
  const grain = root.querySelector<HTMLElement>('.chapter-transition__grain')
  const index = root.querySelector<HTMLElement>('.chapter-transition__target-index')
  const chrome = root.querySelector<HTMLElement>('.chapter-transition__chrome')
  const caption = root.querySelector<HTMLElement>('.chapter-transition__caption')
  const grid = root.querySelector<HTMLElement>('.chapter-transition__grid')
  const field = root.querySelector<HTMLElement>('.chapter-transition__field')

  gsap.set(root, { autoAlpha: 1, pointerEvents: 'auto' })
  gsap.set(topShutter, { yPercent: -100 })
  gsap.set(bottomShutter, { yPercent: 100 })
  gsap.set([grain, grid, field], { opacity: 0 })
  gsap.set([chrome, caption], { opacity: 0, y: 10 })
  gsap.set(items, { opacity: 0.62, y: 16 })
  gsap.set(itemChars, { yPercent: 96, opacity: 0, skewY: 4 })
  gsap.set(targetChars, {
    opacity: 0,
    filter: 'blur(8px)',
    scale: 1.05,
    clipPath: 'inset(-20% 100% -20% -20%)',
  })
  gsap.set(targetName, { textShadow: 'none', x: 0 })
  gsap.set(index, { opacity: 0, y: 10 })
  gsap.set(rail, { opacity: 1, scaleX: 0, transformOrigin: 'left center' })

  const tl = gsap.timeline({ onComplete: cb.onComplete })

  // 1. 0 - 0.35s: Shutters cover the current chapter. The page itself is not
  // transformed here; ScrollTrigger and image visibility depend on stable layout.
  tl.to([topShutter, bottomShutter], {
    yPercent: 0,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0)

  // 2. 0.16 - 0.52s: Grain, metadata, and chapter rows reveal inside the cover.
  tl.to([grid, field], { opacity: 1, duration: 0.24, ease: 'power2.out' }, 0.12)
  tl.to([chrome, caption], { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }, 0.16)
  tl.to(grain, { opacity: 1, duration: 0.15 }, 0.2)
  tl.to(index, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.2)
  tl.to(targetChars, {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    clipPath: 'inset(-20% -20% -20% -20%)',
    duration: 0.3,
    stagger: 0.02,
    ease: 'power3.out',
  }, 0.2)
    .call(cb.onRevealTarget, undefined, 0.25)
  tl.to(items, { opacity: 1, y: 0, duration: 0.32, stagger: 0.025, ease: 'power3.out' }, 0.24)
  tl.to(itemChars, { yPercent: 0, opacity: 1, skewY: 0, duration: 0.32, stagger: 0.006, ease: 'expo.out' }, 0.26)
  tl.to(rail, { scaleX: 1, duration: 0.52, ease: 'power3.inOut' }, 0.22)

  // 3. 0.45s - 0.65s: Chromatic Aberration Flash right before/during the land
  tl.to(targetName, {
    textShadow: '-5px 0px 0px rgba(255, 0, 0, 0.8), 5px 0px 0px rgba(0, 255, 255, 0.8)',
    x: -2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 0.45)
  tl.to(targetName, {
    textShadow: '3px 0px 0px rgba(255, 0, 0, 0.5), -3px 0px 0px rgba(0, 255, 255, 0.5)',
    x: 2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 0.5)
  tl.to(targetName, {
    textShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
    x: 0,
    duration: 0.1,
    ease: 'power2.out',
  }, 0.55)

  // 4. 0.50s: The Landing Moment (Black screen hold)
  tl.call(cb.onLand, undefined, 0.5)

  // 5. 0.65 - 1.00s: Shutters snap open & background pulls focus back
  tl.to(topShutter, {
    yPercent: -100,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0.65)
  tl.to(bottomShutter, {
    yPercent: 100,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0.65)

  // 6. Fade out text and grain as shutters open
  tl.to([index, chrome, caption, ...targetChars, ...items], {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
  }, 0.65)
  tl.to([grain, grid, field], {
    opacity: 0,
    duration: 0.35,
    ease: 'power2.inOut',
  }, 0.65)
  tl.to(rail, { opacity: 0, duration: 0.25, ease: 'power2.inOut' }, 0.72)

  return tl
}

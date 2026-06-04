import { gsap } from '../gsap'

export interface TransitionTimelineCallbacks {
  /** Mid-transition: the target name has landed — enable its Pretext interaction. */
  onRevealTarget: () => void
  /** Apex: jump to the target chapter and re-sync ScrollTrigger. */
  onLand: () => void
  /** Timeline finished — overlay can clear. */
  onComplete: () => void
}

/**
 * The signature chapter-jump transition.
 *
 * Gathers its own elements from `root`, sets their initial states and returns a
 * running timeline. Pure presentation — every side effect (component state,
 * scroll, ScrollTrigger refresh, arrival dispatch) is injected as a callback so
 * the conductor in ChapterTransition owns them. Extracted from the component so
 * the 50-line timeline isn't tangled with the transition state machine.
 */
export function createTransitionTimeline(
  root: HTMLElement,
  rail: HTMLElement | null,
  cb: TransitionTimelineCallbacks,
): gsap.core.Timeline {
  const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item'))
  const itemChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item-char'))
  const activeItem = root.querySelector<HTMLElement>('.chapter-transition__item.is-target')
  const caption = root.querySelector<HTMLElement>('.chapter-transition__caption')
  const targetText = root.querySelector<HTMLElement>('.chapter-transition__target')
  const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
  const grid = root.querySelector<HTMLElement>('.chapter-transition__grid')
  const field = root.querySelector<HTMLElement>('.chapter-transition__field')

  gsap.set(root, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1, pointerEvents: 'auto' })
  gsap.set(items, { opacity: 1 })
  gsap.set(itemChars, { yPercent: 96, opacity: 0, skewY: 4 })
  gsap.set(targetChars, { filter: 'blur(10px)', opacity: 0, rotate: 2, scale: 1.08, yPercent: 38 })
  gsap.set([caption, targetText], { y: 18, opacity: 0 })
  gsap.set([grid, field], { opacity: 0 })
  gsap.set(rail, { scaleX: 0, transformOrigin: 'left center' })

  return gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: cb.onComplete })
    .to(root, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.34 })
    .to({}, { duration: 0.1 })
    .to([grid, field], { opacity: 1, duration: 0.78, ease: 'power2.out' }, '<')
    .to(itemChars, {
      yPercent: 0,
      opacity: 1,
      skewY: 0,
      duration: 0.74,
      stagger: 0.01,
    }, '<0.12')
    .to([caption, targetText], { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, '<0.22')
    .to(targetChars, {
      filter: 'blur(0px)',
      yPercent: 0,
      opacity: 1,
      rotate: 0,
      scale: 1,
      duration: 0.92,
      stagger: 0.028,
      ease: 'expo.out',
    }, '<0.05')
    .to(rail, { scaleX: 1, duration: 0.72, ease: 'power2.inOut' }, '<0.08')
    .call(cb.onRevealTarget)
    .to(activeItem, { x: 12, duration: 0.32, ease: 'power2.out' }, '>-0.02')
    .call(cb.onLand)
    .to(activeItem, { x: 0, duration: 0.22, ease: 'power2.in' })
    .to(itemChars, {
      yPercent: -86,
      opacity: 0,
      skewY: -3,
      duration: 0.38,
      stagger: 0.01,
      ease: 'power3.in',
    }, '+=0.12')
    .to(targetChars, { filter: 'blur(7px)', yPercent: -58, opacity: 0, duration: 0.36, stagger: 0.012, ease: 'power3.in' }, '<')
    .to([caption, targetText], { y: -14, opacity: 0, duration: 0.32, ease: 'power2.in' }, '<')
    .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.52 }, '<0.1')
}

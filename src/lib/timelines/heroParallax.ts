import { gsap } from '../gsap'

/**
 * Hero title parallax: as the hero scrolls away, the two name lines split apart
 * (left/right), shrink and fade. Scrub-driven, transform/opacity only.
 *
 * Call this *inside* a `gsap.context(() => …, root)` — the tweens it creates are
 * captured by that context, so the caller owns teardown. Lives here (not in App)
 * so App no longer reaches into Hero's internal `.hero__split` DOM.
 */
export function createHeroParallax(root: HTMLElement): void {
  const inner = gsap.utils.toArray<HTMLElement>('.hero__split .split-line__inner')
  if (inner.length < 2) return
  const [firstLine, secondLine] = inner
  if (!firstLine || !secondLine) return

  gsap.to(firstLine, {
    xPercent: -45,
    scale: 0.75,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      start: 'bottom bottom',
      end: 'bottom top',
      scrub: 1.5,
    },
  })

  gsap.to(secondLine, {
    xPercent: 45,
    scale: 0.75,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      start: 'bottom bottom',
      end: 'bottom top',
      scrub: 1.5,
    },
  })
}

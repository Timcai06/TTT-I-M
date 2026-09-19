import type { StoryPosition } from '../../core/narrative/types.ts'

/** Stateless so reverse scrolling and direct chapter seeks have identical light. */
export function signalGradeAt({ segment, progress }: StoryPosition): number {
  const ramp = (start: number, end: number) => {
    const t = Math.min(1, Math.max(0, (progress - start) / (end - start)))
    return t * t * (3 - 2 * t)
  }
  if (segment === 'frame-stack') return .4 * ramp(.4, .9)
  if (segment === 'stack-reading') return .4
  if (segment === 'stack-work') return .4 + .2 * ramp(.05, .7)
  if (segment === 'work-reading' || segment === 'work-contact' || segment === 'contact-reading') return .6
  return 0
}

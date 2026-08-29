export type NarrativePhase = {
  id: string
  enter: number
  exit: number
}

export type NarrativeGate = {
  progress: number
  release: 'explicit-cta'
}

/**
 * Stable, data-only contract for a scroll chapter.
 *
 * DOM measurement and GSAP ownership stay in the chapter controller; this
 * object only centralises the authored narrative geometry that CSS, motion and
 * tests must agree on.
 */
export interface NarrativeSpec {
  chapter: string
  desktopHeight?: string
  mobileHeight?: string
  phases?: readonly NarrativePhase[]
  gate?: NarrativeGate
}

function assertProgress(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`)
  }
}

export function defineNarrativeSpec<const Spec extends NarrativeSpec>(spec: Spec): Readonly<Spec> {
  if (!spec.chapter.trim()) throw new TypeError('Narrative chapter must not be empty.')

  spec.phases?.forEach((phase, index) => {
    assertProgress(phase.enter, `${spec.chapter}.phases[${index}].enter`)
    assertProgress(phase.exit, `${spec.chapter}.phases[${index}].exit`)
    if (phase.enter >= phase.exit) {
      throw new RangeError(`${spec.chapter}.phases[${index}] must enter before it exits.`)
    }
  })
  if (spec.gate) assertProgress(spec.gate.progress, `${spec.chapter}.gate.progress`)

  return Object.freeze({
    ...spec,
    phases: spec.phases ? Object.freeze([...spec.phases]) : undefined,
    gate: spec.gate ? Object.freeze({ ...spec.gate }) : undefined,
  })
}

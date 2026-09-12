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

export type SampleSegment =
  | 'index'
  | 'entry'
  | 'about-reading'
  | 'about-life'
  | 'life-reading'
  | 'life-frame'
  | 'frame-reading'
  | 'frame-stack'
  | 'stack-reading'
  | 'stack-work'
  | 'work-reading'
  | 'work-contact'
  | 'contact-reading'

export type StoryChapter = 'about' | 'life' | 'frame' | 'stack' | 'work' | 'contact'
export type StoryView = 'home' | 'about' | 'life' | 'frame' | 'stack' | 'work' | 'contact'
export type StoryReadingOwner = 'index' | 'about' | 'life' | 'frame' | 'skills' | 'projects' | 'contact'
export type ReadingSurface = 'StackReading' | 'AboutReading' | 'LifeReading' | 'FrameReading' | 'WorkReading' | 'ContactReading'

export interface StoryPosition {
  readonly segment: SampleSegment
  readonly progress: number
}

export interface SampleInput {
  readonly position: StoryPosition
  readonly storyVersion: string
  readonly contentVersion: string
}

export type PhotoPlacement =
  | Readonly<{ kind: 'life' }>
  | Readonly<{ kind: 'life-to-frame'; progress: number }>
  | Readonly<{ kind: 'frame-wall' }>

export interface SemanticWorld {
  readonly notebook: Readonly<{ openness: number }>
  readonly envelope: Readonly<{ openness: number }>
  readonly photo: Readonly<{
    contentId: 'life-football-action'
    extraction: number
    placement: PhotoPlacement
  }>
  readonly wallPrints: Readonly<{ settling: number }>
  readonly cabinet: Readonly<{ drawerOpenness: number; folderLift: number }>
  readonly screen: Readonly<{ mode: 'inactive' | 'photo'; contentId?: 'frame-final-horizon' }>
}

export type CameraIntent =
  | Readonly<{
      mode: 'index'
      /**
       * 0 = the opening shot, tight on the monitor and square to it. 1 = the wide
       * room shot the entry flight departs from.
       *
       * This replaces `inspection`, which was a click-driven camera owner running
       * beside the story clock. The pull-back makes the same move part of the
       * scroll, so scrolling back to the top *is* the enlarged Index.
       */
      pullback: number
    }>
  | Readonly<{
      mode: 'surface-fit'
      targetView: StoryView
      targetSurface: ReadingSurface
    }>
  | Readonly<{
      mode: 'handoff'
      sourceView: StoryView
      targetView: StoryView
      sourceSurface: ReadingSurface
      targetSurface: ReadingSurface
      travel: number
      leave: number
      align: number
      dolly: number
      /**
       * A bounded push toward the destination that runs *during* a segment's own
       * beat, separate from `dolly`, which only closes the arrival. about-life needs
       * the camera to move in while the print is leaving the envelope, and the
       * shared dolly cannot be brought forward for it: the Life envelope sits in a
       * corridor between the desk and the shelf above, and every attempt put the
       * camera into one or the other.
       */
      inspect: number
      /**
       * Vestigial. The rig derived its lateral bow from this and from five
       * hand-typed per-segment constants; both were replaced by a lift derived
       * from the measured horizontal run, so archiveCameraRig no longer reads it.
       * Still sampled and recorded in diagnostics. Do not tune it expecting the
       * camera to respond.
       */
      arc: number
    }>

export interface PresentationIntent {
  readonly sourceSurface: ReadingSurface | null
  readonly targetSurface: ReadingSurface
  readonly sourceReveal: number
  readonly sourceExpand: number
  readonly targetReveal: number
  readonly targetExpand: number
  readonly readingOwner: StoryReadingOwner | null
  readonly roomHitEnabled: boolean
  readonly focusEnabled: boolean
  readonly aperture: number
}

export interface StoryFrame {
  readonly position: StoryPosition
  readonly storyVersion: string
  readonly contentVersion: string
  readonly world: SemanticWorld
  readonly camera: CameraIntent
  readonly presentation: PresentationIntent
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

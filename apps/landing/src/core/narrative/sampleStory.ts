import { PERSONAL_ARCHIVE_SAMPLE_STORY } from './specs.ts'
import type {
  CameraIntent,
  PhotoPlacement,
  PresentationIntent,
  ReadingSurface,
  SampleInput,
  SampleSegment,
  SemanticWorld,
  StoryReadingOwner,
  StoryFrame,
  StoryView,
} from './types.ts'

type ProgressRange = Readonly<{ start: number; end: number }>

const segmentSet: ReadonlySet<string> = new Set(PERSONAL_ARCHIVE_SAMPLE_STORY.segments)
const baseAperture = 0.000025

function phase(progress: number, range: ProgressRange): number {
  const t = Math.max(0, Math.min(1, (progress - range.start) / (range.end - range.start)))
  return t * t * (3 - 2 * t)
}

function assertInput(input: SampleInput): void {
  if (!segmentSet.has(input.position.segment)) {
    throw new TypeError(`Unknown sample story segment: ${String(input.position.segment)}`)
  }
  if (!Number.isFinite(input.position.progress) || input.position.progress < 0 || input.position.progress > 1) {
    throw new RangeError('Story progress must be finite and between 0 and 1.')
  }
  if (input.storyVersion !== PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion) {
    throw new TypeError(`Unsupported story version: ${input.storyVersion}`)
  }
  if (input.contentVersion !== PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion) {
    throw new TypeError(`Unsupported content version: ${input.contentVersion}`)
  }
  if (input.user && (!Number.isFinite(input.user.indexInspection) || input.user.indexInspection < 0 || input.user.indexInspection > 1)) {
    throw new RangeError('Index inspection must be finite and between 0 and 1.')
  }
}

function chapterForReading(segment: SampleSegment): StoryReadingOwner | null {
  if (segment === 'index') return 'index'
  if (segment === 'about-reading') return 'about'
  if (segment === 'life-reading') return 'life'
  if (segment === 'frame-reading') return 'frame'
  if (segment === 'stack-reading') return 'skills'
  if (segment === 'work-reading') return 'projects'
  if (segment === 'contact-reading') return 'contact'
  return null
}

function surfaceForChapter(chapter: StoryReadingOwner): ReadingSurface {
  if (chapter === 'index' || chapter === 'skills') return 'StackReading'
  if (chapter === 'about') return 'AboutReading'
  if (chapter === 'life') return 'LifeReading'
  if (chapter === 'frame') return 'FrameReading'
  if (chapter === 'projects') return 'WorkReading'
  return 'ContactReading'
}

function handoffForSegment(segment: SampleSegment): Readonly<{
  sourceView: StoryView
  targetView: StoryView
  sourceOwner: StoryReadingOwner
  targetOwner: StoryReadingOwner
}> | null {
  if (segment === 'entry') return { sourceView: 'home', targetView: 'about', sourceOwner: 'index', targetOwner: 'about' }
  if (segment === 'about-life') return { sourceView: 'about', targetView: 'life', sourceOwner: 'about', targetOwner: 'life' }
  if (segment === 'life-frame') return { sourceView: 'life', targetView: 'frame', sourceOwner: 'life', targetOwner: 'frame' }
  if (segment === 'frame-stack') return { sourceView: 'frame', targetView: 'stack', sourceOwner: 'frame', targetOwner: 'skills' }
  if (segment === 'stack-work') return { sourceView: 'stack', targetView: 'work', sourceOwner: 'skills', targetOwner: 'projects' }
  if (segment === 'work-contact') return { sourceView: 'work', targetView: 'contact', sourceOwner: 'projects', targetOwner: 'contact' }
  return null
}

function samplePlacement(segment: SampleSegment, progress: number): PhotoPlacement {
  if (segment === 'index' || segment === 'entry' || segment === 'about-reading' || segment === 'about-life' || segment === 'life-reading') return Object.freeze({ kind: 'life' })
  if (segment === 'frame-reading') return Object.freeze({ kind: 'frame-wall' })
  if (segment !== 'life-frame') return Object.freeze({ kind: 'frame-wall' })

  const transfer = phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.travel)
  if (transfer === 0) return Object.freeze({ kind: 'life' })
  if (transfer === 1) return Object.freeze({ kind: 'frame-wall' })
  return Object.freeze({ kind: 'life-to-frame', progress: transfer })
}

function sampleWorld(segment: SampleSegment, progress: number): SemanticWorld {
  const order = PERSONAL_ARCHIVE_SAMPLE_STORY.segments.indexOf(segment)
  const extraction = order < PERSONAL_ARCHIVE_SAMPLE_STORY.segments.indexOf('about-life') ? 0
    : segment === 'about-life' ? phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.extraction) : 1
  const settling = order < PERSONAL_ARCHIVE_SAMPLE_STORY.segments.indexOf('life-frame') ? 0
    : segment === 'life-frame' ? phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.travel) : 1
  const notebook = segment === 'index' ? 0 : segment === 'entry' ? phase(progress, { start: .22, end: .48 }) : 1
  const drawer = segment === 'stack-work' ? phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.drawerOpen)
    : segment === 'work-reading' ? 1
      : segment === 'work-contact' ? 1 - .65 * phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.drawerClose)
        : segment === 'contact-reading' ? .35 : 0
  const folder = segment === 'stack-work' ? phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.folderOpen)
    : segment === 'work-reading' ? 1
      : segment === 'work-contact' ? 1 - phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.folderClose)
        : 0
  const screenPhoto = order > PERSONAL_ARCHIVE_SAMPLE_STORY.segments.indexOf('frame-stack')
    || (segment === 'frame-stack' && phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.frameSignal) > 0)

  return Object.freeze({
    notebook: Object.freeze({ openness: notebook }),
    envelope: Object.freeze({ openness: extraction }),
    photo: Object.freeze({
      contentId: 'life-football-action',
      extraction,
      placement: samplePlacement(segment, progress),
    }),
    wallPrints: Object.freeze({ settling }),
    cabinet: Object.freeze({ drawerOpenness: drawer, folderLift: folder }),
    screen: Object.freeze({ mode: screenPhoto ? 'photo' : 'inactive', contentId: 'frame-final-horizon' }),
  })
}

function sampleCamera(segment: SampleSegment, progress: number, inspection: number): CameraIntent {
  if (segment === 'index') return Object.freeze({ mode: 'index', inspection })
  const readingChapter = chapterForReading(segment)
  if (readingChapter) {
    return Object.freeze({
      mode: 'surface-fit',
      targetView: readingChapter === 'index' ? 'home' : readingChapter === 'skills' ? 'stack' : readingChapter === 'projects' ? 'work' : readingChapter === 'contact' ? 'contact' : readingChapter,
      targetSurface: surfaceForChapter(readingChapter),
    })
  }

  const handoff = handoffForSegment(segment)!
  const travel = phase(progress, segment === 'entry' ? PERSONAL_ARCHIVE_SAMPLE_STORY.timing.entryCamera
    : segment === 'about-life' ? PERSONAL_ARCHIVE_SAMPLE_STORY.timing.aboutLifeCamera
      : PERSONAL_ARCHIVE_SAMPLE_STORY.timing.travel)
  const align = phase(progress, segment === 'entry' ? PERSONAL_ARCHIVE_SAMPLE_STORY.timing.entryAlign : PERSONAL_ARCHIVE_SAMPLE_STORY.timing.align)
  const arc = travel === 0 || travel === 1 ? 0 : Math.sin(Math.PI * travel) * (1 - align)
  return Object.freeze({
    mode: 'handoff',
    sourceView: handoff.sourceView,
    targetView: handoff.targetView,
    sourceSurface: surfaceForChapter(handoff.sourceOwner),
    targetSurface: surfaceForChapter(handoff.targetOwner),
    travel,
    leave: 1 - phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.sourceLeave),
    align,
    dolly: phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.dolly),
    arc,
  })
}

function samplePresentation(segment: SampleSegment, progress: number, inspection: number): PresentationIntent {
  if (segment === 'index') return Object.freeze({
    // targetExpand carries the click-to-enlarge. At 0 the Index sits projected on
    // the physical monitor; at 1 the same projection has opened to an unwarped
    // full-viewport rectangle. Nothing about the room camera changes.
    sourceSurface:null,targetSurface:'StackReading',sourceReveal:0,sourceExpand:0,targetReveal:1,targetExpand:inspection,
    readingOwner:'index',roomHitEnabled:false,focusEnabled:inspection < .5,aperture:baseAperture * (1 - inspection),
  })
  const readingChapter = chapterForReading(segment)
  if (readingChapter) {
    return Object.freeze({
      sourceSurface: null,
      targetSurface: surfaceForChapter(readingChapter),
      sourceReveal: 0,
      sourceExpand: 0,
      targetReveal: 1,
      targetExpand: 1,
      readingOwner: readingChapter,
      roomHitEnabled: false,
      focusEnabled: false,
      aperture: 0,
    })
  }

  const handoff = handoffForSegment(segment)!
  const targetExpand = phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.targetExpand)
  const sourceReveal = segment === 'entry' ? 1 - phase(progress, { start: .36, end: .56 }) : 1 - phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.sourceFade)
  return Object.freeze({
    sourceSurface: surfaceForChapter(handoff.sourceOwner),
    targetSurface: surfaceForChapter(handoff.targetOwner),
    sourceReveal,
    // Hold, do not retract. At handoff progress 0 the camera sits on the source
    // surface fit, and fit() is defined so that surface exactly fills the viewport
    // — which is also what expand 1 projects the page onto. The two are registered
    // pixel for pixel, so the page does not need to move at all: it dissolves and
    // the physical sheet it was printed on is already underneath, in place.
    // Retracting it geometrically made an already-dismissed page fly back on
    // screen and shrink away, which had no narrative reason to happen.
    // Entry keeps 0: there the source really is the Index living on the monitor.
    // 1 while the sheet is still on screen, so it holds its full-viewport
    // registration and only dissolves; 0 once it has fully faded, which keeps the
    // authored boundary equivalence with the reading segment that follows.
    sourceExpand: segment === 'entry' ? 0 : sourceReveal > 0 ? 1 : 0,
    targetReveal: phase(progress, PERSONAL_ARCHIVE_SAMPLE_STORY.timing.targetReveal),
    targetExpand,
    readingOwner: progress === 1 ? handoff.targetOwner : null,
    roomHitEnabled: progress < 1,
    focusEnabled: targetExpand < 0.8,
    aperture: baseAperture * (1 - targetExpand),
  })
}

/**
 * Samples a complete, history-independent semantic frame for the first story
 * slice. Scene bindings resolve these intentions to concrete assets later.
 */
export function sampleStory(input: SampleInput): Readonly<StoryFrame> {
  assertInput(input)
  const progress = input.position.progress === 0 ? 0 : input.position.progress
  const position = Object.freeze({ segment: input.position.segment, progress })

  return Object.freeze({
    position,
    storyVersion: input.storyVersion,
    contentVersion: input.contentVersion,
    world: sampleWorld(position.segment, position.progress),
    camera: sampleCamera(position.segment, position.progress, input.user?.indexInspection ?? 0),
    presentation: samplePresentation(position.segment, position.progress, input.user?.indexInspection ?? 0),
  })
}

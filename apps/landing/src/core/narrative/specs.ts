import { defineNarrativeSpec } from './types.ts'

export const WORK_TRANSITION_NARRATIVE = defineNarrativeSpec({
  chapter: 'work-transition',
  desktopHeight: '680svh',
  mobileHeight: '300svh',
  phases: [
    { id: 'potential', enter: 0.02, exit: 0.26 },
    { id: 'system', enter: 0.32, exit: 0.57 },
    { id: 'proof', enter: 0.7, exit: 0.91 },
  ],
  gate: {
    progress: 0.985,
    release: 'explicit-cta',
  },
} as const)

export const narrativeSpecs = [WORK_TRANSITION_NARRATIVE] as const

const progressRange = (start: number, end: number) => Object.freeze({ start, end })

/**
 * Authored data for the first semantic story slice. It intentionally stays
 * outside narrativeSpecs because these segments are not navigation chapters.
 */
export const PERSONAL_ARCHIVE_SAMPLE_STORY = Object.freeze({
  storyVersion: 'personal-archive-story-v1',
  contentVersion: 'personal-archive-content-v1',
  segments: Object.freeze([
    'index',
    'entry',
    'about-reading',
    'about-life',
    'life-reading',
    'life-frame',
    'frame-reading',
    'frame-stack',
    'stack-reading',
    'stack-work',
    'work-reading',
    'work-contact',
    'contact-reading',
  ] as const),
  timing: Object.freeze({
    sourceRetract: progressRange(0, 0.18),
    sourceLeave: progressRange(0.08, 0.32),
    sourceFade: progressRange(0.18, 0.36),
    // Staged, not overlapped. Extraction used to run .2-.6 while the shared camera
    // travel ran .18-.64, so the print left the envelope during the exact stretch
    // the camera was leaving - the one thing worth watching happened while the shot
    // was moving. It now begins after the About sheet has finished dissolving
    // (sourceFade ends at .36) and completes before the about-life camera starts.
    extraction: progressRange(0.38, 0.60),
    /** about-life holds until the print has cleared the envelope, then travels. */
    aboutLifeCamera: progressRange(0.60, 0.90),
    travel: progressRange(0.18, 0.64),
    align: progressRange(0.5, 0.8),
    targetReveal: progressRange(0.58, 0.82),
    dolly: progressRange(0.62, 0.9),
    targetExpand: progressRange(0.82, 1),
    entryCamera: progressRange(0.06, 0.64),
    entryAlign: progressRange(0.5, 0.86),
    frameSignal: progressRange(0.03, 0.61),
    drawerOpen: progressRange(0.14, 0.52),
    folderOpen: progressRange(0.38, 0.73),
    drawerClose: progressRange(0.08, 0.56),
    folderClose: progressRange(0.08, 0.5),
  }),
})

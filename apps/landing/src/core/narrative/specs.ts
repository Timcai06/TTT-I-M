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
    // The print leaves the envelope, and the envelope is at LifeReading — 0.645m
    // from the About notebook the camera starts on, which frames a 0.25x0.314m
    // surface edge to edge. Staging extraction BEFORE the camera moved therefore
    // played the whole beat off screen. The order has to be: cross, push in along
    // the view axis, then watch it come out at reading distance.
    extraction: progressRange(0.34, 0.58),
    /** about-life crosses to the envelope once the About sheet has dissolved (.36). */
    /** The Z push onto the envelope, so the extraction happens at reading distance. */
    travel: progressRange(0.18, 0.64),
    align: progressRange(0.5, 0.8),
    targetReveal: progressRange(0.58, 0.82),
    dolly: progressRange(0.62, 0.9),
    targetExpand: progressRange(0.82, 1),
    /**
     * The entry flight now starts at 0. The .06 lead-in was authored when the
     * entry bridge was 740svh, where it bought a held beat worth .44 screens;
     * at 380svh it is .17 screens of stillness sitting directly after the index
     * pull-back, which already ends on a held room shot. Two beats in a row is
     * the pause the reader complained about, so the flight picks up where the
     * pull-back sets down.
     */
    entryCamera: progressRange(0, 0.64),
    entryAlign: progressRange(0.5, 0.86),
    /**
     * The opening pull-back: the visit starts tight on the monitor and the first
     * scroll backs the camera out until the whole room is in frame.
     *
     * It ends at .75 rather than 1 so the last quarter of the index segment is a
     * held room shot - "this is a room" needs a moment to land before the About
     * flight takes the frame.
     */
    indexPullback: progressRange(0, 0.75),
    frameSignal: progressRange(0.03, 0.61),
    drawerOpen: progressRange(0.14, 0.52),
    folderOpen: progressRange(0.38, 0.73),
    drawerClose: progressRange(0.08, 0.56),
    folderClose: progressRange(0.08, 0.5),
  }),
})

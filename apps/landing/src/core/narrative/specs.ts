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

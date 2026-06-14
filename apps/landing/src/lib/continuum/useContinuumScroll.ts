import { useMemo } from 'react'
import { progressChapters } from '../../chapters/registry.ts'
import { useLandingScrollNarrative } from '../useLandingScrollNarrative.ts'
import { resolveContinuumScrollState, type ContinuumScrollState } from './continuumScrollState'

const sections = progressChapters.map((chapter) => ({ id: chapter.id }))
const fallbackId = sections[0]?.id ?? 'hero'

export function useContinuumScroll(): ContinuumScrollState {
  const narrative = useLandingScrollNarrative(sections, fallbackId)

  return useMemo(() => resolveContinuumScrollState(narrative), [narrative])
}

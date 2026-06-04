import { createContext, useContext } from 'react'

export interface ChapterState {
  activeId: string
}

export const ChapterStateContext = createContext<ChapterState | null>(null)

export function useChapterState(): ChapterState {
  const state = useContext(ChapterStateContext)

  if (!state) {
    throw new Error('useChapterState must be used inside ChapterStateProvider')
  }

  return state
}

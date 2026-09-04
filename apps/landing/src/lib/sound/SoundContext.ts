import { createContext, useContext } from 'react'

export type SoundCue = 'entry' | 'query' | 'evidence' | 'synthesis'

export interface SoundContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  playSegment: (cue: SoundCue) => void
  stopActive: () => void
  enterFilmMode: (video: HTMLVideoElement) => Promise<void>
  exitFilmMode: (video?: HTMLVideoElement | null) => void
}

export const SoundContext = createContext<SoundContextValue | null>(null)

export function useSound(): SoundContextValue {
  const value = useContext(SoundContext)
  if (!value) throw new Error('useSound must be used inside SoundProvider')
  return value
}

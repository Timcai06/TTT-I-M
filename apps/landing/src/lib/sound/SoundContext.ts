import { createContext, useContext } from 'react'

export type SoundCue = 'entry' | 'query' | 'evidence' | 'synthesis'
/** The room's continuous bed. Driven by the camera's distance to the opening --
 *  the window is the only hole in the room, so it is the only thing to hear. */
export type AmbienceLayer = 'window'

export interface SoundContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  playSegment: (cue: SoundCue) => void
  stopActive: () => void
  /** Level for one ambience bed, 0-1, glided rather than stepped. */
  setAmbienceLevel: (layer: AmbienceLayer, level: number) => void
  enterFilmMode: (video: HTMLVideoElement) => Promise<void>
  exitFilmMode: (video?: HTMLVideoElement | null) => void
}

export const SoundContext = createContext<SoundContextValue | null>(null)

export function useSound(): SoundContextValue {
  const value = useContext(SoundContext)
  if (!value) throw new Error('useSound must be used inside SoundProvider')
  return value
}

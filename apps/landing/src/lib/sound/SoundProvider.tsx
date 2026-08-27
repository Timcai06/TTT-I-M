/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type SoundCue = 'entry' | 'query' | 'evidence' | 'synthesis'

type Segment = { offset: number; duration: number }

const SEGMENTS: Record<SoundCue, Segment> = {
  entry: { offset: 0, duration: 4.5 },
  query: { offset: 5, duration: 7 },
  evidence: { offset: 12, duration: 5 },
  synthesis: { offset: 22, duration: 8 },
}

const STORAGE_KEY = 'tim-portfolio-sound'
const SOUNDTRACK_URL = '/projects/sciscope/sciscope-soundtrack.mp3'
const FADE_SECONDS = 0.18
const MASTER_GAIN = 0.28

function readStoredPreference() {
  return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'on'
}

type ActiveSource = {
  cue: SoundCue
  source: AudioBufferSourceNode
  gain: GainNode
}

interface SoundContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  playSegment: (cue: SoundCue) => void
  stopActive: () => void
  enterFilmMode: (video: HTMLVideoElement) => Promise<void>
  exitFilmMode: (video?: HTMLVideoElement | null) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readStoredPreference)
  const enabledRef = useRef(enabled)
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const bufferPromiseRef = useRef<Promise<AudioBuffer> | null>(null)
  const activeRef = useRef<ActiveSource | null>(null)
  const requestedCueRef = useRef<SoundCue | null>(null)
  const lastCueRequestAtRef = useRef(0)
  const filmModeRef = useRef(false)
  const filmRef = useRef<HTMLVideoElement | null>(null)

  const ensureContext = useCallback(() => {
    if (contextRef.current) return contextRef.current
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return null
    const context = new AudioContextClass()
    const master = context.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(context.destination)
    contextRef.current = context
    masterRef.current = master
    return context
  }, [])

  const activateContext = useCallback(async () => {
    const context = ensureContext()
    if (!context) return null
    if (context.state !== 'running') {
      try {
        await context.resume()
      } catch {
        return null
      }
    }
    return context
  }, [ensureContext])

  const ensureBuffer = useCallback(async () => {
    if (bufferRef.current) return bufferRef.current
    if (bufferPromiseRef.current) return bufferPromiseRef.current
    const context = ensureContext()
    if (!context) throw new Error('Web Audio is unavailable')
    bufferPromiseRef.current = fetch(SOUNDTRACK_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Soundtrack request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        bufferRef.current = buffer
        return buffer
      })
      .catch((error) => {
        bufferPromiseRef.current = null
        throw error
      })
    return bufferPromiseRef.current
  }, [ensureContext])

  const fadeActive = useCallback(() => {
    const active = activeRef.current
    const context = contextRef.current
    if (!active || !context) return
    activeRef.current = null
    const now = context.currentTime
    active.gain.gain.cancelScheduledValues(now)
    active.gain.gain.setValueAtTime(active.gain.gain.value, now)
    active.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
    try {
      active.source.stop(now + FADE_SECONDS + 0.01)
    } catch {
      // The source may already have completed its segment.
    }
  }, [])

  const stopActive = useCallback(() => {
    requestedCueRef.current = null
    fadeActive()
  }, [fadeActive])

  const playSegment = useCallback((cue: SoundCue) => {
    if (!enabledRef.current || filmModeRef.current || document.visibilityState === 'hidden') return
    if (activeRef.current?.cue === cue || requestedCueRef.current === cue) return
    const now = performance.now()
    if (now - lastCueRequestAtRef.current < 260) return
    lastCueRequestAtRef.current = now
    requestedCueRef.current = cue
    fadeActive()

    void Promise.all([activateContext(), ensureBuffer()])
      .then(([context, buffer]) => {
        if (!context || context.state !== 'running') return
        if (!enabledRef.current || filmModeRef.current || requestedCueRef.current !== cue) return
        const segment = SEGMENTS[cue]
        const source = context.createBufferSource()
        const gain = context.createGain()
        source.buffer = buffer
        gain.gain.setValueAtTime(0, context.currentTime)
        gain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SECONDS)
        source.connect(gain)
        gain.connect(masterRef.current ?? context.destination)
        activeRef.current = { cue, source, gain }
        source.addEventListener('ended', () => {
          if (activeRef.current?.source === source) activeRef.current = null
        }, { once: true })
        source.start(0, segment.offset, segment.duration)
      })
      .catch(() => {
        if (requestedCueRef.current === cue) requestedCueRef.current = null
      })
  }, [activateContext, ensureBuffer, fadeActive])

  const setEnabled = useCallback((next: boolean) => {
    enabledRef.current = next
    setEnabledState(next)
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    if (!next) {
      filmRef.current?.pause()
      stopActive()
      return
    }
    void activateContext()
    void ensureBuffer().catch(() => undefined)
  }, [activateContext, ensureBuffer, stopActive])

  const enterFilmMode = useCallback(async (video: HTMLVideoElement) => {
    filmModeRef.current = true
    filmRef.current = video
    stopActive()
    video.muted = !enabledRef.current
    video.volume = 0.8
    try {
      await video.play()
    } catch {
      // Native controls remain available if autoplay is rejected.
    }
  }, [stopActive])

  const exitFilmMode = useCallback((video?: HTMLVideoElement | null) => {
    const target = video ?? filmRef.current
    target?.pause()
    filmRef.current = null
    filmModeRef.current = false
    requestedCueRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled) return
    const unlock = () => {
      void activateContext()
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [activateContext, enabled])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        filmRef.current?.pause()
        stopActive()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stopActive])

  useEffect(() => () => {
    filmRef.current?.pause()
    fadeActive()
    void contextRef.current?.close()
  }, [fadeActive])

  const value = useMemo<SoundContextValue>(() => ({
    enabled,
    setEnabled,
    playSegment,
    stopActive,
    enterFilmMode,
    exitFilmMode,
  }), [enabled, enterFilmMode, exitFilmMode, playSegment, setEnabled, stopActive])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound(): SoundContextValue {
  const value = useContext(SoundContext)
  if (!value) throw new Error('useSound must be used inside SoundProvider')
  return value
}

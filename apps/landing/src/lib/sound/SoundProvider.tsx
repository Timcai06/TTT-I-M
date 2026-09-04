import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  SoundContext,
  type SoundContextValue,
  type SoundCue,
} from './SoundContext'

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
const SOUNDTRACK_TIMEOUT_MS = 12_000

function readStoredPreference() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

type ActiveSource = {
  cue: SoundCue
  source: AudioBufferSourceNode
  gain: GainNode
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readStoredPreference)
  const enabledRef = useRef(enabled)
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const bufferPromiseRef = useRef<Promise<AudioBuffer> | null>(null)
  const bufferAbortRef = useRef<AbortController | null>(null)
  const bufferGenerationRef = useRef(0)
  const activeRef = useRef<ActiveSource | null>(null)
  const requestedCueRef = useRef<SoundCue | null>(null)
  const lastCueRequestAtRef = useRef(0)
  const filmModeRef = useRef(false)
  const filmRef = useRef<HTMLVideoElement | null>(null)

  const ensureContext = useCallback(() => {
    if (contextRef.current) return contextRef.current
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return null
    try {
      const context = new AudioContextClass()
      const master = context.createGain()
      master.gain.value = MASTER_GAIN
      master.connect(context.destination)
      contextRef.current = context
      masterRef.current = master
      return context
    } catch {
      return null
    }
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
    const controller = new AbortController()
    const generation = ++bufferGenerationRef.current
    const timeout = window.setTimeout(() => {
      controller.abort(new Error(`Soundtrack request timed out after ${SOUNDTRACK_TIMEOUT_MS}ms`))
    }, SOUNDTRACK_TIMEOUT_MS)
    bufferAbortRef.current = controller
    const request = fetch(SOUNDTRACK_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Soundtrack request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (bufferAbortRef.current === controller) bufferAbortRef.current = null
      })
      .then((data) => {
        if (controller.signal.aborted || generation !== bufferGenerationRef.current) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Soundtrack request was superseded')
        }
        return context.decodeAudioData(data)
      })
      .then((buffer) => {
        if (controller.signal.aborted || generation !== bufferGenerationRef.current) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Soundtrack decode completed after cancellation')
        }
        bufferRef.current = buffer
        return buffer
      })
      .catch((error) => {
        if (bufferPromiseRef.current === request) bufferPromiseRef.current = null
        throw error
      })
    bufferPromiseRef.current = request
    return request
  }, [ensureContext])

  const cancelBufferRequest = useCallback((reason: string) => {
    bufferGenerationRef.current += 1
    bufferAbortRef.current?.abort(new Error(reason))
    bufferAbortRef.current = null
    bufferPromiseRef.current = null
  }, [])

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

  const disposeActive = useCallback(() => {
    const active = activeRef.current
    activeRef.current = null
    if (!active) return
    try {
      active.source.stop()
    } catch {
      // The source may already have ended.
    }
    try {
      active.source.disconnect()
      active.gain.disconnect()
    } catch {
      // Nodes can already be detached by their ended handler.
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
        let source: AudioBufferSourceNode | null = null
        let gain: GainNode | null = null
        try {
          source = context.createBufferSource()
          gain = context.createGain()
          source.buffer = buffer
          gain.gain.setValueAtTime(0, context.currentTime)
          gain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SECONDS)
          source.connect(gain)
          gain.connect(masterRef.current ?? context.destination)
          const activeSource = source
          const activeGain = gain
          source.addEventListener('ended', () => {
            if (activeRef.current?.source === activeSource) activeRef.current = null
            try {
              activeSource.disconnect()
              activeGain.disconnect()
            } catch {
              // Immediate visibility/unmount cleanup may have detached them first.
            }
          }, { once: true })
          source.start(0, segment.offset, segment.duration)
          activeRef.current = { cue, source, gain }
        } catch (error) {
          try {
            source?.disconnect()
            gain?.disconnect()
          } catch {
            // Partially constructed nodes may not have reached a connected state.
          }
          throw error
        }
      })
      .catch(() => {
        // Sound is progressive enhancement; the visible experience stays usable.
      })
      .finally(() => {
        if (requestedCueRef.current === cue) requestedCueRef.current = null
      })
  }, [activateContext, ensureBuffer, fadeActive])

  const setEnabled = useCallback((next: boolean) => {
    enabledRef.current = next
    setEnabledState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Storage can be disabled by privacy policy; sound still works for this visit.
    }
    if (!next) {
      cancelBufferRequest('Sound disabled before soundtrack loading completed')
      filmRef.current?.pause()
      stopActive()
      return
    }
    void activateContext()
    void ensureBuffer().catch(() => undefined)
  }, [activateContext, cancelBufferRequest, ensureBuffer, stopActive])

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
        requestedCueRef.current = null
        disposeActive()
        void contextRef.current?.suspend().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [disposeActive])

  useEffect(() => () => {
    cancelBufferRequest('Sound provider unmounted')
    filmRef.current?.pause()
    disposeActive()
    const master = masterRef.current
    masterRef.current = null
    try {
      master?.disconnect()
    } catch {
      // The AudioContext may already have detached its destination graph.
    }
    bufferRef.current = null
    bufferPromiseRef.current = null
    const context = contextRef.current
    contextRef.current = null
    if (context) void context.close().catch(() => undefined)
  }, [cancelBufferRequest, disposeActive])

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

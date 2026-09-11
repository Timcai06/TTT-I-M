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
  type AmbienceLayer,
  type SoundContextValue,
  type SoundCue,
} from './SoundContext'
import { ROOM_AUDIO, getPreparedRoomAudio, type RoomAudioName } from '../resources/mediaCache'

/**
 * One cue is one recording now, not a window into a longer one.
 *
 * `SEGMENTS` used to map these four names to byte offsets into
 * sciscope-soundtrack.mp3, so every chapter arrival dropped the reader into the
 * middle of a product film's score. The arc the names describe is unchanged —
 * arrival, looking, evidence, the closing statement — but it is told in the room's
 * own materials: a page turned, pages flicked through, a drawer pulled open, the
 * book shut. See `../resources/mediaCache` for where the files come from.
 */
const CUE_AUDIO: Record<SoundCue, RoomAudioName> = {
  entry: 'entry',
  query: 'query',
  evidence: 'evidence',
  synthesis: 'synthesis',
}

const STORAGE_KEY = 'tim-portfolio-sound'
const FADE_SECONDS = 0.18
const MASTER_GAIN = 0.28
const SOUNDTRACK_TIMEOUT_MS = 12_000
/** Where the bed sits when the camera is nowhere near the window. The outside is
 *  never shut out -- a room with an opening still has an outside from its far
 *  wall -- so the bed rides between this and 1 rather than between 0 and 1. It is
 *  on its own bus so film mode can duck the room with a single ramp. */
const AMBIENCE_FLOOR = 0.34
const AMBIENCE_FADE_SECONDS = 3.5
/** Long enough that a scroll never steps the window level audibly, short enough
 *  that arriving at the window still feels like arriving. */
const AMBIENCE_TRACK_SECONDS = 0.45

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

type Bed = { source: AudioBufferSourceNode; gain: GainNode }

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readStoredPreference)
  const enabledRef = useRef(enabled)
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const ambienceBusRef = useRef<GainNode | null>(null)
  const bedsRef = useRef(new Map<AmbienceLayer, Bed>())
  const ambienceStartedRef = useRef(false)
  const buffersRef = useRef(new Map<RoomAudioName, AudioBuffer>())
  const bufferPromisesRef = useRef(new Map<RoomAudioName, Promise<AudioBuffer>>())
  const bufferAbortRef = useRef(new Map<RoomAudioName, AbortController>())
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
      // The beds hang off the master rather than off a second AudioContext of their
      // own — which is what the synthesised wind used to do, and why muting the site
      // left it running. One toggle now governs everything the page can make.
      const ambience = context.createGain()
      ambience.gain.value = 1
      ambience.connect(master)
      contextRef.current = context
      masterRef.current = master
      ambienceBusRef.current = ambience
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

  const ensureBuffer = useCallback(async (name: RoomAudioName) => {
    const cached = buffersRef.current.get(name)
    if (cached) return cached
    const prepared = getPreparedRoomAudio(name)
    if (prepared) { buffersRef.current.set(name, prepared); return prepared }
    const pending = bufferPromisesRef.current.get(name)
    if (pending) return pending
    const context = ensureContext()
    if (!context) throw new Error('Web Audio is unavailable')
    const controller = new AbortController()
    const generation = ++bufferGenerationRef.current
    const timeout = window.setTimeout(() => {
      controller.abort(new Error(`Room audio request timed out after ${SOUNDTRACK_TIMEOUT_MS}ms`))
    }, SOUNDTRACK_TIMEOUT_MS)
    bufferAbortRef.current.set(name, controller)
    const request = fetch(ROOM_AUDIO[name], { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Room audio request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (bufferAbortRef.current.get(name) === controller) bufferAbortRef.current.delete(name)
      })
      .then((data) => {
        if (controller.signal.aborted || generation !== bufferGenerationRef.current) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Room audio request was superseded')
        }
        return context.decodeAudioData(data)
      })
      .then((buffer) => {
        if (controller.signal.aborted) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('Room audio decode completed after cancellation')
        }
        buffersRef.current.set(name, buffer)
        return buffer
      })
      .catch((error) => {
        if (bufferPromisesRef.current.get(name) === request) bufferPromisesRef.current.delete(name)
        throw error
      })
    bufferPromisesRef.current.set(name, request)
    return request
  }, [ensureContext])

  const cancelBufferRequest = useCallback((reason: string) => {
    bufferGenerationRef.current += 1
    for (const controller of bufferAbortRef.current.values()) controller.abort(new Error(reason))
    bufferAbortRef.current.clear()
    bufferPromisesRef.current.clear()
  }, [])

  const stopBeds = useCallback((fade: number) => {
    ambienceStartedRef.current = false
    const context = contextRef.current
    const beds = bedsRef.current
    bedsRef.current = new Map()
    if (!context) return
    const end = context.currentTime
    for (const bed of beds.values()) {
      bed.gain.gain.cancelScheduledValues(end)
      bed.gain.gain.setValueAtTime(bed.gain.gain.value, end)
      bed.gain.gain.linearRampToValueAtTime(0, end + fade)
      window.setTimeout(() => {
        try { bed.source.stop() } catch { /* the bed may already have been stopped */ }
        try { bed.source.disconnect(); bed.gain.disconnect() } catch { /* already detached */ }
      }, fade * 1000 + 80)
    }
  }, [])

  /**
   * Both beds loop for the whole visit. They are seamless by construction — each
   * file's tail is equal-power crossfaded into its own head — so `loop` needs no
   * loopStart/loopEnd window, and the MP3s decode to an exact sample count.
   */
  const startBeds = useCallback(async () => {
    if (ambienceStartedRef.current) return
    ambienceStartedRef.current = true
    const context = await activateContext()
    const bus = ambienceBusRef.current
    if (!context || !bus || !enabledRef.current) { ambienceStartedRef.current = false; return }
    const layer: AmbienceLayer = 'window'
    try {
      const buffer = await ensureBuffer(layer)
      if (!enabledRef.current || !ambienceStartedRef.current || bedsRef.current.has(layer)) return
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      source.loop = true
      // Arrive at the floor, then let the camera take it from there. Opening from
      // silence made turning sound on feel like nothing had happened.
      gain.gain.setValueAtTime(0, context.currentTime)
      gain.gain.linearRampToValueAtTime(AMBIENCE_FLOOR, context.currentTime + AMBIENCE_FADE_SECONDS)
      source.connect(gain)
      gain.connect(bus)
      try { source.start() } catch { /* a re-entrant start is not fatal */ }
      bedsRef.current.set(layer, { source, gain })
    } catch {
      // No bed is a quieter room, not a broken one.
    }
  }, [activateContext, ensureBuffer])

  /**
   * Called from the archive's frame loop via RoomAmbience. Uses setTargetAtTime so
   * a value that moves every frame produces one smooth glide rather than a stair.
   */
  const setAmbienceLevel = useCallback((layer: AmbienceLayer, level: number) => {
    const context = contextRef.current
    const bed = bedsRef.current.get(layer)
    if (!context || !bed) return
    const clamped = level < AMBIENCE_FLOOR ? AMBIENCE_FLOOR : level > 1 ? 1 : level
    bed.gain.gain.setTargetAtTime(clamped, context.currentTime, AMBIENCE_TRACK_SECONDS)
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

    void Promise.all([activateContext(), ensureBuffer(CUE_AUDIO[cue])])
      .then(([context, buffer]) => {
        if (!context || context.state !== 'running') return
        if (!enabledRef.current || filmModeRef.current || requestedCueRef.current !== cue) return
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
          // The whole file: a cue is one recorded event, so there is no window to
          // pick out of it any more.
          source.start()
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
      cancelBufferRequest('Sound disabled before room audio loading completed')
      filmRef.current?.pause()
      stopActive()
      stopBeds(0.4)
      return
    }
    void activateContext()
    void startBeds()
  }, [activateContext, cancelBufferRequest, startBeds, stopActive, stopBeds])

  const enterFilmMode = useCallback(async (video: HTMLVideoElement) => {
    filmModeRef.current = true
    filmRef.current = video
    stopActive()
    // Duck the room rather than tear it down: the film is a panel inside the room,
    // and the beds have to be there again the moment it closes.
    const context = contextRef.current
    const bus = ambienceBusRef.current
    if (context && bus) {
      bus.gain.cancelScheduledValues(context.currentTime)
      bus.gain.setTargetAtTime(0, context.currentTime, 0.25)
    }
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
    const context = contextRef.current
    const bus = ambienceBusRef.current
    if (context && bus) {
      bus.gain.cancelScheduledValues(context.currentTime)
      bus.gain.setTargetAtTime(1, context.currentTime, 0.6)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void startBeds()
    const unlock = () => {
      void activateContext().then(() => startBeds())
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [activateContext, enabled, startBeds])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        filmRef.current?.pause()
        requestedCueRef.current = null
        disposeActive()
        // The beds are left connected: suspending the context stops them without
        // losing their loop position, and resuming is what the reader expects when
        // they come back to the tab.
        void contextRef.current?.suspend().catch(() => undefined)
      } else if (enabledRef.current && !filmModeRef.current) {
        void contextRef.current?.resume().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [disposeActive])

  useEffect(() => () => {
    cancelBufferRequest('Sound provider unmounted')
    filmRef.current?.pause()
    disposeActive()
    stopBeds(0)
    const master = masterRef.current
    const ambience = ambienceBusRef.current
    masterRef.current = null
    ambienceBusRef.current = null
    try {
      ambience?.disconnect()
      master?.disconnect()
    } catch {
      // The AudioContext may already have detached its destination graph.
    }
    buffersRef.current.clear()
    bufferPromisesRef.current.clear()
    const context = contextRef.current
    contextRef.current = null
    if (context) void context.close().catch(() => undefined)
  }, [cancelBufferRequest, disposeActive, stopBeds])

  const value = useMemo<SoundContextValue>(() => ({
    enabled,
    setEnabled,
    playSegment,
    stopActive,
    setAmbienceLevel,
    enterFilmMode,
    exitFilmMode,
  }), [enabled, enterFilmMode, exitFilmMode, playSegment, setAmbienceLevel, setEnabled, stopActive])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

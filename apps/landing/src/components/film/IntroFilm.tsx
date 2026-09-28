import { useEffect, useRef, useState } from 'react'
import { isMobileExperience } from '../../lib/device'
import { dispatchIntroExit } from '../../lib/intro'
import { finishIntroFilm, registerFilmPlayer } from '../../lib/introFilm'
import { getStage, setStage } from '../../lib/stage'
import { useSound } from '../../lib/sound/SoundContext'

/**
 * The darkroom film between the loader and the page (art/intro-film, tools/intro_film).
 *
 * It downloads at low priority into a blob while the loader runs and only offers
 * itself to the loader once the whole file is here and decodable. A film that is
 * not ready, not wanted, or fails simply isn't registered, and the loader hands
 * off to the page exactly as it always has.
 *
 * It lives under /projects/ for the long-cache header in vercel.json.
 */
export const INTRO_FILM_URL = '/projects/film/darkroom.mp4'
/** The film's last second holds on the portrait; the page starts coming up under it. */
const HANDOFF_LEAD = 1.0
const FADE_MS = 900
const SKIP_FADE_MS = 520
/** Wheel travel that reads as "take me to the site". */
const SKIP_WHEEL = 160

type Phase = 'idle' | 'playing' | 'leaving' | 'done'

function filmWanted() {
  if (typeof window === 'undefined') return false
  const param = new URLSearchParams(window.location.search).get('film')
  if (param === 'off') return false
  if (param === 'on') return true
  // Automation measures the page, not the film.
  if (navigator.webdriver) return false
  // A deep link came for one chapter.
  if (window.location.hash.replace('#', '')) return false
  // Desktop only for now: the film is composed for a landscape screen.
  if (isMobileExperience()) return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function IntroFilm() {
  const { enterFilmMode, exitFilmMode } = useSound()
  const sound = useRef({ enterFilmMode, exitFilmMode })
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const skipRef = useRef<() => void>(() => {})

  useEffect(() => {
    sound.current = { enterFilmMode, exitFilmMode }
  }, [enterFilmMode, exitFilmMode])

  // Once the film has handed over, its blob has nothing left to do.
  useEffect(() => {
    if (phase === 'done' && src) URL.revokeObjectURL(src)
  }, [phase, src])

  // Fetch the whole film at low priority: the loader's own resources come first.
  useEffect(() => {
    if (!filmWanted()) return
    const controller = new AbortController()
    let url: string | null = null
    void (async () => {
      try {
        const response = await fetch(INTRO_FILM_URL, { signal: controller.signal, priority: 'low' })
        if (!response.ok) return
        const blob = await response.blob()
        if (controller.signal.aborted) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      } catch {
        // No film this visit; the loader never hears of it.
      }
    })()
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!src || !video) return

    let raf = 0
    let fadeTimer = 0
    let handedOff = false
    let wheel = 0
    let unregister = () => {}

    const set = (next: Phase) => {
      phaseRef.current = next
      setPhase(next)
    }

    const teardown = () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(fadeTimer)
      removeInput()
      video.pause()
      sound.current.exitFilmMode(video)
      set('done')
      finishIntroFilm()
    }

    // The page comes up underneath (the Hero's entrance plays on the live stage)
    // while the film's held last frame fades away over it.
    const handOff = (fadeMs: number) => {
      if (handedOff) return
      handedOff = true
      if (getStage() === 'film') dispatchIntroExit()
      set('leaving')
      const startVolume = video.volume
      const started = performance.now()
      const fadeAudio = () => {
        const k = Math.min(1, (performance.now() - started) / fadeMs)
        video.volume = startVolume * (1 - k)
        if (k < 1) raf = window.requestAnimationFrame(fadeAudio)
      }
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(fadeAudio)
      fadeTimer = window.setTimeout(teardown, fadeMs)
    }

    const watchEnd = () => {
      if (phaseRef.current !== 'playing') return
      if (video.duration && video.currentTime >= video.duration - HANDOFF_LEAD) {
        handOff(FADE_MS)
        return
      }
      raf = window.requestAnimationFrame(watchEnd)
    }

    const skip = () => {
      if (phaseRef.current === 'playing') handOff(SKIP_FADE_MS)
    }
    skipRef.current = skip
    const onWheel = (event: WheelEvent) => {
      wheel += Math.abs(event.deltaY)
      if (wheel > SKIP_WHEEL) skip()
    }
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown'].includes(event.key)) skip()
    }
    const onVisibility = () => {
      // SoundProvider pauses the film with the tab; bring it back with the tab.
      if (!document.hidden && phaseRef.current === 'playing' && video.paused) void video.play().catch(() => undefined)
    }
    const removeInput = () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
    }

    const offer = () => {
      unregister()
      unregister = registerFilmPlayer({
        start: () => {
          if (document.hidden || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return false
          unregister()
          set('playing')
          setStage('film')
          window.addEventListener('wheel', onWheel, { passive: true })
          window.addEventListener('keydown', onKey)
          document.addEventListener('visibilitychange', onVisibility)
          video.currentTime = 0
          void sound.current.enterFilmMode(video).then(() => {
            // Sound is on but the browser refused audio without a gesture this
            // visit: the film plays silent rather than not at all.
            if (!video.paused) return
            video.muted = true
            return video.play()
          }).catch(() => handOff(0))
          raf = window.requestAnimationFrame(watchEnd)
          return true
        },
        abort: () => {
          if (phaseRef.current === 'done') return
          teardown()
        },
      })
    }

    const onEnded = () => handOff(FADE_MS)
    video.addEventListener('ended', onEnded)
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) offer()
    else video.addEventListener('canplaythrough', offer, { once: true })

    return () => {
      unregister()
      video.removeEventListener('canplaythrough', offer)
      video.removeEventListener('ended', onEnded)
      window.cancelAnimationFrame(raf)
      window.clearTimeout(fadeTimer)
      removeInput()
    }
  }, [src])

  if (!src || phase === 'done') return null

  return (
    <div
      className="intro-film"
      data-phase={phase}
      aria-hidden={phase === 'idle'}
      onClick={() => skipRef.current()}
    >
      <video
        ref={videoRef}
        className="intro-film__video"
        src={src}
        preload="auto"
        playsInline
        muted
        disablePictureInPicture
        aria-hidden="true"
      />
      {phase === 'playing' && (
        <button type="button" className="intro-film__skip" onClick={() => skipRef.current()}>
          Skip
        </button>
      )}
    </div>
  )
}

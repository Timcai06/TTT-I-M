import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Project } from '../../content'
import ScrollExpand from '../../components/ScrollExpand'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import { useSound } from '../../lib/sound/SoundContext'
import { LiquidMetalButton } from '../../shaders/liquid-metal-button/LiquidMetalButton'

/**
 * A project's film (tools/project_films), under its card: a poster that expands with the scroll,
 * and a player that opens with sound.
 *
 * The video is never part of the loader's preload. An intentional hover or focus
 * warms it; a click plays from the network if warming has not finished.
 */
export default function ProjectFilm({ project }: { project: Project }) {
  const film = project.film
  const dialog = useRef<HTMLDialogElement>(null)
  const filmVideo = useRef<HTMLVideoElement>(null)
  const playButton = useRef<HTMLDivElement>(null)
  const warmTimer = useRef<number | undefined>(undefined)
  const pointerOnButton = useRef(false)
  const hoverStartedAt = useRef(-Infinity)
  const lastScrollAt = useRef(-Infinity)
  const [filmOpen, setFilmOpen] = useState(false)
  const [filmFrameReady, setFilmFrameReady] = useState(false)
  const frameRequest = useRef<number | null>(null)
  const { enterFilmMode, exitFilmMode, setEnabled, stopActive } = useSound()
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

  const warmFilm = useCallback(() => {
    const video = filmVideo.current
    if (!video || video.preload === 'auto') return
    video.preload = 'auto'
    video.load()
  }, [])

  const scheduleWarmup = useCallback(() => {
    window.clearTimeout(warmTimer.current)
    if (!pointerOnButton.current) return
    const readyAt = Math.max(hoverStartedAt.current, lastScrollAt.current) + 150
    warmTimer.current = window.setTimeout(() => {
      warmTimer.current = undefined
      if (pointerOnButton.current && performance.now() - lastScrollAt.current >= 150) warmFilm()
    }, Math.max(0, readyAt - performance.now()))
  }, [warmFilm])

  const onScroll = useCallback(() => {
    lastScrollAt.current = performance.now()
    // A stationary hover remains eligible after the last scroll event.
    scheduleWarmup()
  }, [scheduleWarmup])

  const beginHoverWarmup = useCallback(() => {
    if (pointerOnButton.current) return
    pointerOnButton.current = true
    hoverStartedAt.current = performance.now()
    window.addEventListener('scroll', onScroll, { passive: true })
    scheduleWarmup()
  }, [onScroll, scheduleWarmup])

  const endHoverWarmup = useCallback(() => {
    pointerOnButton.current = false
    window.removeEventListener('scroll', onScroll)
    window.clearTimeout(warmTimer.current)
    warmTimer.current = undefined
  }, [onScroll])

  useEffect(() => () => {
    if (frameRequest.current !== null) filmVideo.current?.cancelVideoFrameCallback?.(frameRequest.current)
    exitFilmMode(filmVideo.current)
    stopActive()
  }, [exitFilmMode, stopActive])

  useEffect(() => {
    if (!film) return
    const cancelWarmup = () => {
      window.clearTimeout(warmTimer.current)
      warmTimer.current = undefined
    }
    const onPageHide = () => {
      cancelWarmup()
      const video = filmVideo.current
      if (!video) return
      // A 37 MB project film can otherwise keep downloading after navigation
      // and exceed Chrome's bfcache network buffer while this page is frozen.
      video.removeAttribute('src')
      video.load()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      const video = filmVideo.current
      if (!video) return
      video.preload = 'metadata'
      video.src = film.src
      video.load()
    }
    const onIframePointer = (event: Event) => {
      const detail = (event as CustomEvent<{ phase?: string; target?: EventTarget }>).detail
      if (!(detail?.target instanceof Node) || !playButton.current?.contains(detail.target)) return
      if (detail.phase === 'leave') endHoverWarmup()
      else beginHoverWarmup()
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('portfolio:iframe-pointer', onIframePointer)
    return () => {
      cancelWarmup()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('portfolio:iframe-pointer', onIframePointer)
    }
  }, [beginHoverWarmup, endHoverWarmup, film, onScroll])

  if (!film) return null

  const openFilm = () => {
    const modal = dialog.current
    const video = filmVideo.current
    if (!modal || !video) return
    setEnabled(true)
    stopActive()
    setFilmOpen(true)
    setFilmFrameReady(false)
    if (frameRequest.current !== null) video.cancelVideoFrameCallback?.(frameRequest.current)
    frameRequest.current = video.requestVideoFrameCallback?.(() => {
      frameRequest.current = null
      setFilmFrameReady(true)
    }) ?? null
    video.currentTime = 0
    if (!modal.open) modal.showModal()
    void enterFilmMode(video)
  }

  const closeFilm = () => {
    if (dialog.current?.open) dialog.current.close()
  }

  const handleDialogClose = () => {
    if (frameRequest.current !== null) filmVideo.current?.cancelVideoFrameCallback?.(frameRequest.current)
    frameRequest.current = null
    exitFilmMode(filmVideo.current)
    setFilmOpen(false)
    setFilmFrameReady(false)
    playButton.current?.querySelector<HTMLIFrameElement>('.liquid-metal-button__frame')?.focus()
  }

  const titleId = `${project.id}-film-title`
  const dialogTitleId = `${project.id}-film-dialog-title`
  const [headLine, ...restLines] = film.heading.split('\n')

  return (
    <section
      className="project-film"
      data-film={project.id}
      data-mode="scroll-expand"
      data-state={filmOpen ? 'playing' : 'ready'}
      aria-labelledby={titleId}
      style={{ '--film-accent': project.accent } as CSSProperties}
    >
      <ScrollExpand
        className="project-film__expand"
        src={film.poster}
        alt={film.posterAlt}
        title={film.teaser}
        scrollHint="Scroll to enter"
        startWidth={62}
        startHeight={66}
        startRadius={18}
        endRadius={0}
        mediaZoom={1.12}
        scrollDistance={0.85}
        holdDistance={0.18}
        smoothing={0.45}
        overlayScrim={0.56}
        useWindowScroll={!mobile}
        enabled={!mobile && !reducedMotion}
        style={mobile ? { height: 'min(78svh, 680px)' } : undefined}
      >
        <div className="project-film__expanded-copy">
          <span className="project-film__index">{film.label}</span>
          <h3 id={titleId}>
            {headLine}
            {restLines.map((line) => <span key={line}><br />{line}</span>)}
          </h3>
          <p>{film.body}</p>
          <div
            ref={playButton}
            className="project-film__play-shell"
            data-cursor="default"
            onPointerEnter={beginHoverWarmup}
            onPointerLeave={endHoverWarmup}
            onFocusCapture={warmFilm}
          >
            <LiquidMetalButton
              className="project-film__liquid-play"
              text="PLAY FILM"
              variant="pill"
              rendering="colored"
              embedded
              onClick={openFilm}
            />
            <span className="project-film__play-meta">{film.duration} · SOUND ON</span>
          </div>
          <div className="project-film__path" aria-hidden="true">
            {film.path.map((step, i) => (
              <span key={step} style={{ display: 'contents' }}>
                {i > 0 ? <i /> : null}
                <span>{step}</span>
              </span>
            ))}
          </div>
        </div>
      </ScrollExpand>

      <dialog
        className="project-film__dialog"
        ref={dialog}
        aria-labelledby={dialogTitleId}
        onClose={handleDialogClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeFilm()
        }}
      >
        <div className="project-film__dialog-panel" data-lenis-prevent>
          <div className="project-film__dialog-bar">
            <span id={dialogTitleId}>{project.name.toUpperCase()} · PROJECT FILM / {film.duration}</span>
            <button type="button" onClick={closeFilm} aria-label={`Close the ${project.name} film`}>Close</button>
          </div>
          <div className="project-film__video-frame">
            <video
              ref={filmVideo}
              src={film.src}
              poster={film.poster}
              preload="metadata"
              controls
              playsInline
              onLoadedData={() => {
                if (!filmVideo.current?.requestVideoFrameCallback) setFilmFrameReady(true)
              }}
            />
            {!filmFrameReady && <div className="project-film__loading" role="status" aria-live="polite">
              <img src={film.poster} alt="" aria-hidden="true" />
              <span>Loading film…</span>
            </div>}
          </div>
        </div>
      </dialog>
    </section>
  )
}

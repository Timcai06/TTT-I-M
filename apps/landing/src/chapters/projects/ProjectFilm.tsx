import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
 * The video is never part of the loader's preload. It starts downloading when the visitor hovers
 * or focuses the play button, and plays from the network if they click before that finishes.
 */
export default function ProjectFilm({ project }: { project: Project }) {
  const film = project.film
  const dialog = useRef<HTMLDialogElement>(null)
  const filmVideo = useRef<HTMLVideoElement>(null)
  const playButton = useRef<HTMLDivElement>(null)
  const [filmOpen, setFilmOpen] = useState(false)
  const { enterFilmMode, exitFilmMode, setEnabled, stopActive } = useSound()
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

  useEffect(() => () => {
    exitFilmMode(filmVideo.current)
    stopActive()
  }, [exitFilmMode, stopActive])

  if (!film) return null

  const warmFilm = () => {
    const video = filmVideo.current
    if (!video || video.preload === 'auto') return
    video.preload = 'auto'
    video.load()
  }

  const openFilm = () => {
    const modal = dialog.current
    const video = filmVideo.current
    if (!modal || !video) return
    setEnabled(true)
    stopActive()
    setFilmOpen(true)
    video.currentTime = 0
    if (!modal.open) modal.showModal()
    void enterFilmMode(video)
  }

  const closeFilm = () => {
    if (dialog.current?.open) dialog.current.close()
  }

  const handleDialogClose = () => {
    exitFilmMode(filmVideo.current)
    setFilmOpen(false)
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
            onPointerEnter={warmFilm}
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
          <video
            ref={filmVideo}
            src={film.src}
            poster={film.poster}
            preload="metadata"
            controls
            playsInline
          />
        </div>
      </dialog>
    </section>
  )
}

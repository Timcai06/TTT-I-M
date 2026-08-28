import { useEffect, useRef, useState } from 'react'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
import { useSound } from '../lib/sound/SoundProvider'
import { LiquidMetalButton } from '../shaders/liquid-metal-button/LiquidMetalButton'
import ScrollExpand from './ScrollExpand'

const FILM_URL = '/projects/sciscope/sciscope-concept-film.mp4'
const POSTER_URL = '/projects/sciscope/sciscope-film-poster.jpg'

export default function SciScopeFilm() {
  const dialog = useRef<HTMLDialogElement>(null)
  const filmVideo = useRef<HTMLVideoElement>(null)
  const playButton = useRef<HTMLDivElement>(null)
  const [filmOpen, setFilmOpen] = useState(false)
  const { enterFilmMode, exitFilmMode, setEnabled, stopActive } = useSound()
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

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

  useEffect(() => () => {
    exitFilmMode(filmVideo.current)
    stopActive()
  }, [exitFilmMode, stopActive])

  return (
    <section
      className="sciscope-film"
      data-mode="scroll-expand"
      data-state={filmOpen ? 'playing' : 'ready'}
      aria-labelledby="sciscope-film-title"
    >
      <ScrollExpand
        className="sciscope-film__expand"
        src={POSTER_URL}
        alt="A luminous data tunnel from the opening of the SciScope concept film"
        title={'One question.\nThirty uninterrupted seconds.'}
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
        <div className="sciscope-film__expanded-copy">
          <span className="sciscope-film__index">SCISCOPE / ORIGINAL CUT · 2026</span>
          <h3 id="sciscope-film-title">Research that can<br />show its work.</h3>
          <p>
            From one open question to traceable evidence. The entrance follows your scroll;
            the film keeps its own uninterrupted rhythm.
          </p>
          <div
            ref={playButton}
            className="sciscope-film__play-shell"
            data-cursor="default"
            onPointerEnter={warmFilm}
            onFocusCapture={warmFilm}
          >
            <LiquidMetalButton
              className="sciscope-film__liquid-play"
              text="PLAY ORIGINAL CUT"
              variant="pill"
              rendering="colored"
              embedded
              onClick={openFilm}
            />
            <span className="sciscope-film__play-meta">00:30 · SOUND ON</span>
          </div>
          <div className="sciscope-film__path" aria-hidden="true">
            <span>QUESTION</span><i />
            <span>SEARCH</span><i />
            <span>EVIDENCE</span><i />
            <span>SYNTHESIS</span>
          </div>
        </div>
      </ScrollExpand>

      <dialog
        className="sciscope-film__dialog"
        ref={dialog}
        aria-labelledby="sciscope-film-dialog-title"
        onClose={handleDialogClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeFilm()
        }}
      >
        <div className="sciscope-film__dialog-panel" data-lenis-prevent>
          <div className="sciscope-film__dialog-bar">
            <span id="sciscope-film-dialog-title">SCISCOPE · ORIGINAL CONCEPT FILM / 00:30</span>
            <button type="button" onClick={closeFilm} aria-label="Close concept film">Close</button>
          </div>
          <video
            ref={filmVideo}
            src={FILM_URL}
            poster={POSTER_URL}
            preload="metadata"
            controls
            playsInline
          />
        </div>
      </dialog>
    </section>
  )
}

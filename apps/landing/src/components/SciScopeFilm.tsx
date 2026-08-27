import { useEffect, useRef, useState } from 'react'
import { useSound } from '../lib/sound/SoundProvider'

const FILM_URL = '/projects/sciscope/sciscope-concept-film.mp4'
const POSTER_URL = '/projects/sciscope/sciscope-film-poster.jpg'

export default function SciScopeFilm() {
  const dialog = useRef<HTMLDialogElement>(null)
  const filmVideo = useRef<HTMLVideoElement>(null)
  const playButton = useRef<HTMLButtonElement>(null)
  const [filmOpen, setFilmOpen] = useState(false)
  const { enterFilmMode, exitFilmMode, setEnabled, stopActive } = useSound()

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
    playButton.current?.focus()
  }

  useEffect(() => () => {
    exitFilmMode(filmVideo.current)
    stopActive()
  }, [exitFilmMode, stopActive])

  return (
    <section
      className="sciscope-film"
      data-mode="entrance"
      data-state={filmOpen ? 'playing' : 'ready'}
      aria-labelledby="sciscope-film-title"
    >
      <header className="sciscope-film__intro">
        <div className="sciscope-film__intro-copy">
          <span className="sciscope-film__index">SCISCOPE / CONCEPT FILM</span>
          <h3 id="sciscope-film-title">One question.<br />Thirty uninterrupted seconds.</h3>
        </div>
        <div className="sciscope-film__note">
          <p>
            A short product film about research that can show its work—from an open question to
            traceable evidence. Playback begins deliberately and keeps the original edit and sound intact.
          </p>
          <dl>
            <div><dt>Runtime</dt><dd>00:30</dd></div>
            <div><dt>Format</dt><dd>Product concept</dd></div>
            <div><dt>Audio</dt><dd>Original sound</dd></div>
          </dl>
        </div>
      </header>

      <button
        ref={playButton}
        className="sciscope-film__entrance"
        type="button"
        onClick={openFilm}
        aria-label="Play the 30 second SciScope concept film with sound"
        data-cursor-label="PLAY 00:30"
      >
        <img
          className="sciscope-film__poster"
          src={POSTER_URL}
          alt="A luminous data tunnel from the opening of the SciScope concept film"
          loading="lazy"
        />
        <span className="sciscope-film__poster-scrim" aria-hidden="true" />
        <span className="sciscope-film__poster-top" aria-hidden="true">
          <span>SCISCOPE / FILM 01</span>
          <span>ORIGINAL CUT · 2026</span>
        </span>
        <span className="sciscope-film__poster-action">
          <span className="sciscope-film__play-label">Play the film</span>
          <span className="sciscope-film__play-meta">00:30 · SOUND ON</span>
        </span>
      </button>

      <footer className="sciscope-film__footer" aria-hidden="true">
        <span>QUESTION → SEARCH → EVIDENCE → SYNTHESIS</span>
        <span>CLICK TO ENTER</span>
      </footer>

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

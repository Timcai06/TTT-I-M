import { useEffect, useRef } from 'react'

const stackArcPath = 'M 978 38 C 1090 70 1164 130 1175 228 C 1196 408 1088 554 865 606'

/** Decorative light layers: CSS owns the loop, observers only control playback. */
export default function ChapterAtmosphere({ variant }: { variant: 'about' | 'stack' | 'contact' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const layer = ref.current
    const surface = layer?.parentElement
    if (!layer || !surface) return
    let visible = false
    const sync = () => {
      const running = visible && !document.hidden
      surface.style.setProperty('--art-motion-play-state', running ? 'running' : 'paused')
      layer.dataset.running = String(running)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      sync()
    }, { threshold: 0 })
    observer.observe(surface)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      surface.style.removeProperty('--art-motion-play-state')
    }
  }, [])
  return <div ref={ref} className={`chapter-atmosphere chapter-atmosphere--${variant}`} aria-hidden="true" data-running="false">
    {variant === 'stack' ? <>
      <span className="chapter-atmosphere__orbit-repair" />
      <span className="chapter-atmosphere__lighting">
        <span className="chapter-atmosphere__light" />
      </span>
      <svg className="chapter-atmosphere__arc" viewBox="0 0 1477 1065" focusable="false">
        <g>
          <path className="chapter-atmosphere__arc-tail" d={stackArcPath} pathLength="1000" />
          <path className="chapter-atmosphere__arc-body" d={stackArcPath} pathLength="1000" />
          <path className="chapter-atmosphere__arc-tip" d={stackArcPath} pathLength="1000" />
        </g>
      </svg>
    </> : variant === 'contact' ? <>
      <span className="chapter-atmosphere__cloud chapter-atmosphere__cloud--far" />
      <span className="chapter-atmosphere__cloud chapter-atmosphere__cloud--far chapter-atmosphere__cloud--copy" />
      <span className="chapter-atmosphere__cloud chapter-atmosphere__cloud--near" />
      <span className="chapter-atmosphere__cloud chapter-atmosphere__cloud--near chapter-atmosphere__cloud--copy" />
    </> : <>
      <span className="chapter-atmosphere__light" />
      <span className="chapter-atmosphere__depth" />
    </>}
  </div>
}

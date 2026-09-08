import { Component, lazy, Suspense, useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { scrollToChapter } from '../../lib/chapterScroll'
import { createArchiveProgress } from './scrollPose'
import { chapterPose, chapterTracks, phase, type ArchiveTrack } from './chapterTracks'
import { useChapterPreview } from './useChapterPreview'
import './personal-archive.css'

const Surface = lazy(() => import('./PersonalArchiveSurface'))
class Boundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function ArchiveChapterBridge({ track, id }: { track: ArchiveTrack; id?: string }) {
  const root = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const progress = useMemo(() => createArchiveProgress(), [])
  const { ref: surfaceRef, mounted, visible } = useGLSurface({ mountMargin: '200px 0px', renderMargin: '0px', initiallyMounted: false })
  const stage = useStage()
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState(false)
  const fail = useCallback(() => { setFailed(true); setReady(false) }, [])
  const loaded = useCallback(() => setReady(true), [])
  const released = useCallback(() => setReady(false), [])
  const config = chapterTracks[track]
  useChapterPreview(page, track, !failed)
  useGSAP(() => {
    const element = root.current
    if (!element) return
    const sync = (self: ScrollTrigger) => {
      const p = self.progress
      progress.set(p)
      const pose = chapterPose(track, p)
      element.dataset.phase = pose.reading ? 'released' : !ready ? 'prepare' : p < .6 ? 'visible' : p < .9 ? 'transfer' : 'reading'
      element.style.setProperty('--archive-stage', pose.reading ? 'hidden' : 'visible')
      element.style.setProperty('--archive-copy', String(ready && !failed ? 1 - phase(p, .08, .3) : 1))
      element.style.setProperty('--archive-room', String(ready && !failed ? phase(p, 0, .12) : 0))
      setCompleted(pose.reading)
    }
    const trigger = ScrollTrigger.create({ trigger: element, start: 'top top', end: 'bottom bottom', onUpdate: sync, onRefresh: sync, refreshPriority: -100 })
    sync(trigger); requestScrollRefresh()
  }, { scope: root, dependencies: [track, ready, failed], revertOnUpdate: true })

  return <section ref={root} id={id} className="archive-bridge archive-chapter-bridge" data-archive-track={track} data-archive-target={config.target}
    data-scene-ready={ready} data-failed={failed} aria-label={config.title} style={{ '--archive-height': config.height } as CSSProperties}>
    <div ref={surfaceRef} className="archive-bridge__stage">
      <div ref={backdrop} className="archive-bridge__backdrop" aria-hidden="true">
        {mounted && !completed && !failed && (stage === 'live' || stage === 'transitioning') && <Boundary onFailure={fail}>
          <Suspense fallback={null}><Surface host={backdrop} page={page} track={track} progress={progress}
            visible={visible && stage === 'live'} onReady={loaded} onFailure={fail} onRelease={released} /></Suspense>
        </Boundary>}
      </div>
      <div className="archive-bridge__veil" aria-hidden="true" />
      <div ref={page} className="archive-bridge__page archive-chapter-bridge__page" aria-hidden="true" inert />
      <div className="archive-bridge__arrival"><p className="archive-bridge__index">{config.index}</p><h2>{config.title}</h2></div>
      <div className="archive-bridge__footer"><span>{failed ? '可直接进入下一章' : ready ? 'SCROLL TO CONTINUE' : '正在加载空间，可直接阅读'}</span>
        {failed && <button type="button" onClick={() => window.location.reload()}>重新加载空间 ↻</button>}
        <a href={`#${config.target}`} onClick={event => { event.preventDefault(); scrollToChapter(config.target, { updateHash: true, immediate: true }) }}>继续阅读 ↘</a>
      </div>
    </div>
  </section>
}

import { Component, lazy, Suspense, useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { scrollToChapter } from '../../lib/chapterScroll'
import { createArchiveProgress } from './scrollPose'
import { chapterHandoffPose, chapterPose, chapterTracks, type ArchiveTrack } from './chapterTracks'
import ArchiveHandoffPage from './ArchiveHandoffPage'
import { readingSnapshot } from './readingSnapshot'
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
  const sourcePage = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const progress = useMemo(() => createArchiveProgress(), [])
  const { ref: surfaceRef, visible } = useGLSurface({ mountMargin: '200px 0px', renderMargin: '0px', initiallyMounted: true })
  const stage = useStage()
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [active, setActive] = useState(false)
  const fail = useCallback(() => { setFailed(true); setReady(false) }, [])
  const loaded = useCallback(() => setReady(true), [])
  const released = useCallback(() => setReady(false), [])
  const config = chapterTracks[track]
  const sourceId = { 'about-life': 'about', 'life-frame': 'life', 'frame-stack': 'frame', 'stack-work': 'skills', 'work-contact': 'projects' }[track]
  useGSAP(() => {
    const element = root.current
    if (!element) return
    const liveTarget = document.getElementById(config.target)
    liveTarget?.setAttribute('data-archive-live-target', '')
    let previous = -1
    const sync = (self: ScrollTrigger) => {
      const p = self.progress
      if (stage === 'live' && p < .26 && sourcePage.current && (previous <= 0 || !sourcePage.current.firstChild)) {
        const original = document.getElementById(sourceId)
        if (original) sourcePage.current.replaceChildren(readingSnapshot(original))
      }
      previous = p
      progress.set(p)
      const pose = chapterPose(track, p)
      const handoff = chapterHandoffPose(track, p)
      liveTarget?.style.setProperty('--archive-live-target', pose.reading ? '1' : '0')
      element.dataset.phase = pose.reading ? 'released' : !ready ? 'prepare' : p < .6 ? 'visible' : p < .9 ? 'transfer' : 'reading'
      element.style.setProperty('--archive-stage', pose.reading ? 'hidden' : 'visible')
      element.style.setProperty('--archive-progress', String(p))
      element.style.setProperty('--archive-copy', String(ready && !failed ? handoff.guidance : 1))
      element.style.setProperty('--archive-room', String(ready && !failed ? handoff.roomOpacity : 0))
      element.style.setProperty('--archive-vignette', String(handoff.vignette))
      element.style.setProperty('--archive-target-opacity', String(ready && !failed ? handoff.targetOpacity : 0))
      setCompleted(pose.reading)
      const bounds = element.getBoundingClientRect()
      setActive(bounds.top < innerHeight - 1 && bounds.bottom > 1 && !pose.reading)
    }
    const trigger = ScrollTrigger.create({ trigger: element, start: 'top bottom', end: 'bottom bottom', onUpdate: sync, onRefresh: sync, refreshPriority: -100 })
    sync(trigger); requestScrollRefresh()
    return () => {
      liveTarget?.removeAttribute('data-archive-live-target')
      liveTarget?.style.removeProperty('--archive-live-target')
    }
  }, { scope: root, dependencies: [track, ready, failed], revertOnUpdate: true })

  return <section ref={root} id={id} className="archive-bridge archive-chapter-bridge" data-archive-track={track} data-archive-target={config.target}
    data-scene-ready={ready} data-failed={failed} aria-label={config.title} style={{ '--archive-height': config.height } as CSSProperties}>
    <div ref={surfaceRef} className="archive-bridge__stage">
      <div ref={backdrop} className="archive-bridge__backdrop" aria-hidden="true">
        {!failed && (stage === 'live' || stage === 'transitioning') && <Boundary onFailure={fail}>
          <Suspense fallback={null}><Surface page={page} sourcePage={sourcePage} track={track} progress={progress}
            visible={visible && active && !completed && stage === 'live'} onReady={loaded} onFailure={fail} onRelease={released} /></Suspense>
        </Boundary>}
      </div>
      <div className="archive-bridge__veil" aria-hidden="true" />
      <button className={`archive-bridge__room-hit archive-bridge__room-hit--${track}`} type="button"
        aria-label={`打开 ${config.target}`} onClick={() => scrollToChapter(config.target, { updateHash: true, immediate: true, restore: true })}><span>OPEN</span></button>
      <div ref={page} className="archive-bridge__page archive-chapter-bridge__page" data-preview-ready="true" aria-hidden="true" inert>
        <ArchiveHandoffPage track={track} />
      </div>
      <div ref={sourcePage} className="archive-bridge__page archive-bridge__page--source" aria-hidden="true" inert />
      <div className="archive-bridge__footer"><span>{failed ? '可直接进入下一章' : ready ? 'SCROLL TO CONTINUE' : '正在加载空间，可直接阅读'}</span>
        {failed && <button type="button" onClick={() => window.location.reload()}>重新加载空间 ↻</button>}
        <a href={`#${config.target}`} onClick={event => { event.preventDefault(); scrollToChapter(config.target, { updateHash: true, immediate: true, restore: true }) }}>继续阅读 ↘</a>
      </div>
    </div>
  </section>
}

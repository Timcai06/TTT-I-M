import { Component, lazy, Suspense, useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { scrollToChapter } from '../../lib/chapterScroll'
import { createArchiveProgress } from './scrollPose'
import { chapterTracks, type ArchiveTrack } from './chapterTracks'
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
  const [active, setActive] = useState(false)
  const fail = useCallback(() => { setFailed(true); setReady(false) }, [])
  const loaded = useCallback(() => setReady(true), [])
  const released = useCallback(() => setReady(false), [])
  const config = chapterTracks[track]
  const sourceId = { 'about-life': 'about', 'life-frame': 'life', 'frame-stack': 'frame', 'stack-work': 'skills', 'work-contact': 'projects' }[track]
  const sourceTheme = { 'about-life': 'about', 'life-frame': 'life', 'frame-stack': 'frame', 'stack-work': 'stack', 'work-contact': 'work' }[track]
  const targetTheme = { 'about-life': 'life', 'life-frame': 'frame', 'frame-stack': 'stack', 'stack-work': 'work', 'work-contact': 'contact' }[track]
  useGSAP(() => {
    const element = root.current
    if (!element) return
    let previous = -1
    const sync = (self: ScrollTrigger) => {
      const p = self.progress
      if (stage === 'live' && p < .26 && sourcePage.current && (previous <= 0 || !sourcePage.current.firstChild)) {
        const original = document.getElementById(sourceId)
        if (original) sourcePage.current.replaceChildren(readingSnapshot(original))
      }
      previous = p
      progress.set(p)
      const bounds = element.getBoundingClientRect()
      setActive(bounds.top < innerHeight - 1 && bounds.bottom > 1)
    }
    const trigger = ScrollTrigger.create({ trigger: element, start: 'top bottom', end: 'bottom bottom', onUpdate: sync, onRefresh: sync, refreshPriority: -100 })
    sync(trigger); requestScrollRefresh()
  }, { scope: root, dependencies: [track], revertOnUpdate: true })

  return <section ref={root} id={id} className="archive-bridge archive-chapter-bridge" data-archive-track={track} data-archive-target={config.target}
    data-scene-ready={ready} data-failed={failed} aria-label={config.title} style={{ '--archive-height': config.height } as CSSProperties}>
    <div ref={surfaceRef} className="archive-bridge__stage">
      <div ref={backdrop} className="archive-bridge__backdrop" aria-hidden="true">
        {!failed && (stage === 'live' || stage === 'transitioning') && <Boundary onFailure={fail}>
          <Suspense fallback={null}><Surface page={page} sourcePage={sourcePage} track={track} progress={progress}
            visible={visible && active && stage === 'live'} onReady={loaded} onFailure={fail} onRelease={released} /></Suspense>
        </Boundary>}
      </div>
      <div className="archive-bridge__veil" aria-hidden="true" />
      <button className={`archive-bridge__room-hit archive-bridge__room-hit--${track}`} type="button" aria-disabled="true" tabIndex={-1}
        aria-label={`打开 ${config.target}`} onClick={() => void scrollToChapter(config.target, { updateHash: true, immediate: true, restore: true })}><span>OPEN</span></button>
      <div ref={page} className="archive-bridge__page archive-chapter-bridge__page" data-archive-reading-theme={targetTheme} data-preview-ready="true" aria-hidden="true" inert>
        <ArchiveHandoffPage track={track} />
      </div>
      <div ref={sourcePage} className="archive-bridge__page archive-bridge__page--source" data-archive-reading-theme={sourceTheme} aria-hidden="true" inert />
      <div className="archive-bridge__footer"><span>{failed ? '可直接进入下一章' : ready ? 'SCROLL TO CONTINUE' : '正在加载空间，可直接阅读'}</span>
        {failed && <button type="button" onClick={() => window.location.reload()}>重新加载空间 ↻</button>}
        <a href={`#${config.target}`} onClick={event => { event.preventDefault(); void scrollToChapter(config.target, { updateHash: true, immediate: true, restore: true }) }}>继续阅读 ↘</a>
      </div>
    </div>
  </section>
}

import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'
import { scrollToChapter } from '../../lib/chapterScroll'
import { createArchiveProgress } from './scrollPose'
import AboutDossier from '../AboutDossier'
// personal-archive.css is imported once by styles/app.css into layer(chapters),
// ahead of natural-room.css. Importing it again here appended a second, later
// copy that re-applied rules natural-room.css had deliberately reset — that is
// why #life kept its transparent right border and showed the room through the
// last 30px of every viewport. Do not re-add this import.

const Surface = lazy(() => import('./PersonalArchiveSurface'))

class SurfaceBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function PersonalArchiveBridge({ onReadingChange }: { onReadingChange?: (reading: boolean) => void }) {
  const root = useRef<HTMLElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const progress = useMemo(() => createArchiveProgress(), [])
  const { ref: surfaceRef, visible } = useGLSurface({ mountMargin: '350px 0px', renderMargin: '0px', initiallyMounted: true })
  const stage = useStage()
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [active, setActive] = useState(false)
  const fail = useCallback(() => { setFailed(true); setReady(false) }, [])
  const loaded = useCallback(() => { setReady(true) }, [])
  const resetReady = useCallback(() => { setReady(false) }, [])

  useGSAP(() => {
    if (!root.current || !backdrop.current) return
    const sync = (self: ScrollTrigger) => {
      progress.set(self.progress)
      const reading = self.progress >= 0.9999 || failed
      const bounds = root.current?.getBoundingClientRect()
      setActive(Boolean(bounds && bounds.top < innerHeight - 1 && bounds.bottom > 1 && !reading))
      onReadingChange?.(reading)
      setCompleted(reading)
    }
    const trigger = ScrollTrigger.create({
      trigger: root.current, start: 'top bottom', end: 'bottom bottom',
      onUpdate: sync, onRefresh: sync,
    })
    sync(trigger)
    requestScrollRefresh()
    return () => { progress.set(0) }
  }, { scope: root, dependencies: [failed, onReadingChange], revertOnUpdate: true })

  useEffect(() => () => requestScrollRefresh(), [])

  return <section ref={root} id="archive-entry" data-archive-target="about" className="archive-bridge archive-bridge--entry" aria-label="个人档案空间" data-scene-ready={ready} data-failed={failed}>
    <div ref={surfaceRef} className="archive-bridge__stage">
      <div ref={backdrop} className="archive-bridge__backdrop" aria-hidden="true">
        {(stage === 'live' || stage === 'transitioning') && !failed && <SurfaceBoundary onFailure={fail}>
          <Suspense fallback={null}>
            <Surface page={page} progress={progress} visible={visible && active && !completed && stage === 'live'} onReady={loaded} onFailure={fail} onRelease={resetReady} />
          </Suspense>
        </SurfaceBoundary>}
      </div>
      <div className="archive-bridge__veil" aria-hidden="true" />
      <div ref={page} className="archive-bridge__page" data-archive-reading-theme="about" aria-hidden="true" inert>
        <AboutDossier />
      </div>
      <button className="archive-bridge__room-hit archive-bridge__room-hit--entry" type="button" aria-disabled="true" tabIndex={-1} aria-label="打开 About 书本"
        onClick={() => void scrollToChapter('about', { updateHash: true, immediate: true, restore: true })}><span>OPEN</span></button>
      <div className="archive-bridge__arrival">
        <p className="archive-bridge__index">PERSONAL ARCHIVE / 001</p>
        <h2>从一页笔记，<br /><em>开始认识我。</em></h2>
        <p className="archive-bridge__caption">想法、记录，以及它们变成现实的过程。</p>
      </div>
      <div className="archive-bridge__footer">
        <span>{failed ? '空间暂不可用，可直接阅读。' : !ready ? '正在加载空间，可直接阅读。' : 'SCROLL TO UNFOLD'}</span>
        {failed && <button type="button" onClick={() => window.location.reload()}>重新加载空间 ↻</button>}
        <a href="#about" onClick={(event) => {
          event.preventDefault()
          void scrollToChapter('about', { updateHash: true })
        }}>直接阅读 About ↘</a>
      </div>
    </div>
  </section>
}

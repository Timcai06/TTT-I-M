import { Suspense, useCallback, useMemo, useState, type RefObject } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import { createArchiveProgress } from './scrollPose'
import PersonalArchiveSurface from './PersonalArchiveSurface'
import { getPreparedArchiveRuntime } from './archiveRuntime'
import { resetIndexFrame } from '../../lib/indexFrame'

const ready = () => undefined
const released = () => undefined

export default function ArchiveIndexSurface({ root, page }: {
  root: RefObject<HTMLElement | null>
  page: RefObject<HTMLDivElement | null>
}) {
  const progress = useMemo(() => createArchiveProgress(), [])
  const { ref: marker, visible } = useGLSurface({ mountMargin: '120px 0px', renderMargin: '0px', initiallyMounted: true })
  const stage = useStage()
  const mobile = useMobileExperience()
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const [atIndex, setAtIndex] = useState(true)
  const onFailure = useCallback(() => {
    getPreparedArchiveRuntime()?.rest('home')
    // hero.css carries a fallback that forces the Index panel visible when the
    // room cannot draw it. Nothing had ever set this attribute, so that rule was
    // dead and the panel — which is opacity 0 by default in archive mode, waiting
    // to be projected — stayed invisible on exactly the failure it was written for.
    root.current?.setAttribute('data-archive-failed', 'true')
    resetIndexFrame()
    setFailed(true)
  }, [])

  useGSAP(() => {
    if (!root.current) return
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        // .002 meant the Index surface detached after two thousandths of a scroll —
        // a wheel notch was enough to release the panel the reader is meant to be
        // able to sit on and click. The Index owns the whole hero span.
        const at = self.progress < 1
        // Scrolling away from the Index must not strand the signature frame on a
        // panel the camera is no longer square to; past this point the story is on
        // the entry segment and the quad is warping.
        if (!at) resetIndexFrame()
        setAtIndex(at)
        progress.set(self.progress)
      },
      onRefresh: (self) => {
        setAtIndex(self.progress < 1)
        progress.set(self.progress)
      },
    })
    progress.set(trigger.progress)
    return () => trigger.kill()
  }, { scope: root, dependencies: [progress] })

  return (
    <>
      <div ref={marker} className="hero__archive-marker" aria-hidden="true" />
      {!mobile && !reduced && !failed && (stage === 'live' || stage === 'transitioning') && (
        <Suspense fallback={null}>
          <PersonalArchiveSurface page={page} track="index" progress={progress} visible={visible && atIndex && stage === 'live'}
            onReady={ready} onFailure={onFailure} onRelease={released} />
        </Suspense>
      )}
    </>
  )
}

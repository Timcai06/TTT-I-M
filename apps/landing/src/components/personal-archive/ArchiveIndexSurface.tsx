import { Suspense, useCallback, useMemo, useState, type RefObject } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import { createArchiveProgress } from './scrollPose'
import PersonalArchiveSurface from './PersonalArchiveSurface'
import { getPreparedArchiveRuntime } from './archiveRuntime'

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
    setFailed(true)
  }, [])

  useGSAP(() => {
    if (!root.current) return
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        setAtIndex(self.progress <= .002)
        progress.set(self.progress)
      },
      onRefresh: (self) => {
        setAtIndex(self.progress <= .002)
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

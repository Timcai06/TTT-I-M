import { useEffect, type RefObject } from 'react'
import { getPreparedArchiveRuntime, prepareArchiveRuntime, type ArchiveRuntime } from './archiveRuntime'
import type { SpatialShot } from './archiveDirector'
import type { ArchiveProgress } from './scrollPose'

interface Props {
  page: RefObject<HTMLDivElement | null>
  sourcePage?: RefObject<HTMLDivElement | null>
  track?: SpatialShot
  progress: ArchiveProgress
  visible: boolean
  onReady: () => void
  onFailure: () => void
  onRelease: () => void
}

/** Chapter adapter only. The boot-owned renderer and model survive every chapter. */
export default function PersonalArchiveSurface({ page, sourcePage, track, progress, visible, onReady, onFailure, onRelease }: Props) {
  useEffect(() => {
    const lifecycle = new AbortController()
    let detach: (() => void) | undefined
    const attach = (runtime: ArchiveRuntime) => {
      if (lifecycle.signal.aborted) return
      if (visible) detach = runtime.activate(page.current, sourcePage?.current ?? null, track ?? 'entry', progress, {
        ready: onReady, pending: onRelease, failed: onFailure,
      })
      else onReady()
    }
    const runtime = getPreparedArchiveRuntime()
    if (runtime) attach(runtime)
    else void prepareArchiveRuntime(lifecycle.signal).then(attach).catch((error: unknown) => {
      if (lifecycle.signal.aborted) return
      console.error('[personal-archive] Space preparation failed', error)
      onFailure()
    })
    return () => { detach?.(); lifecycle.abort(new Error('Archive adapter released')) }
  }, [page, sourcePage, track, progress, visible, onReady, onFailure, onRelease])
  useEffect(() => onRelease, [onRelease])
  return null
}

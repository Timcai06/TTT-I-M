import { useEffect, useRef, useState } from 'react'
import { getPreparedArchiveRuntime, prepareArchiveRuntime } from './archiveRuntime'
import { useChapterState } from '../../lib/chapterState'
import type { ArchiveView } from './archiveDirector'

const viewByChapter: Record<string, ArchiveView> = {
  hero: 'home', about: 'about', life: 'life', frame: 'frame', skills: 'stack', projects: 'work', contact: 'contact',
}

/**
 * The room has exactly one DOM home for the whole visit. Chapter adapters only
 * change the seekable shot; they never move or unmount the renderer canvas.
 */
export default function ArchiveStage() {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { activeId } = useChapterState()
  const activeView = viewByChapter[activeId] ?? 'home'
  const activeViewRef = useRef<ArchiveView>(activeView)

  useEffect(() => {
    const lifecycle = new AbortController()
    let unmount: (() => void) | undefined
    const mount = (runtime: Awaited<ReturnType<typeof prepareArchiveRuntime>>) => {
      if (lifecycle.signal.aborted || !host.current) return
      unmount = runtime.mount(host.current)
      runtime.rest(activeViewRef.current)
    }
    const runtime = getPreparedArchiveRuntime()
    if (runtime) mount(runtime)
    else void prepareArchiveRuntime(lifecycle.signal).then(mount).catch((error: unknown) => {
      if (lifecycle.signal.aborted) return
      console.error('[personal-archive] Persistent stage failed', error)
      setFailed(true)
    })
    return () => {
      lifecycle.abort(new Error('Archive stage released'))
      unmount?.()
    }
  }, [])

  useEffect(() => {
    activeViewRef.current = activeView
    getPreparedArchiveRuntime()?.rest(activeView)
  }, [activeView])

  useEffect(() => {
    let frame = 0
    const syncViewportView = () => {
      frame = 0
      const center = innerHeight / 2
      const life = document.getElementById('life')?.getBoundingClientRect()
      const view = life && life.top <= center && life.bottom >= center ? 'life' : activeView
      activeViewRef.current = view
      getPreparedArchiveRuntime()?.rest(view)
    }
    const requestSync = () => {
      if (frame) return
      frame = requestAnimationFrame(syncViewportView)
    }
    window.addEventListener('scroll', requestSync, { passive: true })
    window.addEventListener('resize', requestSync)
    requestSync()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestSync)
      window.removeEventListener('resize', requestSync)
    }
  }, [activeView])

  return (
    <div
      ref={host}
      className="archive-stage"
      data-failed={failed ? 'true' : 'false'}
      aria-hidden="true"
    />
  )
}

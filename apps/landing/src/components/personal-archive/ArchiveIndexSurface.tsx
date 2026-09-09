import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import { useStage } from '../../lib/stage'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import { getLenis } from '../../lib/lenis'
import { createArchiveProgress } from './scrollPose'
import PersonalArchiveSurface from './PersonalArchiveSurface'

const ready = () => undefined
const released = () => undefined

export default function ArchiveIndexSurface({ root, page }: {
  root: RefObject<HTMLElement | null>
  page: RefObject<HTMLDivElement | null>
}) {
  const progress = useMemo(() => createArchiveProgress(), [])
  const triggerRef = useRef<ReturnType<typeof ScrollTrigger.create> | null>(null)
  const interactiveRef = useRef(false)
  const { ref: marker, visible } = useGLSurface({ mountMargin: '120px 0px', renderMargin: '0px', initiallyMounted: true })
  const stage = useStage()
  const mobile = useMobileExperience()
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const [atIndex, setAtIndex] = useState(true)
  const onFailure = useCallback(() => setFailed(true), [])

  useGSAP(() => {
    if (!root.current) return
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        setAtIndex(self.progress <= .002)
        if (!interactiveRef.current) progress.set(self.progress)
      },
      onRefresh: (self) => {
        setAtIndex(self.progress <= .002)
        if (!interactiveRef.current) progress.set(self.progress)
      },
    })
    triggerRef.current = trigger
    progress.set(trigger.progress)
    return () => {
      if (triggerRef.current === trigger) triggerRef.current = null
      trigger.kill()
    }
  }, { scope: root, dependencies: [progress] })

  useEffect(() => {
    const screen = page.current
    if (!screen) return
    let frame = 0
    let animating = false
    let closing = false
    let pendingScroll = 0
    const cancel = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      animating = false
    }
    // Keep the optional inspection off the document scroll axis. The first
    // wheel/key gesture closes it before replaying that gesture into Lenis, so
    // the entry adapter cannot steal the runtime halfway through the approach.
    const moveTo = (targetProgress: number, duration = 520, complete?: () => void) => {
      cancel()
      const from = progress.get()
      const started = performance.now()
      animating = true
      const tick = (now: number) => {
        const p = Math.min(1, (now - started) / duration)
        const eased = 1 - (1 - p) ** 4
        progress.set(from + (targetProgress - from) * eased)
        if (p < 1) frame = requestAnimationFrame(tick)
        else { frame = 0; animating = false; complete?.() }
      }
      frame = requestAnimationFrame(tick)
    }
    const release = (resumeScroll = 0) => {
      if (closing) { pendingScroll += resumeScroll; return }
      closing = true
      pendingScroll += resumeScroll
      moveTo(triggerRef.current?.progress ?? 0, 280, () => {
        interactiveRef.current = false
        closing = false
        progress.set(triggerRef.current?.progress ?? 0)
        const delta = pendingScroll
        pendingScroll = 0
        if (!delta) return
        const top = scrollY + delta
        const lenis = getLenis()
        if (lenis) lenis.scrollTo(top, { force: true })
        else scrollTo({ top, behavior: 'smooth' })
      })
    }
    const isNativeControl = (target: EventTarget | null) => target instanceof Element
      && Boolean(target.closest('a, button, input, textarea, select, [role="button"], [role="link"], [contenteditable="true"]'))
    const approach = (event: MouseEvent) => {
      if (event.button !== 0 || isNativeControl(event.target)) return
      if (interactiveRef.current) { release(); return }
      const current = triggerRef.current?.progress ?? 0
      if (current > .08) return
      interactiveRef.current = true
      moveTo(.18)
    }
    const key = (event: KeyboardEvent) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || isNativeControl(event.target)) return
      event.preventDefault()
      if (interactiveRef.current) release()
      else if ((triggerRef.current?.progress ?? 0) <= .08) {
        interactiveRef.current = true
        moveTo(.18)
      }
    }
    const interrupt = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        if (interactiveRef.current && !document.querySelector('[role="dialog"], dialog[open]')) {
          event.preventDefault(); release()
        }
        return
      }
      if (!interactiveRef.current && !animating) return
      if (event instanceof WheelEvent) {
        event.preventDefault()
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
        release(event.deltaY * unit)
        return
      }
      if (!(event instanceof KeyboardEvent) || event.defaultPrevented) return
      const distances: Record<string, number> = {
        ArrowUp: -48, ArrowDown: 48, PageUp: -innerHeight * .85, PageDown: innerHeight * .85,
        Home: -scrollY, End: document.documentElement.scrollHeight - innerHeight - scrollY, ' ': innerHeight * .85,
      }
      const distance = distances[event.key]
      if (distance === undefined) return
      event.preventDefault(); release(distance)
    }
    screen.addEventListener('click', approach)
    screen.addEventListener('keydown', key)
    window.addEventListener('wheel', interrupt, { passive: false })
    window.addEventListener('keydown', interrupt)
    return () => {
      cancel()
      interactiveRef.current = false
      screen.removeEventListener('click', approach)
      screen.removeEventListener('keydown', key)
      window.removeEventListener('wheel', interrupt)
      window.removeEventListener('keydown', interrupt)
    }
  }, [page, progress])

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

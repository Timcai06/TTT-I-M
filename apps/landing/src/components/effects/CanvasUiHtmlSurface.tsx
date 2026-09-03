import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { supportsHtmlInCanvas } from '../../lib/canvas-ui/runtime'
import { useCanvasSurfaceSlot } from '../../lib/canvas-ui/canvasSurfaceSlots'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import {
  acquireContext,
  canAcquireOptionalSurface,
  releaseContext,
  subscribeContextRegistry,
} from '../../lib/webgl/contextRegistry'
import { useGLSurface } from '../../lib/webgl/useGLSurface'

export interface CanvasUiHtmlElements {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
  onFirstFrame: () => void
}

export interface CanvasUiHtmlInstance<Options extends object> {
  setOptions(options: Options): void
  resize(): void
  pause(): void
  resume(): void
  destroy(): void
}

export type CanvasUiHtmlFactory<Options extends object> = (
  elements: CanvasUiHtmlElements,
  options: Options,
) => CanvasUiHtmlInstance<Options> | null

const emptySubscribe = () => () => {}

interface CanvasUiHtmlSurfaceProps<Options extends object> {
  children: ReactNode
  className: string
  contentClassName?: string
  effectId: string
  exclusiveGroup?: string
  enabled?: boolean
  options: Options
  loadFactory: () => Promise<CanvasUiHtmlFactory<Options>>
  onActiveChange?: (active: boolean) => void
  onHostChange?: (element: HTMLDivElement | null) => void
  portalOutput?: boolean
  retainFallbackUntilReady?: boolean
  renderMargin?: string
  mountMargin?: string
}

/**
 * Hosts Canvas UI's native HTML-in-Canvas engines. Effects that opt into a
 * seamless handoff retain one semantic fallback sibling while the single
 * captured/interactive subtree prepares; the fallback is hidden only after a
 * successful first frame. Off-screen and hidden-page work is paused, and
 * distant surfaces release their optional context entirely.
 */
export default function CanvasUiHtmlSurface<Options extends object>({
  children,
  className,
  contentClassName,
  effectId,
  exclusiveGroup,
  enabled = true,
  options,
  loadFactory,
  onActiveChange,
  onHostChange,
  portalOutput = false,
  retainFallbackUntilReady = false,
  renderMargin = '160px 0px',
  mountMargin = '80% 0px',
}: CanvasUiHtmlSurfaceProps<Options>) {
  const { ref: hostRef, visible, mounted } = useGLSurface({
    renderMargin,
    mountMargin,
    initiallyMounted: false,
  })
  const sourceRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<CanvasUiHtmlInstance<Options> | null>(null)
  const visibleRef = useRef(visible)
  const supported = useSyncExternalStore(emptySubscribe, supportsHtmlInCanvas, () => false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [failureCount, setFailureCount] = useState(0)
  const [budgetEpoch, retryBudget] = useReducer((value: number) => value + 1, 0)
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

  const bindHost = useCallback((element: HTMLDivElement | null) => {
    hostRef.current = element
    onHostChange?.(element)
  }, [hostRef, onHostChange])

  const nativeCandidate = enabled && supported && !mobile && !reducedMotion && !failed
  const slotGranted = useCanvasSurfaceSlot(exclusiveGroup, nativeCandidate && mounted)
  const native = nativeCandidate && mounted && slotGranted

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    // Chromium's HTML-in-Canvas proposal requires the captured subtree to be
    // explicitly drawable. `layoutsubtree` on the parent canvas only gives the
    // fallback children layout; without this marker drawElementImage can yield
    // an empty frame even though every image is already in the preload cache.
    if (native) content.setAttribute('drawable', '')

    const syncHeight = () => {
      const next = Math.ceil(content.getBoundingClientRect().height)
      if (next > 0) setContentHeight((current) => current === next ? current : next)
    }
    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(content)
    return () => {
      observer.disconnect()
      content.removeAttribute('drawable')
    }
  }, [native])

  useEffect(() => subscribeContextRegistry(() => {
    if (!instanceRef.current && canAcquireOptionalSurface()) retryBudget()
  }), [])

  // A transient GPU reset must never permanently remove an effect for the
  // rest of the visit. Retry twice while the surface is visible, then stay on
  // the complete DOM fallback. Leaving the mount range resets the allowance so
  // a later chapter revisit gets one clean recovery opportunity.
  useEffect(() => {
    if (!failed || !enabled || !mounted || !visible || failureCount > 2) return
    const timer = window.setTimeout(() => setFailed(false), 420 * failureCount)
    return () => window.clearTimeout(timer)
  }, [enabled, failed, failureCount, mounted, visible])

  useEffect(() => {
    if (mounted || !failed) return
    const timer = window.setTimeout(() => {
      setFailureCount(0)
      setFailed(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [failed, mounted])

  useEffect(() => {
    const source = sourceRef.current
    const content = contentRef.current
    const output = outputRef.current
    if (!native || !source || !content || !output) return
    if (!canAcquireOptionalSurface()) return

    let disposed = false
    let registered = false
    let instance: CanvasUiHtmlInstance<Options> | null = null
    const host = hostRef.current
    const paintable = source as HTMLCanvasElement & { requestPaint?: () => void }
    let paintFrame = 0
    const requestPaint = () => {
      if (paintFrame) return
      paintFrame = window.requestAnimationFrame(() => {
        paintFrame = 0
        paintable.requestPaint?.()
      })
    }
    const images = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
    const imageWaitCleanups: Array<() => void> = []
    const waitForImage = (image: HTMLImageElement): Promise<void> => new Promise((resolve) => {
      let settled = false
      const cleanup = () => {
        image.removeEventListener('load', finish)
        image.removeEventListener('error', finish)
      }
      const finish = () => {
        if (settled) return
        settled = true
        cleanup()
        if (image.naturalWidth > 0 && typeof image.decode === 'function') {
          void image.decode().catch(() => undefined).then(() => resolve())
        } else resolve()
      }
      imageWaitCleanups.push(() => {
        cleanup()
        if (!settled) {
          settled = true
          resolve()
        }
      })
      if (image.complete) finish()
      else {
        image.addEventListener('load', finish, { once: true })
        image.addEventListener('error', finish, { once: true })
      }
    })
    // Only block handoff on imagery that is expected to be present in the
    // first visible frame. Deferred gallery alternatives can repaint into the
    // already-stable surface later without making Glass feel network-bound.
    const firstFrameImages = images.filter((image) => (
      image.loading !== 'lazy' || image.classList.contains('is-active')
    ))
    const initialImagesReady = Promise.all(firstFrameImages.map(waitForImage))
    const imageListeners = images.map((image) => {
      image.addEventListener('load', requestPaint)
      image.addEventListener('error', requestPaint)
      if (image.complete) requestPaint()
      return () => {
        image.removeEventListener('load', requestPaint)
        image.removeEventListener('error', requestPaint)
      }
    })

    const onContextLost = (event: Event) => {
      event.preventDefault()
      if (disposed) return
      setReady(false)
      setFailureCount((count) => count + 1)
      setFailed(true)
    }
    const onInvalidate = () => requestPaint()
    output.addEventListener('webglcontextlost', onContextLost)
    host?.addEventListener('canvas-ui:invalidate', onInvalidate)

    void Promise.all([loadFactory(), initialImagesReady])
      .then(([create]) => {
        if (disposed) return
        instance = create({
          source,
          content,
          output,
          onFirstFrame: () => {
            if (!disposed) {
              setFailureCount(0)
              setReady(true)
            }
          },
        }, options)
        if (!instance) {
          setFailureCount((count) => count + 1)
          setFailed(true)
          return
        }
        instanceRef.current = instance
        acquireContext()
        registered = true
        if (!visibleRef.current || document.hidden) instance.pause()
      })
      .catch(() => {
        if (!disposed) {
          setFailureCount((count) => count + 1)
          setFailed(true)
        }
      })

    return () => {
      disposed = true
      window.cancelAnimationFrame(paintFrame)
      imageWaitCleanups.forEach((dispose) => dispose())
      imageListeners.forEach((dispose) => dispose())
      output.removeEventListener('webglcontextlost', onContextLost)
      host?.removeEventListener('canvas-ui:invalidate', onInvalidate)
      setReady(false)
      instanceRef.current = null
      instance?.destroy()
      if (registered) releaseContext()
    }
  }, [budgetEpoch, hostRef, loadFactory, native, options])

  useEffect(() => {
    visibleRef.current = visible
    const instance = instanceRef.current
    if (!instance) return
    const syncActivity = () => {
      if (visible && !document.hidden) instance.resume()
      else instance.pause()
    }
    syncActivity()
    document.addEventListener('visibilitychange', syncActivity)
    return () => document.removeEventListener('visibilitychange', syncActivity)
  }, [ready, visible])

  useEffect(() => {
    if (!native || ready || !visible) return
    const timer = window.setTimeout(() => {
      if (!instanceRef.current) return
      setFailureCount((count) => count + 1)
      setFailed(true)
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [native, ready, visible])

  useEffect(() => {
    instanceRef.current?.setOptions(options)
  }, [options])

  useEffect(() => {
    onActiveChange?.(native && ready)
  }, [native, onActiveChange, ready])

  const state = native
    ? ready ? 'active' : 'loading'
    : nativeCandidate ? 'deferred' : 'fallback'
  const hostStyle = native && !retainFallbackUntilReady && contentHeight > 0
    ? { height: `${contentHeight}px` } satisfies CSSProperties
    : undefined

  const nativeSource = native ? (
    <canvas
      ref={sourceRef}
      // @ts-expect-error Chromium's experimental HTML-in-Canvas attribute is not in React types.
      layoutsubtree="true"
      suppressHydrationWarning
      className="canvas-ui-html__source"
      aria-hidden={retainFallbackUntilReady && !ready ? true : undefined}
    >
      <div ref={contentRef} className={contentClassName}>{children}</div>
    </canvas>
  ) : null
  const nativeOutput = native ? (
    <canvas
      ref={outputRef}
      className={`canvas-ui-html__output${portalOutput ? ' canvas-ui-html__output--viewport' : ''}${ready ? ' is-ready' : ''}`}
      data-canvas-ui-effect={effectId}
      data-canvas-ui-state={state}
      aria-hidden="true"
    />
  ) : null
  const portaledOutput = portalOutput && nativeOutput && typeof document !== 'undefined'
    ? createPortal(nativeOutput, document.body)
    : null
  const localOutput = portalOutput ? null : nativeOutput
  const nativeCanvases = native ? <>{nativeSource}{localOutput}</> : null

  return (
    <>
      <div
        ref={bindHost}
        className={`canvas-ui-html${retainFallbackUntilReady ? ' canvas-ui-html--retained-fallback' : ''} ${className}`}
        data-canvas-ui-effect={effectId}
        data-canvas-ui-state={state}
        style={hostStyle}
      >
        {retainFallbackUntilReady ? (
          <>
            <div
              className={`canvas-ui-html__fallback ${contentClassName ?? ''}`}
              aria-hidden={native && ready ? true : undefined}
            >
              {children}
            </div>
            {nativeCanvases}
          </>
        ) : native ? (
          nativeCanvases
        ) : (
          <div ref={contentRef} className={contentClassName}>{children}</div>
        )}
      </div>
      {portaledOutput}
    </>
  )
}

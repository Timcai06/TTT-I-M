import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
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
  interaction: HTMLElement
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
  preserveDom?: boolean
  renderMargin?: string
  mountMargin?: string
}

/**
 * Hosts Canvas UI's native HTML-in-Canvas engines without duplicating the
 * captured interactive DOM. The source canvas remains visible until the first
 * successfully captured WebGL frame, so initialization failure never blanks a
 * chapter. Off-screen and hidden-page work is paused; distant surfaces release
 * their optional context entirely.
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
  preserveDom = false,
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
  const captureRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<CanvasUiHtmlInstance<Options> | null>(null)
  const visibleRef = useRef(visible)
  const supported = useSyncExternalStore(emptySubscribe, supportsHtmlInCanvas, () => false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [budgetEpoch, retryBudget] = useReducer((value: number) => value + 1, 0)
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

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
    if (native && !preserveDom) content.setAttribute('drawable', '')

    const syncHeight = () => {
      const next = Math.ceil(content.getBoundingClientRect().height)
      if (next > 0) setContentHeight((current) => current === next ? current : next)
    }
    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(content)
    return () => {
      observer.disconnect()
      if (!preserveDom) content.removeAttribute('drawable')
    }
  }, [native, preserveDom])

  useLayoutEffect(() => {
    if (!native || !preserveDom) return
    const source = sourceRef.current
    const content = contentRef.current
    const capture = captureRef.current
    if (!source || !content || !capture) return

    const paintable = source as HTMLCanvasElement & { requestPaint?: () => void }
    let paintFrame = 0
    const requestPaint = () => {
      cancelAnimationFrame(paintFrame)
      paintFrame = requestAnimationFrame(() => paintable.requestPaint?.())
    }
    const syncCapture = () => {
      capture.innerHTML = content.innerHTML
      capture.setAttribute('drawable', '')
      capture.setAttribute('aria-hidden', 'true')
      capture.setAttribute('inert', '')
      capture.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))
      capture.querySelectorAll<HTMLElement>('a, button, input, select, textarea, video').forEach((element) => {
        element.setAttribute('tabindex', '-1')
        element.setAttribute('aria-hidden', 'true')
      })
      capture.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        image.loading = 'eager'
        image.decoding = 'async'
        image.addEventListener('load', requestPaint, { once: true })
        image.addEventListener('error', requestPaint, { once: true })
        if (image.complete) requestPaint()
        else void image.decode().then(requestPaint).catch(() => undefined)
      })
      requestPaint()
    }

    syncCapture()
    const observer = new MutationObserver(syncCapture)
    observer.observe(content, {
      attributes: true,
      attributeFilter: ['class', 'src', 'style'],
      childList: true,
      characterData: true,
      subtree: true,
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(paintFrame)
      capture.replaceChildren()
      capture.removeAttribute('drawable')
    }
  }, [native, preserveDom])

  useEffect(() => subscribeContextRegistry(() => {
    if (!instanceRef.current && canAcquireOptionalSurface()) retryBudget()
  }), [])

  useEffect(() => {
    const source = sourceRef.current
    const interaction = contentRef.current
    const content = preserveDom ? captureRef.current : interaction
    const output = outputRef.current
    if (!native || !source || !content || !interaction || !output) return
    if (!canAcquireOptionalSurface()) return

    let disposed = false
    let registered = false
    let instance: CanvasUiHtmlInstance<Options> | null = null
    const paintable = source as HTMLCanvasElement & { requestPaint?: () => void }
    const requestPaint = () => paintable.requestPaint?.()
    const images = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
    const imageListeners = images.map((image) => {
      image.addEventListener('load', requestPaint)
      image.addEventListener('error', requestPaint)
      if (image.complete) requestPaint()
      else void image.decode?.().then(requestPaint).catch(() => undefined)
      return () => {
        image.removeEventListener('load', requestPaint)
        image.removeEventListener('error', requestPaint)
      }
    })

    const onContextLost = (event: Event) => {
      event.preventDefault()
      if (disposed) return
      setReady(false)
      setFailed(true)
    }
    output.addEventListener('webglcontextlost', onContextLost)

    void loadFactory()
      .then((create) => {
        if (disposed) return
        instance = create({
          source,
          content,
          interaction,
          output,
          onFirstFrame: () => {
            if (!disposed) setReady(true)
          },
        }, options)
        if (!instance) {
          setFailed(true)
          return
        }
        instanceRef.current = instance
        acquireContext()
        registered = true
        if (!visibleRef.current || document.hidden) instance.pause()
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })

    return () => {
      disposed = true
      imageListeners.forEach((dispose) => dispose())
      output.removeEventListener('webglcontextlost', onContextLost)
      setReady(false)
      instanceRef.current = null
      instance?.destroy()
      if (registered) releaseContext()
    }
  }, [budgetEpoch, loadFactory, native, options, preserveDom])

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
    instanceRef.current?.setOptions(options)
  }, [options])

  useEffect(() => {
    onActiveChange?.(native && ready)
  }, [native, onActiveChange, ready])

  const state = native
    ? ready ? 'active' : 'loading'
    : nativeCandidate ? 'deferred' : 'fallback'
  const hostStyle = native && !preserveDom && contentHeight > 0
    ? { height: `${contentHeight}px` } satisfies CSSProperties
    : undefined

  return (
    <div
      ref={hostRef}
      className={`canvas-ui-html${preserveDom ? ' canvas-ui-html--preserve-dom' : ''} ${className}`}
      data-canvas-ui-effect={effectId}
      data-canvas-ui-state={state}
      style={hostStyle}
    >
      {preserveDom ? (
        <div ref={contentRef} className={contentClassName}>{children}</div>
      ) : null}
      {native ? (
        <>
          <canvas
            ref={sourceRef}
            // @ts-expect-error Chromium's experimental HTML-in-Canvas attribute is not in React types.
            layoutsubtree="true"
            suppressHydrationWarning
            className="canvas-ui-html__source"
          >
            {preserveDom ? (
              <div ref={captureRef} className={contentClassName} aria-hidden="true" />
            ) : (
              <div ref={contentRef} className={contentClassName}>{children}</div>
            )}
          </canvas>
          <canvas
            ref={outputRef}
            className={`canvas-ui-html__output${ready ? ' is-ready' : ''}`}
            aria-hidden="true"
          />
        </>
      ) : !preserveDom ? (
        <div ref={contentRef} className={contentClassName}>{children}</div>
      ) : null}
    </div>
  )
}

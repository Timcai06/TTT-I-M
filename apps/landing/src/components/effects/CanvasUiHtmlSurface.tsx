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
  const [budgetEpoch, retryBudget] = useReducer((value: number) => value + 1, 0)
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

  const nativeCandidate = enabled && supported && !mobile && !reducedMotion && !failed
  const slotGranted = useCanvasSurfaceSlot(exclusiveGroup, nativeCandidate && mounted)
  const native = nativeCandidate && mounted && slotGranted

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const syncHeight = () => {
      const next = Math.ceil(content.getBoundingClientRect().height)
      if (next > 0) setContentHeight((current) => current === next ? current : next)
    }
    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(content)
    return () => observer.disconnect()
  }, [native])

  useEffect(() => subscribeContextRegistry(() => {
    if (!instanceRef.current && canAcquireOptionalSurface()) retryBudget()
  }), [])

  useEffect(() => {
    const source = sourceRef.current
    const content = contentRef.current
    const output = outputRef.current
    if (!native || !source || !content || !output) return
    if (!canAcquireOptionalSurface()) return

    let disposed = false
    let registered = false
    let instance: CanvasUiHtmlInstance<Options> | null = null

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
      output.removeEventListener('webglcontextlost', onContextLost)
      setReady(false)
      instanceRef.current = null
      instance?.destroy()
      if (registered) releaseContext()
    }
  }, [budgetEpoch, loadFactory, native, options])

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
  const hostStyle = native && contentHeight > 0
    ? { height: `${contentHeight}px` } satisfies CSSProperties
    : undefined

  return (
    <div
      ref={hostRef}
      className={`canvas-ui-html ${className}`}
      data-canvas-ui-effect={effectId}
      data-canvas-ui-state={state}
      style={hostStyle}
    >
      {native ? (
        <>
          <canvas
            ref={sourceRef}
            // @ts-expect-error Chromium's experimental HTML-in-Canvas attribute is not in React types.
            layoutsubtree="true"
            suppressHydrationWarning
            className="canvas-ui-html__source"
          >
            <div ref={contentRef} className={contentClassName}>{children}</div>
          </canvas>
          <canvas
            ref={outputRef}
            className={`canvas-ui-html__output${ready ? ' is-ready' : ''}`}
            aria-hidden="true"
          />
        </>
      ) : (
        <div ref={contentRef} className={contentClassName}>{children}</div>
      )}
    </div>
  )
}

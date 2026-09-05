import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { supportsHtmlInCanvas } from '../../lib/canvas-ui/runtime'
import { useCanvasSurfaceSlot } from '../../lib/canvas-ui/canvasSurfaceSlots'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  forceLoseCanvasWebGLContext,
  getWebGLRecoveryDelay,
  type ContextLease,
} from '../../lib/webgl/contextRegistry'
import { useGLSurface } from '../../lib/webgl/useGLSurface'

export interface CanvasUiHtmlElements {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
  hasVisibleCapture: () => boolean
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
const INITIAL_IMAGE_WAIT_MS = 1_400
const FACTORY_STARTUP_WAIT_MS = 4_000
const FIRST_FRAME_WAIT_MS = 2_400
const CAPTURE_ATTRIBUTE = 'data-canvas-ui-capture'
const CAPTURE_INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [tabindex], [contenteditable]'

function captureHasVisiblePixels(source: HTMLCanvasElement): boolean {
  const probe = document.createElement('canvas')
  probe.width = 16
  probe.height = 16
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context || source.width < 1 || source.height < 1) return false

  try {
    context.drawImage(source, 0, 0, probe.width, probe.height)
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data
    for (let index = 3; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) > 0) return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * HTML-in-Canvas only paints descendants owned by its layoutsubtree canvas.
 * Keep React's one semantic/interactive tree in normal document flow and
 * mirror it into a stable, inert capture root owned by the source canvas.
 * The root itself stays stable because the vendored drivers retain its
 * reference for resize and drawElementImage calls.
 */
function syncCaptureSubtree(content: HTMLElement, capture: HTMLElement): void {
  const snapshot = content.cloneNode(true) as HTMLElement

  for (const attribute of Array.from(capture.attributes)) {
    capture.removeAttribute(attribute.name)
  }
  for (const attribute of Array.from(snapshot.attributes)) {
    if (attribute.name !== 'id') capture.setAttribute(attribute.name, attribute.value)
  }

  capture.setAttribute('drawable', '')
  capture.setAttribute(CAPTURE_ATTRIBUTE, '')
  capture.setAttribute('aria-hidden', 'true')
  capture.setAttribute('inert', '')
  capture.replaceChildren(...Array.from(snapshot.childNodes))

  capture.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
    element.removeAttribute('id')
  })
  capture.querySelectorAll<HTMLElement>(CAPTURE_INTERACTIVE_SELECTOR).forEach((element) => {
    element.setAttribute('tabindex', '-1')
    element.removeAttribute('autofocus')
  })

  const liveImages = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
  capture.querySelectorAll<HTMLImageElement>('img').forEach((image, index) => {
    const liveImage = liveImages[index]
    const resolvedSource = liveImage?.currentSrc || liveImage?.src
    if (!resolvedSource) return
    image.removeAttribute('srcset')
    image.removeAttribute('sizes')
    if (liveImage.classList.contains('is-active') || liveImage.loading !== 'lazy') {
      image.loading = 'eager'
    }
    image.src = resolvedSource
  })
}

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
  renderMargin?: string
  mountMargin?: string
}

/**
 * Hosts Canvas UI's WebGL presentation over exactly one semantic DOM subtree.
 * Native HTML-in-Canvas must supply real pixels before the effect is ready.
 * The real DOM always owns layout and
 * interaction, while off-screen work pauses and distant surfaces release
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
  onHostChange,
  portalOutput = false,
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
  const captureSupported = useSyncExternalStore(emptySubscribe, supportsHtmlInCanvas, () => false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [failureCount, setFailureCount] = useState(0)
  const mobile = useMobileExperience()
  const reducedMotion = useReducedMotion()

  const failLiveInstance = useCallback((instance: CanvasUiHtmlInstance<Options>) => {
    if (instanceRef.current !== instance) return
    instanceRef.current = null
    setReady(false)
    setFailureCount((count) => count + 1)
    setFailed(true)
  }, [])

  const bindHost = useCallback((element: HTMLDivElement | null) => {
    hostRef.current = element
    onHostChange?.(element)
  }, [hostRef, onHostChange])

  // These effects are ready only when real page pixels reach their texture.
  const effectCandidate = enabled && captureSupported && !mobile && !reducedMotion && !failed
  const slotGranted = useCanvasSurfaceSlot(exclusiveGroup, effectCandidate && mounted)
  const effectActive = effectCandidate && mounted && slotGranted

  // A transient GPU reset must never permanently remove an effect for the
  // rest of the visit. Context reclamation after WEBGL_lose_context is
  // asynchronous on software renderers, so visible surfaces use the shared
  // bounded backoff. Leaving the mount range resets the recovery allowance.
  useEffect(() => {
    if (!failed || !enabled || !mounted || !visible) return
    const delay = getWebGLRecoveryDelay(failureCount)
    if (delay === null) return
    const timer = window.setTimeout(() => setFailed(false), delay)
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
    if (!effectActive || !source || !content || !output) return

    let disposed = false
    let contextLease: ContextLease | null = null
    let instance: CanvasUiHtmlInstance<Options> | null = null
    let stopWaitingForContext = () => {}
    const host = hostRef.current
    const paintable = source as HTMLCanvasElement & { requestPaint?: () => void }
    const capture = content.cloneNode(false) as HTMLElement
    let paintFrame = 0
    let captureFrame = 0
    let startupTimer = 0
    let firstFrameTimer = 0
    let firstFrameSeen = false
    let failureReported = false
    const failSurface = () => {
      if (disposed || failureReported) return
      failureReported = true
      setReady(false)
      setFailureCount((count) => count + 1)
      setFailed(true)
    }
    const refreshCapture = () => {
      syncCaptureSubtree(content, capture)
    }
    const requestPaint = () => {
      if (paintFrame) return
      paintFrame = window.requestAnimationFrame(() => {
        paintFrame = 0
        paintable.requestPaint?.()
      })
    }
    const scheduleCaptureRefresh = () => {
      if (captureFrame) return
      captureFrame = window.requestAnimationFrame(() => {
        captureFrame = 0
        refreshCapture()
        instance?.resize()
        requestPaint()
      })
    }
    refreshCapture()
    source.replaceChildren(capture)

    const images = Array.from(capture.querySelectorAll<HTMLImageElement>('img'))
    const liveImages = Array.from(content.querySelectorAll<HTMLImageElement>('img'))
    const imageWaitCleanups: Array<() => void> = []
    const waitForImage = (image: HTMLImageElement): Promise<boolean> => new Promise((resolve) => {
      let settled = false
      let timer = 0
      const detach = () => {
        image.removeEventListener('load', finish)
        image.removeEventListener('error', finish)
      }
      const settle = (available: boolean) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        detach()
        resolve(available)
      }
      const finish = () => {
        if (settled) return
        detach()
        if (image.naturalWidth > 0 && typeof image.decode === 'function') {
          void image.decode().then(
            () => settle(true),
            () => settle(image.naturalWidth > 0),
          )
        } else settle(image.naturalWidth > 0)
      }
      imageWaitCleanups.push(() => settle(false))
      timer = window.setTimeout(() => settle(false), INITIAL_IMAGE_WAIT_MS)
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
    const initialImagesReady = captureSupported
      ? Promise.all(firstFrameImages.map(waitForImage)).then((availability) => {
          if (availability.some((available) => !available)) {
            throw new Error('Canvas UI first-frame image did not become drawable before its deadline.')
          }
        })
      : Promise.resolve()
    const imageListeners = liveImages.map((image) => {
      const refreshAndPaint = () => {
        scheduleCaptureRefresh()
      }
      image.addEventListener('load', refreshAndPaint)
      image.addEventListener('error', refreshAndPaint)
      if (image.complete) refreshAndPaint()
      return () => {
        image.removeEventListener('load', refreshAndPaint)
        image.removeEventListener('error', refreshAndPaint)
      }
    })

    const onContextLost = (event: Event) => {
      event.preventDefault()
      failSurface()
    }
    const onCaptureResource = () => requestPaint()
    const onInvalidate = () => scheduleCaptureRefresh()
    const mutationObserver = new MutationObserver(scheduleCaptureRefresh)
    mutationObserver.observe(content, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'aria-selected', 'class', 'src', 'srcset'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    output.addEventListener('webglcontextlost', onContextLost)
    source.addEventListener('load', onCaptureResource, true)
    source.addEventListener('error', onCaptureResource, true)
    host?.addEventListener('canvas-ui:invalidate', onInvalidate)
    startupTimer = window.setTimeout(failSurface, FACTORY_STARTUP_WAIT_MS)

    void Promise.all([loadFactory(), initialImagesReady])
      .then(([create]) => {
        if (disposed) return
        window.clearTimeout(startupTimer)
        startupTimer = 0
        stopWaitingForContext = acquireOptionalContextWhenAvailable(
          `canvas-ui:${effectId}`,
          (lease) => {
            if (disposed) {
              lease.release()
              return
            }
            contextLease = lease
            try {
              instance = create({
                source,
                content: capture,
                output,
                hasVisibleCapture: () => (
                  captureSupported && captureHasVisiblePixels(source)
                ),
                onFirstFrame: () => {
                  firstFrameSeen = true
                  window.clearTimeout(firstFrameTimer)
                  firstFrameTimer = 0
                  if (!disposed && !failureReported) {
                    setFailureCount(0)
                    setReady(true)
                  }
                },
              }, options)
            } catch {
              forceLoseCanvasWebGLContext(output)
              contextLease.release()
              contextLease = null
              failSurface()
              return
            }
            if (!instance) {
              forceLoseCanvasWebGLContext(output)
              contextLease.release()
              contextLease = null
              failSurface()
              return
            }
            instanceRef.current = instance
            if (!firstFrameSeen) {
              firstFrameTimer = window.setTimeout(failSurface, FIRST_FRAME_WAIT_MS)
            }
            if (!visibleRef.current || document.hidden) {
              try {
                instance.pause()
              } catch {
                instanceRef.current = null
                failSurface()
              }
            }
          },
        )
      })
      .catch(() => {
        failSurface()
      })

    return () => {
      disposed = true
      stopWaitingForContext()
      window.cancelAnimationFrame(paintFrame)
      window.cancelAnimationFrame(captureFrame)
      window.clearTimeout(startupTimer)
      window.clearTimeout(firstFrameTimer)
      imageWaitCleanups.forEach((dispose) => dispose())
      imageListeners.forEach((dispose) => dispose())
      mutationObserver.disconnect()
      output.removeEventListener('webglcontextlost', onContextLost)
      source.removeEventListener('load', onCaptureResource, true)
      source.removeEventListener('error', onCaptureResource, true)
      host?.removeEventListener('canvas-ui:invalidate', onInvalidate)
      source.replaceChildren()
      setReady(false)
      instanceRef.current = null
      try {
        instance?.destroy()
      } catch {
        // Cleanup must still release the registry lease after a driver error.
      } finally {
        if (instance) forceLoseCanvasWebGLContext(output)
        contextLease?.release()
      }
    }
  }, [captureSupported, effectActive, effectId, hostRef, loadFactory, options])

  useEffect(() => {
    visibleRef.current = visible
    const instance = instanceRef.current
    if (!instance) return
    const syncActivity = () => {
      try {
        if (visible && !document.hidden) instance.resume()
        else instance.pause()
      } catch {
        failLiveInstance(instance)
      }
    }
    syncActivity()
    document.addEventListener('visibilitychange', syncActivity)
    return () => document.removeEventListener('visibilitychange', syncActivity)
  }, [failLiveInstance, ready, visible])

  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return
    try {
      instance.setOptions(options)
    } catch {
      failLiveInstance(instance)
    }
  }, [failLiveInstance, options])

  useEffect(() => {
    onActiveChange?.(effectActive && ready)
  }, [effectActive, onActiveChange, ready])

  useEffect(() => () => onActiveChange?.(false), [onActiveChange])

  const state = effectActive
    ? ready ? 'active' : 'loading'
    : effectCandidate ? 'deferred' : 'fallback'

  const effectSource = effectActive ? (
    <canvas
      ref={sourceRef}
      layoutsubtree="true"
      suppressHydrationWarning
      className="canvas-ui-html__source"
      aria-hidden="true"
    />
  ) : null
  const effectOutput = effectActive ? (
    <canvas
      ref={outputRef}
      className={`canvas-ui-html__output${portalOutput ? ' canvas-ui-html__output--viewport' : ''}${ready ? ' is-ready' : ''}`}
      data-canvas-ui-effect={effectId}
      data-canvas-ui-state={state}
      aria-hidden="true"
    />
  ) : null
  const portaledOutput = portalOutput && effectOutput && typeof document !== 'undefined'
    ? createPortal(effectOutput, document.body)
    : null
  const localOutput = portalOutput ? null : effectOutput
  const effectCanvases = effectActive ? <>{effectSource}{localOutput}</> : null

  return (
    <>
      <div
        ref={bindHost}
        className={`canvas-ui-html ${className}`}
        data-canvas-ui-effect={effectId}
        data-canvas-ui-state={state}
      >
        <div ref={contentRef} className={contentClassName}>{children}</div>
        {effectCanvases}
      </div>
      {portaledOutput}
    </>
  )
}

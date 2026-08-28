import { useRef } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'

export interface ScrollExpandProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  src?: string
  mediaType?: 'image' | 'video'
  poster?: string
  alt?: string
  title?: string
  scrollHint?: string
  startWidth?: number
  startHeight?: number
  startRadius?: number
  endRadius?: number
  mediaZoom?: number
  scrollDistance?: number
  holdDistance?: number
  smoothing?: number
  overlayScrim?: number
  useWindowScroll?: boolean
  enabled?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * React Bits ScrollExpand adapted to the landing's single GSAP/Lenis lifecycle.
 * The visual contract is unchanged: a cropped frame opens to full bleed, its
 * title exits, and overlay content takes over. A page-wide ScrollTrigger only
 * provides the existing Lenis-synchronised update pulse; progress is derived
 * from the track's live viewport position so late upstream layout cannot leave
 * this scene attached to stale document coordinates.
 */
export default function ScrollExpand({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = '',
  style,
  ...rest
}: ScrollExpandProps) {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const media = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const titleNode = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const rootNode = root.current
    const trackNode = track.current
    const stageNode = stage.current
    const frameNode = frame.current
    const mediaNode = media.current
    if (!rootNode || !trackNode || !stageNode || !frameNode || !mediaNode) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startInsetX = Math.max(0, (100 - clamp(startWidth, 1, 100)) / 2)
    const startInsetY = Math.max(0, (100 - clamp(startHeight, 1, 100)) / 2)
    let stageHeight = 0

    const measure = () => {
      stageHeight = useWindowScroll ? window.innerHeight : rootNode.clientHeight
      if (stageHeight <= 0) return
      const travel = Math.max(0.01, scrollDistance) + Math.max(0, holdDistance)
      stageNode.style.height = `${stageHeight}px`
      trackNode.style.height = `${stageHeight * (1 + travel)}px`
      const width = rootNode.clientWidth || stageHeight
      stageNode.style.setProperty('--se-title-size', `${clamp(width * 0.075, 20, 84)}px`)
    }

    measure()

    if (!enabled || reduceMotion) {
      trackNode.style.height = `${stageHeight}px`
      gsap.set(frameNode, {
        '--se-inset-x': '0%',
        '--se-inset-y': '0%',
        '--se-radius': `${endRadius}px`,
      })
      gsap.set(mediaNode, { scale: 1 })
      gsap.set(scrim.current, { opacity: overlayScrim })
      gsap.set(titleNode.current, { autoAlpha: 0 })
      gsap.set(hint.current, { autoAlpha: 0 })
      gsap.set(overlay.current, { autoAlpha: 1, y: 0 })
      requestScrollRefresh()
      return
    }

    gsap.set(frameNode, {
      '--se-inset-x': `${startInsetX}%`,
      '--se-inset-y': `${startInsetY}%`,
      '--se-radius': `${startRadius}px`,
    })
    gsap.set(mediaNode, { scale: mediaZoom })
    gsap.set(scrim.current, { opacity: 0 })
    gsap.set(titleNode.current, { autoAlpha: 1, y: 0, scale: 1 })
    gsap.set(hint.current, { autoAlpha: 1, y: 0 })
    gsap.set(overlay.current, { autoAlpha: 0, y: 18 })

    const timeline = gsap.timeline({ defaults: { ease: 'none' }, paused: true })

    timeline
      .to(frameNode, {
        '--se-inset-x': '0%',
        '--se-inset-y': '0%',
        '--se-radius': `${endRadius}px`,
        duration: 1,
      }, 0)
      .to(mediaNode, { scale: 1, duration: 1 }, 0)
      .to(hint.current, { autoAlpha: 0, y: 8, duration: 0.12 }, 0)
      .to(titleNode.current, { autoAlpha: 0, y: -28, scale: 1.06, duration: 0.48 }, 0.4)
      .to(scrim.current, { opacity: overlayScrim, duration: 0.32 }, 0.68)
      .to(overlay.current, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' }, 0.68)

    const progressState = { value: 0 }
    const renderProgress = () => timeline.progress(progressState.value)
    const followProgress = smoothing <= 0
      ? (value: number) => {
          progressState.value = value
          renderProgress()
        }
      : gsap.quickTo(progressState, 'value', {
          duration: smoothing,
          ease: 'power1.out',
          onUpdate: renderProgress,
        })

    const readProgress = () => {
      const span = stageHeight * Math.max(0.01, scrollDistance)
      if (useWindowScroll) return clamp(-trackNode.getBoundingClientRect().top / span, 0, 1)
      return clamp(rootNode.scrollTop / span, 0, 1)
    }

    const syncProgress = () => followProgress(readProgress())
    const driver = ScrollTrigger.create({
      trigger: useWindowScroll ? document.documentElement : rootNode,
      scroller: useWindowScroll ? undefined : rootNode,
      start: 0,
      end: 'max',
      onRefreshInit: measure,
      onRefresh: syncProgress,
      onUpdate: syncProgress,
    })

    syncProgress()

    const resizeObserver = new ResizeObserver(() => requestScrollRefresh())
    resizeObserver.observe(rootNode)
    requestScrollRefresh()

    return () => {
      driver.kill()
      resizeObserver.disconnect()
    }
  }, {
    scope: root,
    dependencies: [
      enabled,
      endRadius,
      holdDistance,
      mediaZoom,
      overlayScrim,
      scrollDistance,
      smoothing,
      startHeight,
      startRadius,
      startWidth,
      useWindowScroll,
    ],
    revertOnUpdate: true,
  })

  const mediaNode = mediaType === 'video' ? (
    <video
      ref={(node) => { media.current = node }}
      className="scroll-expand__media"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
    />
  ) : (
    <img
      ref={(node) => { media.current = node }}
      className="scroll-expand__media"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  )

  return (
    <div
      ref={root}
      className={`scroll-expand${useWindowScroll ? '' : ' scroll-expand--scroller'}${className ? ` ${className}` : ''}`}
      style={style}
      {...rest}
    >
      <div ref={track} className="scroll-expand__track">
        <div ref={stage} className="scroll-expand__stage">
          <div ref={frame} className="scroll-expand__frame">
            {mediaNode}
            <div ref={scrim} className="scroll-expand__scrim" aria-hidden="true" />
            {children ? <div ref={overlay} className="scroll-expand__overlay">{children}</div> : null}
          </div>
          {title ? <div ref={titleNode} className="scroll-expand__title">{title}</div> : null}
          {scrollHint ? <div ref={hint} className="scroll-expand__hint">{scrollHint}</div> : null}
        </div>
      </div>
    </div>
  )
}

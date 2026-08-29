import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Key, ReactNode, RefObject } from 'react'

export type LogoItem =
  | { node: ReactNode; href?: string; title?: string; ariaLabel?: string }
  | { src: string; alt?: string; href?: string; title?: string; width?: number; height?: number }

export type LogoLoopProps = {
  logos: LogoItem[]
  speed?: number
  direction?: 'left' | 'right' | 'up' | 'down'
  width?: number | string
  logoHeight?: number
  gap?: number
  hoverSpeed?: number
  fadeOut?: boolean
  fadeOutColor?: string
  scaleOnHover?: boolean
  renderItem?: (item: LogoItem, key: Key) => ReactNode
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

const MIN_COPIES = 2
const COPY_HEADROOM = 2
const SMOOTH_TAU = 0.25

function useMeasuredSequence(
  containerRef: RefObject<HTMLDivElement | null>,
  sequenceRef: RefObject<HTMLUListElement | null>,
  vertical: boolean,
  dependencies: readonly unknown[],
) {
  const [size, setSize] = useState({ sequence: 0, copies: MIN_COPIES })

  useEffect(() => {
    const container = containerRef.current
    const sequence = sequenceRef.current
    if (!container || !sequence) return

    const measure = () => {
      const rect = sequence.getBoundingClientRect()
      const sequenceSize = Math.ceil(vertical ? rect.height : rect.width)
      const viewportSize = vertical ? container.clientHeight : container.clientWidth
      if (sequenceSize <= 0) return
      setSize({
        sequence: sequenceSize,
        copies: Math.max(MIN_COPIES, Math.ceil(viewportSize / sequenceSize) + COPY_HEADROOM),
      })
    }

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(sequence)
    sequence.querySelectorAll('img').forEach((image) => {
      image.addEventListener('load', measure, { once: true })
      image.addEventListener('error', measure, { once: true })
    })
    measure()

    return () => observer.disconnect()
    // The logo content and layout props intentionally trigger a fresh measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, sequenceRef, vertical, ...dependencies])

  return size
}

function useLoopActivity(containerRef: RefObject<HTMLDivElement | null>) {
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden')
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      rootMargin: '120px',
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = () => setReducedMotion(media.matches)
    const onVisibilityChange = () => setPageVisible(document.visibilityState !== 'hidden')
    media.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      media.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return inView && pageVisible && !reducedMotion
}

export const LogoLoop = memo(function LogoLoop({
  logos,
  speed = 120,
  direction = 'left',
  width = '100%',
  logoHeight = 28,
  gap = 32,
  hoverSpeed = 0,
  fadeOut = false,
  fadeOutColor,
  scaleOnHover = false,
  renderItem,
  ariaLabel = 'Partner logos',
  className = '',
  style,
}: LogoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<HTMLUListElement>(null)
  const offsetRef = useRef(0)
  const velocityRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const vertical = direction === 'up' || direction === 'down'
  const active = useLoopActivity(containerRef)
  const { sequence, copies } = useMeasuredSequence(
    containerRef,
    sequenceRef,
    vertical,
    [logos, gap, logoHeight],
  )

  const velocity = useMemo(() => {
    const directionSign = direction === 'left' || direction === 'up' ? 1 : -1
    return Math.abs(speed) * directionSign * (speed < 0 ? -1 : 1)
  }, [direction, speed])

  useEffect(() => {
    const track = trackRef.current
    if (!track || sequence <= 0 || !active) return
    let frame = 0
    let previous = 0

    const tick = (now: number) => {
      const delta = previous ? Math.min(0.05, (now - previous) / 1000) : 0
      previous = now
      const target = hovered ? hoverSpeed : velocity
      velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-delta / SMOOTH_TAU))
      offsetRef.current = (offsetRef.current + velocityRef.current * delta + sequence) % sequence
      track.style.transform = vertical
        ? `translate3d(0, ${-offsetRef.current}px, 0)`
        : `translate3d(${-offsetRef.current}px, 0, 0)`
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [active, hoverSpeed, hovered, sequence, velocity, vertical])

  const renderLogo = useCallback((item: LogoItem, key: Key) => {
    if (renderItem) return <li className="logoloop__item" key={key}>{renderItem(item, key)}</li>
    const content = 'node' in item
      ? <span className="logoloop__node">{item.node}</span>
      : <img src={item.src} alt={item.alt ?? ''} title={item.title} width={item.width} height={item.height} loading="lazy" decoding="async" draggable={false} />
    return (
      <li className="logoloop__item" key={key}>
        {item.href
          ? <a className="logoloop__link" href={item.href} aria-label={'node' in item ? item.ariaLabel ?? item.title : item.alt ?? item.title} target="_blank" rel="noreferrer noopener">{content}</a>
          : content}
      </li>
    )
  }, [renderItem])

  const rootClassName = [
    'logoloop',
    vertical ? 'logoloop--vertical' : 'logoloop--horizontal',
    fadeOut && 'logoloop--fade',
    scaleOnHover && 'logoloop--scale-hover',
    className,
  ].filter(Boolean).join(' ')

  const rootStyle = {
    '--logoloop-gap': `${gap}px`,
    '--logoloop-logo-height': `${logoHeight}px`,
    ...(fadeOutColor ? { '--logoloop-fade-color': fadeOutColor } : {}),
    width: typeof width === 'number' ? `${width}px` : width,
    ...style,
  } as CSSProperties

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      style={rootStyle}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        ref={trackRef}
        className="logoloop__track"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {Array.from({ length: copies }, (_, copyIndex) => (
          <ul
            className="logoloop__list"
            key={`copy-${copyIndex}`}
            ref={copyIndex === 0 ? sequenceRef : undefined}
            aria-hidden={copyIndex > 0}
          >
            {logos.map((item, itemIndex) => renderLogo(item, `${copyIndex}-${itemIndex}`))}
          </ul>
        ))}
      </div>
    </div>
  )
})

export default LogoLoop

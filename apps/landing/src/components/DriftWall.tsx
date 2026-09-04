import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from '../lib/motion'

export type DriftWallTone = 'warm' | 'cool' | 'neutral' | 'dark'

export interface DriftWallItem {
  image: string
  title?: string
  href?: string
  tone?: DriftWallTone
}

interface DriftWallProps {
  items: DriftWallItem[]
  columns?: number
  tileWidth?: number
  tileHeight?: number
  gap?: number
  radius?: number
  tilt?: number
  turn?: number
  roll?: number
  scale?: number
  perspective?: number
  depth?: number
  speed?: number
  direction?: 'up' | 'down'
  variance?: number
  parallax?: number
  pauseOnHover?: boolean
  lift?: number
  fade?: number
  dim?: number
  grayscale?: boolean
  overlayColor?: string
  className?: string
  style?: CSSProperties
}

const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

const TONE_SEQUENCE: DriftWallTone[] = ['dark', 'warm', 'cool', 'neutral']

export default function DriftWall({
  items,
  columns = 5,
  tileWidth = 220,
  tileHeight = 154,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  scale = 1.18,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#080a0c',
  className = '',
  style,
}: DriftWallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])
  const offsetsRef = useRef<number[]>([])
  const velocitiesRef = useRef<number[]>([])
  const hoveredColRef = useRef(-1)
  const wallHoveredRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const pointerDampedRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [height, setHeight] = useState(620)
  const reducedMotion = useReducedMotion()
  const [renderActive, setRenderActive] = useState(false)

  const safeItems = useMemo<DriftWallItem[]>(
    () => items.length > 0 ? items : [{ image: '', title: 'Archive', tone: 'neutral' }],
    [items],
  )

  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root) return

    const measure = () => {
      setHeight(root.getBoundingClientRect().height || root.clientHeight || 620)
    }
    measure()
    const resize = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const entry = entries[0]
          if (entry) setHeight(entry.contentRect.height || 620)
        })
    if (resize) resize.observe(root)
    else window.addEventListener('resize', measure, { passive: true })

    let inView = typeof IntersectionObserver === 'undefined'
    const syncActivity = () => {
      setRenderActive(inView && document.visibilityState !== 'hidden')
    }
    const visibility = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          const entry = entries[0]
          if (!entry) return
          inView = entry.isIntersecting
          syncActivity()
        }, { rootMargin: '20% 0px', threshold: 0.01 })
    visibility?.observe(root)
    syncActivity()
    document.addEventListener('visibilitychange', syncActivity)
    return () => {
      resize?.disconnect()
      if (!resize) window.removeEventListener('resize', measure)
      visibility?.disconnect()
      document.removeEventListener('visibilitychange', syncActivity)
    }
  }, [])

  const columnItems = useMemo(() => {
    const count = Math.min(safeItems.length, 5)

    if (!safeItems.some((item) => item.tone)) {
      return Array.from({ length: Math.max(1, columns) }, (_, column) =>
        Array.from({ length: count }, (_, slot) => safeItems[(column * 5 + slot * 3) % safeItems.length]!),
      )
    }

    const toneBuckets: Record<DriftWallTone, DriftWallItem[]> = {
      warm: [],
      cool: [],
      neutral: [],
      dark: [],
    }
    safeItems.forEach((item) => toneBuckets[item.tone ?? 'neutral'].push(item))
    const toneUse: Record<DriftWallTone, number> = { warm: 0, cool: 0, neutral: 0, dark: 0 }

    return Array.from({ length: Math.max(1, columns) }, (_, column) =>
      Array.from({ length: count }, (_, slot) => {
        const desiredTone = TONE_SEQUENCE[(column * 2 + slot) % TONE_SEQUENCE.length]!
        const bucket = toneBuckets[desiredTone]
        const fallback = safeItems[(column * 5 + slot * 3) % safeItems.length]!
        if (bucket.length === 0) return fallback
        const item = bucket[toneUse[desiredTone] % bucket.length]!
        toneUse[desiredTone] += 1
        return item
      }),
    )
  }, [columns, safeItems])

  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap
    return columnItems.map((column) => {
      const copyHeight = Math.max(unit, column.length * unit)
      return { copyHeight, copies: Math.max(2, Math.ceil((height * 1.6) / copyHeight) + 1) }
    })
  }, [columnItems, gap, height, tileHeight])

  const baseVelocities = useMemo(() => {
    const directionSign = direction === 'up' ? 1 : -1
    return columnItems.map((_, index) => speed * columnFactor(index, variance) * directionSign * (index % 2 === 0 ? 1 : -1))
  }, [columnItems, direction, speed, variance])

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, index) => meta.copyHeight * ((index * 0.37) % 1))
    velocitiesRef.current = columnItems.map(() => 0)
  }, [columnItems, columnMeta])

  const applyPlaneTransform = useCallback((pointerX: number, pointerY: number) => {
    if (!planeRef.current) return
    planeRef.current.style.transform =
      `translate(-50%, -50%) scale(${scale}) rotateX(${tilt + pointerY}deg) ` +
      `rotateY(${turn + pointerX}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`
  }, [depth, roll, scale, tilt, turn])

  useEffect(() => {
    if (!renderActive || reducedMotion) {
      lastTimeRef.current = null
      if (reducedMotion) applyPlaneTransform(0, 0)
      return
    }
    const animate = (time: number) => {
      frameRef.current = requestAnimationFrame(animate)
      if (lastTimeRef.current === null) lastTimeRef.current = time
      const delta = Math.min(0.05, Math.max(0, time - lastTimeRef.current) / 1000)
      lastTimeRef.current = time
      const maxTilt = parallax * 8
      const damp = 1 - Math.exp(-delta / 0.12)
      pointerDampedRef.current.x += (pointerRef.current.x * maxTilt - pointerDampedRef.current.x) * damp
      pointerDampedRef.current.y += (-pointerRef.current.y * maxTilt - pointerDampedRef.current.y) * damp
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y)
      trackRefs.current.forEach((track, index) => {
        const meta = columnMeta[index]
        if (!track || !meta) return
        const paused = (wallHoveredRef.current && pauseOnHover) || hoveredColRef.current === index
        const target = paused ? 0 : (baseVelocities[index] ?? 0)
        const easing = 1 - Math.exp(-delta / (target === 0 ? 0.16 : 0.28))
        const velocity = (velocitiesRef.current[index] ?? 0) + (target - (velocitiesRef.current[index] ?? 0)) * easing
        velocitiesRef.current[index] = velocity
        let next = (offsetsRef.current[index] ?? 0) + velocity * delta
        next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight
        offsetsRef.current[index] = next
        track.style.transform = `translate3d(0, ${-next}px, 0)`
      })
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      lastTimeRef.current = null
    }
  }, [applyPlaneTransform, baseVelocities, columnMeta, parallax, pauseOnHover, reducedMotion, renderActive])

  const activate = (id: string, column: number) => {
    activeIdRef.current = id
    hoveredColRef.current = column
    setActiveId(id)
  }
  const release = () => {
    activeIdRef.current = null
    hoveredColRef.current = -1
    setActiveId(null)
  }

  const cssVars = {
    '--dw-tile-w': `${tileWidth}px`,
    '--dw-tile-h': `${tileHeight}px`,
    '--dw-gap': `${gap}px`,
    '--dw-radius': `${radius}px`,
    '--dw-perspective': `${perspective}px`,
    '--dw-lift': `${lift}px`,
    '--dw-dim': dim,
    '--dw-gray': grayscale ? 1 : 0,
    '--dw-overlay': overlayColor,
    '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`,
    ...style,
  } as CSSProperties

  const renderTile = (item: DriftWallItem, id: string, column: number, itemIndex: number) => {
    const variantIndex = (column * 3 + itemIndex) % 5
    const variant = [
      { height: 1.16, x: -2, y: -2, rotate: -0.8, position: '50% 46%' },
      { height: 0.86, x: 2, y: 3, rotate: 0.9, position: '52% 50%' },
      { height: 1.04, x: -1, y: -1, rotate: 0.35, position: '48% 52%' },
      { height: 0.94, x: 2, y: 2, rotate: -0.6, position: '54% 48%' },
      { height: 1.12, x: 0, y: -2, rotate: 0.25, position: '50% 54%' },
    ][variantIndex]!
    const tileStyle = {
      '--dw-card-h': `${(variant.height * tileHeight).toFixed(1)}px`,
      '--dw-card-x': `${variant.x}%`,
      '--dw-card-y': `${variant.y}%`,
      '--dw-card-r': `${variant.rotate}deg`,
      '--dw-card-position': variant.position,
    } as CSSProperties
    const body = (
      <span className="drift-wall__inner">
        {item.image && <img src={item.image} alt={item.title ?? ''} loading="lazy" decoding="async" draggable={false} />}
        <span className="drift-wall__overlay" aria-hidden="true" />
        <span className="drift-wall__caption">{item.title}</span>
      </span>
    )
    const common = {
      className: `drift-wall__tile${activeId === id ? ' is-active' : ''}`,
      'data-tile-id': id,
      'data-tone': item.tone ?? 'neutral',
      style: tileStyle,
    }
    return item.href
      ? <a key={id} href={item.href} tabIndex={-1} {...common}>{body}</a>
      : <span key={id} {...common}>{body}</span>
  }

  return (
    <div
      ref={containerRef}
      className={`drift-wall${renderActive && !reducedMotion ? ' is-render-active' : ''}${reducedMotion ? ' drift-wall--reduced' : ''}${className ? ` ${className}` : ''}`}
      style={cssVars}
      onPointerMove={(event) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect || reducedMotion) return
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        }
        const tile = (event.target as Element).closest<HTMLElement>('[data-tile-id]')
        if (tile && tile.dataset.tileId !== activeIdRef.current) {
          activate(tile.dataset.tileId ?? '', Number(tile.closest('[data-column]')?.getAttribute('data-column') ?? -1))
        }
      }}
      onPointerEnter={() => { wallHoveredRef.current = true }}
      onPointerLeave={() => {
        wallHoveredRef.current = false
        pointerRef.current = { x: 0, y: 0 }
        release()
      }}
      role="group"
      aria-label="Life archive — drifting wall of photographs"
    >
      <ul className="drift-wall__semantic">
        {safeItems.map((item, index) => (
          <li key={`${item.image}-${index}`}>
            {item.href
              ? <a href={item.href}>{item.title ?? 'Life archive image'}</a>
              : <span>{item.title ?? 'Life archive image'}</span>}
          </li>
        ))}
      </ul>
      <div ref={planeRef} className="drift-wall__plane" aria-hidden="true">
        {columnItems.map((column, columnIndex) => {
          const meta = columnMeta[columnIndex]
          if (!meta) return null
          return (
            <div className="drift-wall__col" data-column={columnIndex} key={`column-${columnIndex}`}>
              <div className="drift-wall__track" ref={(node) => { trackRefs.current[columnIndex] = node }}>
                {Array.from({ length: meta.copies }, (_, copyIndex) =>
                  column.map((item, itemIndex) => renderTile(item, `${columnIndex}-${copyIndex}-${itemIndex}`, columnIndex, itemIndex)),
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

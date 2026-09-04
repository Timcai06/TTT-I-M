import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { sampleBorderGlowSweep } from '../lib/borderGlowTiming'
import { useReducedMotion } from '../lib/motion'

type SharedProps = {
  children?: ReactNode
  className?: string
  edgeSensitivity?: number
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: string[]
  fillOpacity?: number
}

type BorderGlowProps = SharedProps & (
  | ({ as?: 'div' } & HTMLAttributes<HTMLDivElement>)
  | ({ as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>)
)

function parseHSL(value: string) {
  const match = value.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/)
  if (!match) return { h: 40, s: 80, l: 80 }
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHSL(glowColor)
  const base = `${h}deg ${s}% ${l}%`
  const opacities = [100, 60, 50, 40, 30, 20, 10]
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10']
  return Object.fromEntries(
    opacities.map((opacity, index) => [
      `--glow-color${keys[index]}`,
      `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`,
    ]),
  )
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%']
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven']
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1]

function buildGradientVars(colors: string[]): Record<string, string> {
  const palette = colors.length > 0 ? colors : ['#d7b56d']
  const vars: Record<string, string> = {}
  for (let index = 0; index < GRADIENT_KEYS.length; index += 1) {
    const key = GRADIENT_KEYS[index]
    const position = GRADIENT_POSITIONS[index]
    const mappedIndex = COLOR_MAP[index] ?? 0
    const color = palette[Math.min(mappedIndex, palette.length - 1)] ?? '#d7b56d'
    if (!key || !position) continue
    vars[key] = `radial-gradient(at ${position}, ${color} 0px, transparent 50%)`
  }
  vars['--gradient-base'] = `linear-gradient(${palette[0] ?? '#d7b56d'} 0 100%)`
  return vars
}

export default function BorderGlow({
  as = 'div',
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#0b0c0d',
  borderRadius = 24,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ['#d8bd86', '#8aa5a3', '#9c6658'],
  fillOpacity = 0.42,
  ...rest
}: BorderGlowProps) {
  const cardRef = useRef<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion()
  const externalPointerMove = (rest as HTMLAttributes<HTMLElement>).onPointerMove

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    externalPointerMove?.(event)
    if (event.defaultPrevented || reducedMotion) return
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const dx = x - centerX
    const dy = y - centerY
    const kx = dx === 0 ? Number.POSITIVE_INFINITY : centerX / Math.abs(dx)
    const ky = dy === 0 ? Number.POSITIVE_INFINITY : centerY / Math.abs(dy)
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`)
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`)
  }, [externalPointerMove, reducedMotion])

  useEffect(() => {
    const card = cardRef.current
    if (!animated || !card || reducedMotion) return
    let frame = 0
    let elapsed = 0
    let lastFrameAt: number | null = null
    let intersecting = false
    let complete = false

    const stopClock = () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      lastFrameAt = null
    }
    const tick = (now: number) => {
      frame = 0
      if (!intersecting || document.visibilityState === 'hidden' || complete) {
        lastFrameAt = null
        return
      }
      if (lastFrameAt !== null) elapsed += Math.max(0, Math.min(now - lastFrameAt, 100))
      lastFrameAt = now
      const sample = sampleBorderGlowSweep(elapsed)
      card.style.setProperty('--edge-proximity', sample.proximity.toFixed(3))
      card.style.setProperty('--cursor-angle', `${sample.angle.toFixed(3)}deg`)
      complete = sample.complete
      if (complete) {
        card.classList.remove('sweep-active')
        observer?.disconnect()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    const syncClock = () => {
      const shouldRun = intersecting && document.visibilityState !== 'hidden' && !complete
      if (!shouldRun) {
        stopClock()
        return
      }
      card.classList.add('sweep-active')
      if (frame === 0) frame = requestAnimationFrame(tick)
    }
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          intersecting = entries[0]?.isIntersecting ?? false
          syncClock()
        }, { rootMargin: '-12% 0px', threshold: 0.12 })
    const onVisibilityChange = () => syncClock()
    if (observer) observer.observe(card)
    else intersecting = true
    document.addEventListener('visibilitychange', onVisibilityChange)
    syncClock()
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopClock()
      card.classList.remove('sweep-active')
      card.style.removeProperty('--edge-proximity')
      card.style.removeProperty('--cursor-angle')
    }
  }, [animated, reducedMotion])

  const style = {
    '--card-bg': backgroundColor,
    '--edge-sensitivity': edgeSensitivity,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-spread': coneSpread,
    '--fill-opacity': fillOpacity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
    ...rest.style,
  } as React.CSSProperties
  const rootProps = {
    ...rest,
    ref: (node: HTMLElement | null) => { cardRef.current = node },
    onPointerMove: handlePointerMove,
    className: `border-glow-card ${className}`,
    style,
  }

  const content = (
    <>
      <span className="edge-light" aria-hidden="true" />
      <span className="border-glow-inner">{children}</span>
    </>
  )

  return as === 'button'
    ? <button {...rootProps as ButtonHTMLAttributes<HTMLButtonElement>}>{content}</button>
    : <div {...rootProps as HTMLAttributes<HTMLDivElement>}>{content}</div>
}

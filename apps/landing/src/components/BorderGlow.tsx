import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

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

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3
const easeInCubic = (x: number) => x ** 3

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: {
  start?: number
  end?: number
  duration?: number
  delay?: number
  ease?: (value: number) => number
  onUpdate: (value: number) => void
  onEnd?: () => void
}) {
  let frame = 0
  let cancelled = false
  const timeout = window.setTimeout(() => {
    const startedAt = performance.now()
    const tick = (now: number) => {
      if (cancelled) return
      const progress = Math.min((now - startedAt) / duration, 1)
      onUpdate(start + (end - start) * ease(progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else onEnd?.()
    }
    frame = requestAnimationFrame(tick)
  }, delay)

  return () => {
    cancelled = true
    window.clearTimeout(timeout)
    cancelAnimationFrame(frame)
  }
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

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
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
  }, [])

  useEffect(() => {
    const card = cardRef.current
    if (!animated || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cleanups: Array<() => void> = []
    let played = false
    const startSweep = () => {
      if (played) return
      played = true
      const angleStart = 110
      const angleEnd = 465
      card.classList.add('sweep-active')
      card.style.setProperty('--cursor-angle', `${angleStart}deg`)
      cleanups.push(
        animateValue({ duration: 500, onUpdate: (value) => card.style.setProperty('--edge-proximity', `${value}`) }),
        animateValue({
          ease: easeInCubic,
          duration: 1500,
          end: 50,
          onUpdate: (value) => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`),
        }),
        animateValue({
          ease: easeOutCubic,
          delay: 1500,
          duration: 2250,
          start: 50,
          end: 100,
          onUpdate: (value) => card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`),
        }),
        animateValue({
          ease: easeInCubic,
          delay: 2500,
          duration: 1500,
          start: 100,
          end: 0,
          onUpdate: (value) => card.style.setProperty('--edge-proximity', `${value}`),
          onEnd: () => card.classList.remove('sweep-active'),
        }),
      )
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        startSweep()
        observer.disconnect()
      }
    }, { rootMargin: '-12% 0px', threshold: 0.12 })
    observer.observe(card)
    return () => {
      observer.disconnect()
      cleanups.forEach((cleanup) => cleanup())
      card.classList.remove('sweep-active')
    }
  }, [animated])

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

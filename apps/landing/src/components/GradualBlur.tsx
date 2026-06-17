import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

type BlurPosition = 'top' | 'bottom' | 'left' | 'right'
type BlurCurve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
type BlurTarget = 'parent' | 'page'
type BlurAnimation = boolean | 'scroll'
type BlurPreset =
  | BlurPosition
  | 'subtle'
  | 'intense'
  | 'smooth'
  | 'sharp'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'page-header'
  | 'page-footer'

interface GradualBlurProps {
  position?: BlurPosition
  strength?: number
  height?: string
  width?: string
  divCount?: number
  exponential?: boolean
  curve?: BlurCurve
  opacity?: number
  animated?: BlurAnimation
  duration?: string
  easing?: string
  hoverIntensity?: number
  target?: BlurTarget
  preset?: BlurPreset
  responsive?: boolean
  zIndex?: number
  onAnimationComplete?: () => void
  className?: string
  style?: CSSProperties
  mobileHeight?: string
  tabletHeight?: string
  desktopHeight?: string
  mobileWidth?: string
  tabletWidth?: string
  desktopWidth?: string
}

type GradualBlurConfig = Required<
  Pick<
    GradualBlurProps,
    | 'position'
    | 'strength'
    | 'height'
    | 'divCount'
    | 'exponential'
    | 'zIndex'
    | 'animated'
    | 'duration'
    | 'easing'
    | 'opacity'
    | 'curve'
    | 'responsive'
    | 'target'
    | 'className'
    | 'style'
  >
> &
  Omit<GradualBlurProps, 'position' | 'strength' | 'height' | 'divCount'>

const DEFAULT_CONFIG: GradualBlurConfig = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {},
}

const PRESETS: Record<BlurPreset, Partial<GradualBlurConfig>> = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', height: '6rem' },
  right: { position: 'right', height: '6rem' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', height: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
}

const CURVE_FUNCTIONS: Record<BlurCurve, (progress: number) => number> = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - Math.pow(1 - progress, 2),
  'ease-in-out': (progress) =>
    progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2,
}

const RESPONSIVE_SUFFIX: Record<'height' | 'width', 'Height' | 'Width'> = {
  height: 'Height',
  width: 'Width',
}

function getGradientDirection(position: BlurPosition) {
  return {
    top: 'to top',
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right',
  }[position]
}

function debounce(fn: () => void, wait: number) {
  let timeout: number | undefined
  return () => {
    window.clearTimeout(timeout)
    timeout = window.setTimeout(fn, wait)
  }
}

function useResponsiveDimension(
  responsive: boolean,
  config: GradualBlurConfig,
  key: 'height' | 'width',
) {
  const [value, setValue] = useState(config[key])

  useEffect(() => {
    if (!responsive) return

    const calc = () => {
      const viewportWidth = window.innerWidth
      const suffix = RESPONSIVE_SUFFIX[key]
      let nextValue = config[key]

      if (viewportWidth <= 480 && config[`mobile${suffix}`]) {
        nextValue = config[`mobile${suffix}`]
      } else if (viewportWidth <= 768 && config[`tablet${suffix}`]) {
        nextValue = config[`tablet${suffix}`]
      } else if (viewportWidth <= 1024 && config[`desktop${suffix}`]) {
        nextValue = config[`desktop${suffix}`]
      }

      setValue(nextValue)
    }

    const debounced = debounce(calc, 100)
    calc()
    window.addEventListener('resize', debounced)
    return () => window.removeEventListener('resize', debounced)
  }, [config, key, responsive])

  return responsive ? value : config[key]
}

function useIntersectionObserver(ref: React.RefObject<HTMLElement | null>, shouldObserve: boolean) {
  const [isVisible, setIsVisible] = useState(!shouldObserve)

  useEffect(() => {
    if (!shouldObserve || !ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setIsVisible(entry.isIntersecting)
    }, { threshold: 0.1 })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, shouldObserve])

  return isVisible
}

function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const config = useMemo<GradualBlurConfig>(() => {
    const presetConfig = props.preset ? PRESETS[props.preset] : {}
    return { ...DEFAULT_CONFIG, ...presetConfig, ...props }
  }, [props])

  const responsiveHeight = useResponsiveDimension(config.responsive, config, 'height')
  const responsiveWidth = useResponsiveDimension(config.responsive, config, 'width')
  const isVisible = useIntersectionObserver(containerRef, config.animated === 'scroll')

  const blurDivs = useMemo(() => {
    const divs = []
    const increment = 100 / config.divCount
    const currentStrength =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength
    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear

    for (let i = 1; i <= config.divCount; i += 1) {
      const progress = curveFunc(i / config.divCount)
      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * currentStrength
        : 0.0625 * (progress * config.divCount + 1) * currentStrength

      const p1 = Math.round((increment * i - increment) * 10) / 10
      const p2 = Math.round(increment * i * 10) / 10
      const p3 = Math.round((increment * i + increment) * 10) / 10
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10

      let gradient = `transparent ${p1}%, black ${p2}%`
      if (p3 <= 100) gradient += `, black ${p3}%`
      if (p4 <= 100) gradient += `, transparent ${p4}%`

      const direction = getGradientDirection(config.position)

      divs.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            maskImage: `linear-gradient(${direction}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
            backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            opacity: config.opacity,
            transition:
              config.animated && config.animated !== 'scroll'
                ? `backdrop-filter ${config.duration} ${config.easing}`
                : undefined,
          }}
        />,
      )
    }

    return divs
  }, [config, isHovered])

  const containerStyle = useMemo<CSSProperties>(() => {
    const isVertical = ['top', 'bottom'].includes(config.position)
    const isPageTarget = config.target === 'page'
    const style: CSSProperties = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: config.hoverIntensity ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    }

    if (isVertical) {
      style.height = responsiveHeight
      style.width = responsiveWidth || '100%'
      style[config.position] = 0
      style.left = 0
      style.right = 0
    } else {
      style.width = responsiveWidth || responsiveHeight
      style.height = '100%'
      style[config.position] = 0
      style.top = 0
      style.bottom = 0
    }

    return style
  }, [config, isVisible, responsiveHeight, responsiveWidth])

  useEffect(() => {
    if (isVisible && config.animated === 'scroll' && config.onAnimationComplete) {
      const timeout = window.setTimeout(
        config.onAnimationComplete,
        Number.parseFloat(config.duration) * 1000,
      )
      return () => window.clearTimeout(timeout)
    }
  }, [config, isVisible])

  return (
    <div
      ref={containerRef}
      className={`gradual-blur gradual-blur-${config.target} ${config.className}`.trim()}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="gradual-blur-inner">{blurDivs}</div>
    </div>
  )
}

const GradualBlurMemo = memo(GradualBlur)
GradualBlurMemo.displayName = 'GradualBlur'

export default GradualBlurMemo

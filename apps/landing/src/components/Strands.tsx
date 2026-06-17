import { useEffect, useMemo, useRef } from 'react'
import { Color, Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'
import VERTEX_SHADER from './shaders/Strands.vert.glsl'
import STRANDS_FRAGMENT_SHADER from './shaders/Strands.frag.glsl'
import GLASS_FRAGMENT_SHADER from './shaders/Strands.glass.frag.glsl'

const MAX_STRANDS = 12
const MAX_COLORS = 8

interface StrandsProps {
  colors?: string[]
  count?: number
  speed?: number
  amplitude?: number
  waviness?: number
  thickness?: number
  glow?: number
  taper?: number
  spread?: number
  hueShift?: number
  intensity?: number
  saturation?: number
  opacity?: number
  scale?: number
  glass?: boolean
  refraction?: number
  dispersion?: number
  glassSize?: number
  className?: string
  style?: React.CSSProperties
}

type Palette = Array<[number, number, number]>

type StrandsRuntimeProps = Required<Omit<StrandsProps, 'className' | 'style'>>

interface StrandsUniforms {
  uTime: { value: number }
  uResolution: { value: [number, number] }
  uColors: { value: Palette }
  uColorCount: { value: number }
  uStrandCount: { value: number }
  uSpeed: { value: number }
  uAmplitude: { value: number }
  uWaviness: { value: number }
  uThickness: { value: number }
  uGlow: { value: number }
  uTaper: { value: number }
  uSpread: { value: number }
  uHueShift: { value: number }
  uIntensity: { value: number }
  uOpacity: { value: number }
  uScale: { value: number }
  uSaturation: { value: number }
}

interface GlassUniforms {
  uScene: { value: unknown }
  uResolution: { value: [number, number] }
  uRadius: { value: number }
  uRefraction: { value: number }
  uDispersion: { value: number }
}

const buildPalette = (colors: string[]): Palette => {
  const filled = colors.length ? colors : ['#ffffff']
  const padded: Palette = []
  for (let i = 0; i < MAX_COLORS; i += 1) {
    const c = new Color(filled[i] ?? filled[filled.length - 1])
    padded.push([c.r, c.g, c.b])
  }
  return padded
}

export default function Strands({
  colors = ['#FF4242', '#7C3AED', '#06B6D4', '#EAB308'],
  count = 3,
  speed = 0.5,
  amplitude = 1,
  waviness = 1,
  thickness = 0.7,
  glow = 2.6,
  taper = 3,
  spread = 1,
  hueShift = 0,
  intensity = 0.6,
  saturation = 1.5,
  opacity = 1,
  scale = 1.5,
  glass = false,
  refraction = 1,
  dispersion = 1,
  glassSize = 1,
  className = '',
  style,
}: StrandsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeProps = useMemo<StrandsRuntimeProps>(() => ({
    colors,
    count,
    speed,
    amplitude,
    waviness,
    thickness,
    glow,
    taper,
    spread,
    hueShift,
    intensity,
    saturation,
    opacity,
    scale,
    glass,
    refraction,
    dispersion,
    glassSize,
  }), [
    colors,
    count,
    speed,
    amplitude,
    waviness,
    thickness,
    glow,
    taper,
    spread,
    hueShift,
    intensity,
    saturation,
    opacity,
    scale,
    glass,
    refraction,
    dispersion,
    glassSize,
  ])

  const propsRef = useRef<StrandsRuntimeProps>(runtimeProps)

  useEffect(() => {
    propsRef.current = runtimeProps
  }, [runtimeProps])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 1.25),
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.canvas.className = 'strands-canvas'
    gl.canvas.style.backgroundColor = 'transparent'

    const geometry = new Triangle(gl)
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv
    }

    const uniforms: StrandsUniforms = {
      uTime: { value: 0 },
      uResolution: { value: [container.offsetWidth, container.offsetHeight] },
      uColors: { value: buildPalette(propsRef.current.colors) },
      uColorCount: { value: Math.min(propsRef.current.colors.length, MAX_COLORS) },
      uStrandCount: { value: Math.min(Math.max(Math.round(propsRef.current.count), 1), MAX_STRANDS) },
      uSpeed: { value: propsRef.current.speed },
      uAmplitude: { value: propsRef.current.amplitude },
      uWaviness: { value: propsRef.current.waviness },
      uThickness: { value: propsRef.current.thickness },
      uGlow: { value: propsRef.current.glow },
      uTaper: { value: propsRef.current.taper },
      uSpread: { value: propsRef.current.spread },
      uHueShift: { value: propsRef.current.hueShift },
      uIntensity: { value: propsRef.current.intensity },
      uOpacity: { value: propsRef.current.opacity },
      uScale: { value: propsRef.current.scale },
      uSaturation: { value: propsRef.current.saturation },
    }

    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: STRANDS_FRAGMENT_SHADER,
      uniforms,
    })
    const mesh = new Mesh(gl, { geometry, program })

    const renderTarget = new RenderTarget(gl, {
      width: Math.max(1, container.offsetWidth),
      height: Math.max(1, container.offsetHeight),
    })
    const glassUniforms: GlassUniforms = {
      uScene: { value: renderTarget.texture },
      uResolution: { value: [container.offsetWidth, container.offsetHeight] },
      uRadius: { value: 0.46 * propsRef.current.glassSize },
      uRefraction: { value: propsRef.current.refraction },
      uDispersion: { value: propsRef.current.dispersion },
    }

    const glassProgram = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: GLASS_FRAGMENT_SHADER,
      uniforms: glassUniforms,
    })
    const glassMesh = new Mesh(gl, { geometry, program: glassProgram })

    container.appendChild(gl.canvas)

    let animationFrame = 0
    let visible = false
    let disposed = false

    const resize = () => {
      const width = Math.max(1, container.offsetWidth)
      const height = Math.max(1, container.offsetHeight)
      renderer.setSize(width, height)
      uniforms.uResolution.value = [width, height]
      renderTarget.setSize(width, height)
      glassUniforms.uResolution.value = [width, height]
    }

    const render = (time: number) => {
      if (disposed || !visible) {
        animationFrame = 0
        return
      }

      animationFrame = window.requestAnimationFrame(render)
      const current = propsRef.current
      uniforms.uTime.value = time * 0.001
      uniforms.uColors.value = buildPalette(current.colors)
      uniforms.uColorCount.value = Math.min(current.colors.length, MAX_COLORS)
      uniforms.uStrandCount.value = Math.min(Math.max(Math.round(current.count), 1), MAX_STRANDS)
      uniforms.uSpeed.value = current.speed
      uniforms.uAmplitude.value = current.amplitude
      uniforms.uWaviness.value = current.waviness
      uniforms.uThickness.value = current.thickness
      uniforms.uGlow.value = current.glow
      uniforms.uTaper.value = current.taper
      uniforms.uSpread.value = current.spread
      uniforms.uHueShift.value = current.hueShift
      uniforms.uIntensity.value = current.intensity
      uniforms.uOpacity.value = current.opacity
      uniforms.uScale.value = current.scale
      uniforms.uSaturation.value = current.saturation

      if (current.glass) {
        renderer.render({ scene: mesh, target: renderTarget })
        glassUniforms.uScene.value = renderTarget.texture
        glassUniforms.uRefraction.value = current.refraction
        glassUniforms.uDispersion.value = current.dispersion
        glassUniforms.uRadius.value = 0.46 * current.glassSize
        renderer.render({ scene: glassMesh })
      } else {
        renderer.render({ scene: mesh })
      }
    }

    const start = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false
        if (visible) {
          start()
        } else if (animationFrame) {
          window.cancelAnimationFrame(animationFrame)
          animationFrame = 0
        }
      },
      { rootMargin: '160px' }
    )
    visibilityObserver.observe(container)

    return () => {
      disposed = true
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <div ref={containerRef} className={`strands-container ${className}`.trim()} style={style} />
}

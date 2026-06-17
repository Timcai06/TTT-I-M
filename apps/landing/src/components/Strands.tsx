import { useEffect, useMemo, useRef } from 'react'
import { Color, Mesh, Program, RenderTarget, Renderer, Triangle } from 'ogl'

const MAX_STRANDS = 12
const MAX_COLORS = 8

const VERTEX_SHADER = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const STRANDS_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`

const GLASS_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r;
  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);
  float bodyA = 0.05 + fres * 0.05;
  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}
`

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

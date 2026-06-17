import { useEffect, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion } from '../lib/motion'

const VERTEX_SHADER = `
varying vec2 v_texcoord;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  v_texcoord = uv;
}
`

const FRAGMENT_SHADER = `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform float u_shapeSize;
uniform float u_shapeWidth;
uniform float u_shapeHeight;
uniform float u_roundness;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;
uniform vec3 u_color;
uniform float u_opacity;

#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif

#ifndef VAR
#define VAR 0
#endif

#ifndef FNC_COORD
#define FNC_COORD
vec2 coord(in vec2 p) {
  p = p / u_resolution.xy;
  if (u_resolution.x > u_resolution.y) {
    p.x *= u_resolution.x / u_resolution.y;
    p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
  } else {
    p.y *= u_resolution.y / u_resolution.x;
    p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
  }
  p -= 0.5;
  p *= vec2(-1.0, 1.0);
  return p;
}
#endif

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse * u_pixelRatio)

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

float sdCircle(in vec2 st, in vec2 center) {
  return length(st - center) * 2.0;
}

float sdPoly(in vec2 p, in float w, in int sides) {
  float a = atan(p.x, p.y) + PI;
  float r = TWO_PI / float(sides);
  float d = cos(floor(0.5 + a / r) * r - a) * length(max(abs(p) * 1.0, 0.0));
  return d * 2.0 - w;
}

float aastep(float threshold, float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

float fill(float x, float size, float edge) {
  return 1.0 - smoothstep(size - edge, size + edge, x);
}

float strokeAA(float x, float size, float w, float edge) {
  float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
  float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
    - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
  return clamp(d, 0.0, 1.0);
}

void main() {
  vec2 st = st0 + 0.5;
  vec2 posMouse = mx * vec2(1.0, -1.0) + 0.5;

  float sdfCircle = fill(sdCircle(st, posMouse), u_circleSize, u_circleEdge);

  float sdf;
  if (VAR == 0) {
    sdf = sdRoundRect(st, vec2(u_shapeWidth, u_shapeHeight), u_roundness);
    sdf = strokeAA(sdf, 0.0, u_borderSize, sdfCircle) * 4.0;
  } else if (VAR == 1) {
    sdf = sdCircle(st, vec2(0.5));
    sdf = fill(sdf, 0.6, sdfCircle) * 1.2;
  } else if (VAR == 2) {
    sdf = sdCircle(st, vec2(0.5));
    sdf = strokeAA(sdf, 0.58, 0.02, sdfCircle) * 4.0;
  } else if (VAR == 3) {
    sdf = sdPoly(st - vec2(0.5, 0.45), 0.3, 3);
    sdf = fill(sdf, 0.05, sdfCircle) * 1.4;
  }

  float alpha = clamp(sdf * u_opacity, 0.0, 1.0);
  gl_FragColor = vec4(u_color, alpha);
}
`

interface ShapeBlurProps {
  className?: string
  style?: CSSProperties
  variation?: 0 | 1 | 2 | 3
  pixelRatioProp?: number
  shapeSize?: number
  shapeWidth?: number
  shapeHeight?: number
  roundness?: number
  borderSize?: number
  circleSize?: number
  circleEdge?: number
  color?: string
  opacity?: number
}

interface ShapeBlurUniforms extends Record<string, THREE.IUniform> {
  u_mouse: THREE.IUniform<THREE.Vector2>
  u_resolution: THREE.IUniform<THREE.Vector2>
  u_pixelRatio: THREE.IUniform<number>
  u_shapeSize: THREE.IUniform<number>
  u_shapeWidth: THREE.IUniform<number>
  u_shapeHeight: THREE.IUniform<number>
  u_roundness: THREE.IUniform<number>
  u_borderSize: THREE.IUniform<number>
  u_circleSize: THREE.IUniform<number>
  u_circleEdge: THREE.IUniform<number>
  u_color: THREE.IUniform<THREE.Vector3>
  u_opacity: THREE.IUniform<number>
}

function hexToRgb(hex: string) {
  let value = hex.trim()
  if (value.startsWith('#')) value = value.slice(1)
  if (value.length === 3) {
    value = value.split('').map((char) => char + char).join('')
  }
  const parsed = Number.parseInt(value, 16)
  const color = Number.isFinite(parsed) ? parsed : 0xf5f2ea
  return new THREE.Vector3(
    ((color >> 16) & 255) / 255,
    ((color >> 8) & 255) / 255,
    (color & 255) / 255
  )
}

export default function ShapeBlur({
  className = '',
  style,
  variation = 0,
  pixelRatioProp = 1.5,
  shapeSize = 1.18,
  shapeWidth,
  shapeHeight,
  roundness = 0.58,
  borderSize = 0.035,
  circleSize = 0.24,
  circleEdge = 0.74,
  color = '#8b1e16',
  opacity = 0.92,
}: ShapeBlurProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef(hexToRgb(color))

  useEffect(() => {
    colorRef.current.copy(hexToRgb(color))
  }, [color])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || prefersReducedMotion()) return

    let active = true
    let visible = true
    let animationFrameId = 0
    let lastTime = performance.now() * 0.001

    const vMouse = new THREE.Vector2()
    const vMouseDamp = new THREE.Vector2()
    const vResolution = new THREE.Vector2()

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera()
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = 'shape-blur-canvas'
    mount.appendChild(renderer.domElement)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const uniforms: ShapeBlurUniforms = {
      u_mouse: { value: vMouseDamp },
      u_resolution: { value: vResolution },
      u_pixelRatio: { value: pixelRatioProp },
      u_shapeSize: { value: shapeSize },
      u_shapeWidth: { value: shapeWidth ?? shapeSize },
      u_shapeHeight: { value: shapeHeight ?? shapeSize },
      u_roundness: { value: roundness },
      u_borderSize: { value: borderSize },
      u_circleSize: { value: circleSize },
      u_circleEdge: { value: circleEdge },
      u_color: { value: colorRef.current },
      u_opacity: { value: opacity },
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      defines: { VAR: variation },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    const quad = new THREE.Mesh(geometry, material)
    scene.add(quad)

    const resize = () => {
      if (!active) return
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      const dpr = Math.min(pixelRatioProp || window.devicePixelRatio || 1, 1.75)

      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)

      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()

      quad.scale.set(width, height, 1)
      vResolution.set(width, height).multiplyScalar(dpr)
      uniforms.u_pixelRatio.value = dpr
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      vMouse.set(event.clientX - rect.left, event.clientY - rect.top)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      visible = entry.isIntersecting
      if (visible && active) {
        lastTime = performance.now() * 0.001
        animationFrameId = requestAnimationFrame(update)
      }
    }, { threshold: 0 })

    const update = () => {
      if (!active) return
      if (!visible) {
        animationFrameId = 0
        return
      }

      const now = performance.now() * 0.001
      const dt = Math.min(0.1, now - lastTime)
      lastTime = now

      vMouseDamp.x = THREE.MathUtils.damp(vMouseDamp.x, vMouse.x, 8, dt)
      vMouseDamp.y = THREE.MathUtils.damp(vMouseDamp.y, vMouse.y, 8, dt)
      uniforms.u_color.value.copy(colorRef.current)
      uniforms.u_opacity.value = opacity

      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(update)
    }

    resize()
    const rect = mount.getBoundingClientRect()
    vMouse.set(rect.width / 2, rect.height / 2)
    vMouseDamp.copy(vMouse)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    observer.observe(mount)
    document.addEventListener('pointermove', onPointerMove)
    animationFrameId = requestAnimationFrame(update)

    return () => {
      active = false
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      observer.disconnect()
      document.removeEventListener('pointermove', onPointerMove)
      scene.remove(quad)
      geometry.dispose()
      material.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }, [borderSize, circleEdge, circleSize, opacity, pixelRatioProp, roundness, shapeHeight, shapeSize, shapeWidth, variation])

  return <div className={`shape-blur ${className}`.trim()} ref={mountRef} style={style} aria-hidden="true" />
}

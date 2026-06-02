import { useMemo, useRef, useEffect, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/motion'
import { onIntroExit } from '../lib/intro'

const vertexShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uDepth;
  uniform float uPointSize;
  uniform float uIntro;
  uniform vec2 uAspect;

  varying vec2 vUv;
  varying float vLum;
  varying float vAlpha;
  varying float vEdge;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;

    vec3 tex = texture2D(uTexture, uv).rgb;
    float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
    vec2 px = vec2(1.0 / 900.0, 1.0 / 1200.0);
    float lumX = dot(texture2D(uTexture, uv + vec2(px.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
    float lumY = dot(texture2D(uTexture, uv + vec2(0.0, px.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
    float edge = smoothstep(0.03, 0.18, abs(lum - lumX) + abs(lum - lumY));
    float portraitLum = pow(lum, 0.72);
    vLum = portraitLum;
    vEdge = edge;
    float mask = smoothstep(0.015, 0.12, lum);
    vAlpha = max(mask * 0.95, edge * 0.45);

    vec3 pos = position;
    pos.xy *= uAspect;

    float depth = (portraitLum - 0.5) * uDepth;
    pos.z += depth * mask;

    float n = snoise(uv * 3.0 + uTime * 0.15);
    pos.z += n * 0.08 * mask;

    vec2 toMouse = pos.xy - uMouse * uAspect;
    float d = length(toMouse);
    float falloff = smoothstep(0.32, 0.0, d); // 缩小扩散半径 (从 0.55 缩减至 0.32)
    pos.xy += normalize(toMouse + 0.0001) * falloff * uMouseStrength;
    pos.z += falloff * uMouseStrength * 1.0;  // 略微降低 Z 轴推起的高度使之更平滑细腻

    float introOffset = (1.0 - uIntro) * (1.2 + n * 0.4);
    pos.z -= introOffset;
    vAlpha *= uIntro;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float size = uPointSize * (0.75 + portraitLum * 1.5 + vEdge * 1.35);
    gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec3 uTintCool;
  uniform vec3 uTintWarm;

  varying vec2 vUv;
  varying float vLum;
  varying float vAlpha;
  varying float vEdge;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;

    vec3 color = texture2D(uTexture, vUv).rgb;
    vec3 cool = mix(uTintCool * 0.8, color * 1.1, vLum);
    vec3 edgeGlow = vec3(0.85, 0.9, 1.0) * vEdge * 0.6;
    vec3 graded = mix(cool, uTintWarm, smoothstep(0.4, 0.95, vLum) * 0.3) + edgeGlow;

    float alpha = vAlpha * (1.0 - r) * 0.9;
    gl_FragColor = vec4(graded, alpha);
  }
`

function PortraitPoints({ texture }: { texture: THREE.Texture }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const introRef = useRef(0)
  const mouseRef = useRef(new THREE.Vector2(99, 99))
  const targetMouseRef = useRef(new THREE.Vector2(99, 99))
  const isHoveringRef = useRef(false)
  const { size, viewport } = useThree()

  const [started, setStarted] = useState(false)

  useEffect(() => {
    return onIntroExit(() => setStarted(true))
  }, [])

  const aspect = useMemo<[number, number]>(() => {
    const img = texture.image as { width?: number; height?: number } | null
    const ar = img && img.width && img.height ? img.width / img.height : 0.8
    if (ar < 1) return [ar * 2.4, 2.4]
    return [2.4, (1 / ar) * 2.4]
  }, [texture])

  const geometry = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const segments = isMobile ? 180 : 280
    return new THREE.PlaneGeometry(1, 1, segments, segments)
  }, [])

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uMouseStrength: { value: 0.25 }, // 降低推开粒子时的物理感官力度 (从 0.35 降至 0.25)
      uDepth: { value: 0.8 },
      uPointSize: { value: 3.5 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
      uIntro: { value: 0 },
      uTintCool: { value: new THREE.Color('#7890a8') },
      uTintWarm: { value: new THREE.Color('#e0d5c1') },
      uAspect: { value: new THREE.Vector2(aspect[0], aspect[1]) },
    }),
    [texture, aspect]
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // 1. 获取归一化设备坐标 (NDC) [-1, 1]
      const x = (e.clientX / size.width) * 2 - 1
      const y = -((e.clientY / size.height) * 2 - 1)
      
      // 2. 将 NDC 映射到 z=0 平面的 ThreeJS 世界坐标
      const worldX = x * (viewport.width / 2)
      const worldY = y * (viewport.height / 2)
      
      // 3. 计算当前的 Mesh 缩放比例
      const s = Math.min(viewport.width, viewport.height) * 1.08
      
      // 4. 减去平移偏置 [0.08, 0.02]，并除去缩放比例和纹理宽高比，将坐标完美对齐到着色器的 uMouse 空间
      const targetX = (worldX - 0.08) / (s * aspect[0])
      const targetY = (worldY - 0.02) / (s * aspect[1])
      
      if (!isHoveringRef.current) {
        isHoveringRef.current = true
        mouseRef.current.set(targetX, targetY)
        targetMouseRef.current.set(targetX, targetY)
        const mouseUniform = matRef.current?.uniforms.uMouse
        if (mouseUniform) {
          const mouseValue = mouseUniform.value as THREE.Vector2
          mouseValue.set(targetX, targetY)
        }
      } else {
        targetMouseRef.current.set(targetX, targetY)
      }
    }
    const onLeave = () => {
      isHoveringRef.current = false
      targetMouseRef.current.set(99, 99)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [size.width, size.height, viewport.width, viewport.height, aspect])

  useFrame((_, delta) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    const timeUniform = u.uTime
    const mouseUniform = u.uMouse
    const introUniform = u.uIntro
    if (!timeUniform || !mouseUniform || !introUniform) return

    timeUniform.value += delta
    mouseRef.current.lerp(targetMouseRef.current, 0.08)
    const mouseValue = mouseUniform.value as THREE.Vector2
    mouseValue.copy(mouseRef.current)
    if (started) {
      introRef.current = Math.min(1, introRef.current + delta / 2.2)
      introUniform.value = 1 - Math.pow(1 - introRef.current, 3)
    } else {
      introUniform.value = 0
    }
  })

  const scale = useMemo<[number, number, number]>(() => {
    const s = Math.min(viewport.width, viewport.height) * 1.08
    return [s, s, s]
  }, [viewport.width, viewport.height])

  return (
    <points geometry={geometry} scale={scale} position={[0.08, 0.02, 0]}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

/** Imperative texture loader — handles 404 gracefully. */
function useImperativeTexture(src: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let currentTexture: THREE.Texture | null = null
    const loader = new THREE.TextureLoader()
    
    loader.load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        currentTexture = tex
        setTexture(tex)
      },
      undefined,
      () => {
        if (cancelled) return
        setFailed(true)
        console.warn(`[ParticlePortrait] failed to load ${src} — run \`npm run setup\` inside portfolio/.`)
      }
    )
    
    return () => {
      cancelled = true
      if (currentTexture) {
        currentTexture.dispose()
      }
    }
  }, [src])

  return { texture, failed }
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() { return { errored: true } }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn('[ParticlePortrait] canvas error:', err.message, info.componentStack)
  }
  render() {
    return this.state.errored ? null : this.props.children
  }
}

function PortraitScene({ src }: { src: string }) {
  const { texture, failed } = useImperativeTexture(src)
  if (failed || !texture) return null
  return <PortraitPoints texture={texture} />
}

export default function ParticlePortrait({ src = '/portrait/tim.jpg' }: { src?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const reduced = useReducedMotion()

  // Pause the WebGL render loop whenever the hero is scrolled out of view.
  // The shader pushes ~78k points every frame; left running off-screen it
  // steals GPU from the scroll animations below. frameloop="never" stops it
  // cold and resumes instantly when the hero returns.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) setVisible(entry.isIntersecting)
      },
      { rootMargin: '120px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Honour the OS "reduce motion" setting: skip the animated particle field
  // entirely. The static hero ghost photo behind it carries the composition.
  if (reduced) return null

  return (
    <CanvasErrorBoundary>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          frameloop={visible ? 'always' : 'never'}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 2.4], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <PortraitScene src={src} />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  )
}

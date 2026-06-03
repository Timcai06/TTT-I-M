import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/motion'
import { buildTextParticleField, type TextParticleField } from '../lib/textParticles'

// Share the hero portrait's tonal palette so the manifesto reads as the same
// particle "material" condensing into language.
const COOL = '#7890a8'
const WARM = '#e0d5c1'
// Read once at module load — touching window during render trips the purity rule.
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1

const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uPointBase;
  attribute vec3 aTarget;
  attribute float aDelay;
  attribute float aSeed;
  varying float vForm;
  varying float vSeed;

  float easeOut(float t) { return 1.0 - pow(1.0 - t, 3.0); }

  void main() {
    // Per-particle stagger: each forms inside a window offset by its delay, so
    // the words assemble organically rather than all snapping at once.
    float local = clamp((uProgress - aDelay * 0.45) / 0.55, 0.0, 1.0);
    float e = easeOut(local);
    vForm = e;
    vSeed = aSeed;

    vec3 pos = mix(position, aTarget, e); // position = scatter origin, aTarget = flat text
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float size = uPointBase * (0.55 + 0.45 * e);
    gl_PointSize = size * uPixelRatio * (1.0 / max(0.001, -mv.z));
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uWarm;
  varying float vForm;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r = dot(c, c);
    if (r > 1.0) discard;
    vec3 col = mix(uCool, uWarm, smoothstep(0.0, 1.0, vForm * 0.6 + vSeed * 0.4));
    float alpha = (0.10 + 0.9 * vForm) * (1.0 - r * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`

function GlyphPoints({
  field,
  triggerRef,
}: {
  field: TextParticleField
  triggerRef: RefObject<HTMLDivElement | null>
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, invalidate } = useThree()

  // Deterministic: all randomness was baked into the field, so this is a pure
  // mapping (px → world units) and safe to run during render in useMemo.
  const { geometry, uniforms } = useMemo(() => {
    const n = field.targets.length
    const target = new Float32Array(n * 3)
    const scatter = new Float32Array(n * 3)
    const delay = new Float32Array(n)
    const seed = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const t = field.targets[i]!
      // Map glyph pixel coords → world units that fill the canvas at z=0.
      target[i * 3] = (t.x / field.width - 0.5) * viewport.width
      target[i * 3 + 1] = -(t.y / field.height - 0.5) * viewport.height
      target[i * 3 + 2] = 0
      // Scatter cloud fills roughly the band (the canvas clips its own bounds,
      // so a far-wider spread would render half-empty) with a shallow depth
      // band kept in front of the camera so nothing clips behind it.
      scatter[i * 3] = t.rx * viewport.width * 1.15
      scatter[i * 3 + 1] = t.ry * viewport.height * 1.15
      scatter[i * 3 + 2] = t.rz * 3.0
      delay[i] = t.delay
      seed[i] = t.seed
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(scatter, 3))
    g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
    g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

    return {
      geometry: g,
      uniforms: {
        uProgress: { value: 0 },
        uPixelRatio: { value: DPR },
        uPointBase: { value: 8.0 },
        uCool: { value: new THREE.Color(COOL) },
        uWarm: { value: new THREE.Color(WARM) },
      },
    }
  }, [field, viewport.width, viewport.height])

  useEffect(() => () => geometry.dispose(), [geometry])

  // Scrub the morph progress off the scroll position; render on demand only
  // when it changes (frameloop="demand" → zero idle GPU).
  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      end: 'top 30%',
      scrub: true,
      onUpdate: (self) => {
        if (matRef.current) {
          matRef.current.uniforms.uProgress!.value = self.progress
          invalidate()
        }
      },
    })
    if (matRef.current) {
      matRef.current.uniforms.uProgress!.value = st.progress
      invalidate()
    }
    return () => st.kill()
  }, [geometry, triggerRef, invalidate])

  return (
    <points geometry={geometry}>
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

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { errored: boolean }
> {
  state = { errored: false }
  static getDerivedStateFromError() { return { errored: true } }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn('[TextParticles] canvas error:', err.message, info.componentStack)
    this.props.onError()
  }
  render() {
    return this.state.errored ? null : this.props.children
  }
}

interface Props {
  text: string
  className?: string
  /** Target glyph size at desktop width; scaled down to fit narrow columns. */
  fontSize?: number
}

/**
 * Signature "particle ⇄ text" reveal (Phase B2, R3F 3D).
 *
 * Native measureText lays the line out once; filled pixels become particle
 * targets (lib/textParticles). An R3F point cloud tweens each particle from a
 * scattered depth cloud into the flat words as the block scrolls through the
 * viewport — sharing the hero portrait's cool/warm palette so it reads as the
 * same material condensing into language.
 *
 * frameloop="demand": renders only on scroll ticks, no idle GPU. Reduced motion
 * or a WebGL failure falls back to ordinary serif type; the real text always
 * ships as a visually-hidden span for AT/SEO.
 */
export default function TextParticles({ text, className = '', fontSize = 72 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [field, setField] = useState<TextParticleField | null>(null)
  // Reactive: respects a runtime OS "reduce motion" toggle. WebGL failure is a
  // separate latch set by the error boundary. Either one drops to plain type.
  const reduced = useReducedMotion()
  const [webglFailed, setWebglFailed] = useState(false)
  const fallback = reduced || webglFailed

  useEffect(() => {
    if (fallback) return
    const wrap = wrapRef.current
    if (!wrap) return

    const compute = () => {
      const cw = Math.max(1, wrap.clientWidth)
      const fs = Math.max(26, Math.min(fontSize, cw / 6.5))
      const serif = getComputedStyle(wrap).getPropertyValue('--font-serif').trim() || 'serif'
      // Lighter particle budget on phones (fewer points, sparser grid) to keep
      // the GPU cost well within frame on mobile hardware.
      const mobile = window.innerWidth < 768
      const f = buildTextParticleField({
        text,
        maxWidth: cw,
        fontSize: fs,
        fontFamily: serif,
        fontWeight: 500,
        sampleGap: mobile ? 7 : 5,
        maxTargets: mobile ? 2600 : 6000,
      })
      wrap.style.height = `${f.height}px`
      setField(f)
    }

    compute()
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (cancelled) return
      compute()
      ScrollTrigger.refresh()
    })

    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        compute()
        ScrollTrigger.refresh()
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [text, fontSize, fallback])

  if (fallback) {
    return (
      <div className={`text-particles text-particles--static ${className}`}>
        <span className="text-particles__sr">{text}</span>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={`text-particles text-particles--gl ${className}`}>
      <CanvasErrorBoundary onError={() => setWebglFailed(true)}>
        {field && (
          <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 5], fov: 60 }}
            style={{ position: 'absolute', inset: 0 }}
            aria-hidden="true"
          >
            <GlyphPoints field={field} triggerRef={wrapRef} />
          </Canvas>
        )}
      </CanvasErrorBoundary>
      <span className="text-particles__sr">{text}</span>
    </div>
  )
}

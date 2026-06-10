import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode, RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ScrollTrigger } from '../lib/gsap'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { acquireContext, releaseContext } from '../lib/webgl/contextRegistry'
import { getGLQualityProfile } from '../lib/webgl/quality'
import { useReducedMotion } from '../lib/motion'
import { buildTextParticleField, type TextParticleField } from '../lib/textParticles'

// 与 Hero 粒子共用冷暖色，保证 About manifesto 像同一种视觉材料凝结成语言。
const COOL = '#7890a8'
const WARM = '#e0d5c1'
// 在模块加载时读取一次，避免 render 阶段访问 window 触发 purity 规则。
const DEVICE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1

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

/**
 * @description 将文本像素点转换成 R3F points，并根据滚动进度从散点云 morph 到文字形态
 * @dependencies 依赖 @react-three/fiber、Three.js BufferGeometry/ShaderMaterial、ScrollTrigger 和 TextParticleField 预计算结果
 * @performance 几何和 uniform 通过 useMemo 创建；Canvas 使用 frameloop="demand"，只有 ScrollTrigger 更新时 invalidate，避免空闲 GPU 常驻
 * @caveats field 中的随机值已提前烘焙，这里只做像素坐标到 viewport 世界坐标的确定性映射，避免 render 期间产生随机抖动
 * @steps
 * step1: 把 field.targets 拆成 scatter position、aTarget、aDelay、aSeed 四组 BufferAttribute
 * step2: 创建 shader uniform，限制 uPixelRatio 不超过设备质量档位的 dprMax
 * step3: ScrollTrigger scrub 更新 uProgress，并手动 invalidate 一帧
 * step4: 组件卸载或 field 变化时释放 BufferGeometry
 */
function GlyphPoints({
  field,
  dprMax,
  triggerRef,
}: {
  dprMax: number
  field: TextParticleField
  triggerRef: RefObject<HTMLDivElement | null>
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, invalidate } = useThree()

  const { geometry, uniforms } = useMemo(() => {
    const n = field.targets.length
    const target = new Float32Array(n * 3)
    const scatter = new Float32Array(n * 3)
    const delay = new Float32Array(n)
    const seed = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const t = field.targets[i]!
      target[i * 3] = (t.x / field.width - 0.5) * viewport.width
      target[i * 3 + 1] = -(t.y / field.height - 0.5) * viewport.height
      target[i * 3 + 2] = 0
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
        uPixelRatio: { value: Math.min(DEVICE_DPR, dprMax) },
        uPointBase: { value: 8.0 },
        uCool: { value: new THREE.Color(COOL) },
        uWarm: { value: new THREE.Color(WARM) },
      },
    }
  }, [dprMax, field, viewport.width, viewport.height])

  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 98%',
      end: 'bottom 22%',
      scrub: 0.85,
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

/**
 * @description 捕获 R3F/Canvas 初始化或运行错误，把 About 粒子文案降级为静态文字
 * @dependencies 依赖 React class error boundary；onError 由 TextParticles 写入 webglFailed latch
 * @caveats 错误只影响当前 TextParticles 视觉层，真实文本仍由 sr/fallback DOM 保留，避免内容消失
 */
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
  /** 要被采样成粒子目标的真实文案，同时用于静态 fallback 和辅助技术文本 */
  text: string
  /** 外部样式类，用于章节局部排版 */
  className?: string
  /** 桌面端目标字号，窄列会按容器宽度自动下调 */
  fontSize?: number
}

/**
 * @description About 章节的签名式“粒子凝结成文字”组件，把 manifesto 文案从散点云过渡到可读语言
 * @dependencies 依赖 R3F Canvas、Three.js shader points、ScrollTrigger、buildTextParticleField、GLQualityProfile 和 useReducedMotion
 * @performance 使用 frameloop="demand"、按设备质量限制 dpr/采样点数，并在 WebGL 可用时登记 context 预算；resize 通过 rAF 合并重算
 * @caveats reduced-motion 或 WebGL 报错时降级为静态 serif 文案；真实 text 始终保留在 DOM 中，避免 SEO/无障碍依赖 Canvas
 * @steps
 * step1: 根据容器宽度、字体和质量档位采样文字像素点
 * step2: 字体 ready 或窗口 resize 后重建 field，并请求 ScrollTrigger refresh
 * step3: WebGL 可用时渲染 demand Canvas 和 GlyphPoints
 * step4: 任意降级条件触发时输出静态文本，不占用 WebGL context
 */
export default function TextParticles({ text, className = '', fontSize = 72 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [field, setField] = useState<TextParticleField | null>(null)
  const reduced = useReducedMotion()
  const quality = useMemo(() => getGLQualityProfile(), [])
  const [webglFailed, setWebglFailed] = useState(false)
  const fallback = reduced || webglFailed

  useEffect(() => {
    if (fallback || !field) return
    acquireContext()
    return () => releaseContext()
  }, [fallback, field])

  useEffect(() => {
    if (fallback) return
    const wrap = wrapRef.current
    if (!wrap) return

    const compute = () => {
      const cw = Math.max(1, wrap.clientWidth)
      const fs = Math.max(26, Math.min(fontSize, cw / 6.5))
      const serif = getComputedStyle(wrap).getPropertyValue('--font-serif').trim() || 'serif'
      const f = buildTextParticleField({
        text,
        maxWidth: cw,
        fontSize: fs,
        fontFamily: serif,
        fontWeight: 500,
        sampleGap: quality.textSampleGap,
        maxTargets: quality.textMaxTargets,
      })
      wrap.style.height = `${f.height}px`
      setField(f)
    }

    compute()
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (cancelled) return
      compute()
      requestScrollRefresh(true)
    })

    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        compute()
        requestScrollRefresh()
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [text, fontSize, fallback, quality.textMaxTargets, quality.textSampleGap])

  if (fallback) {
    return (
      <div className={`text-particles text-particles--static ${className}`}>
        <span className="text-particles__sr">{text}</span>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={`text-particles text-particles--gl${field ? ' text-particles--ready' : ''} ${className}`}>
      <span className="text-particles__fallback" aria-hidden="true">{text}</span>
      <CanvasErrorBoundary onError={() => setWebglFailed(true)}>
        {field && (
          <Canvas
            frameloop="demand"
            dpr={[1, Math.min(2, quality.dprMax)]}
            gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 5], fov: 60 }}
            style={{ position: 'absolute', inset: 0 }}
            aria-hidden="true"
          >
            <GlyphPoints dprMax={quality.dprMax} field={field} triggerRef={wrapRef} />
          </Canvas>
        )}
      </CanvasErrorBoundary>
      <span className="text-particles__sr">{text}</span>
    </div>
  )
}

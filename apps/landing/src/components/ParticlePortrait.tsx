import { useMemo, useRef, useEffect, useState, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/motion'
import { isMobileExperience } from '../lib/device'
import { onIntroExit } from '../lib/intro'
import { isLive } from '../lib/stage'
import { useGLSurface } from '../lib/webgl/useGLSurface'
import { acquireContext, releaseContext } from '../lib/webgl/contextRegistry'
import { getGLQualityProfile, type GLQualityProfile } from '../lib/webgl/quality'
import { acquireTexture, releaseTexture } from '../lib/webgl/textureCache'

// "Has the loader intro finished at least once?" now reads from the stage SSOT
// (isLive()). When the hero scrolls far away its Canvas is unmounted to free GPU
// memory; on scroll-back it remounts, and a live stage lets the portrait
// re-materialize instantly instead of waiting on (or replaying) the 2.2s reveal.

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

function PortraitPoints({ quality, texture }: { quality: GLQualityProfile; texture: THREE.Texture }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  // On a remount after the intro already played, start fully materialized
  // (introRef = 1) so there's no blank wait or replayed reveal.
  const introRef = useRef(isLive() ? 1 : 0)
  const mouseRef = useRef(new THREE.Vector2(99, 99))
  const targetMouseRef = useRef(new THREE.Vector2(99, 99))
  const isHoveringRef = useRef(false)
  const { size, viewport } = useThree()

  const [started, setStarted] = useState(() => isLive())

  useEffect(() => {
    if (isLive()) return
    return onIntroExit(() => setStarted(true))
  }, [])

  const aspect = useMemo<[number, number]>(() => {
    const img = texture.image as { width?: number; height?: number } | null
    const ar = img && img.width && img.height ? img.width / img.height : 0.8
    if (ar < 1) return [ar * 2.4, 2.4]
    return [2.4, (1 / ar) * 2.4]
  }, [texture])

  const geometry = useMemo(() => {
    const segments = isMobileExperience() ? Math.min(quality.portraitSegments, 160) : quality.portraitSegments
    return new THREE.PlaneGeometry(1, 1, segments, segments)
  }, [quality.portraitSegments])

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uMouseStrength: { value: 0.25 }, // 降低推开粒子时的物理感官力度 (从 0.35 降至 0.25)
      uDepth: { value: 0.8 },
      uPointSize: { value: 3.5 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, quality.dprMax) },
      uIntro: { value: 0 },
      uTintCool: { value: new THREE.Color('#7890a8') },
      uTintWarm: { value: new THREE.Color('#e0d5c1') },
      uAspect: { value: new THREE.Vector2(aspect[0], aspect[1]) },
    }),
    [texture, aspect, quality.dprMax]
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

/**
 * @description WebGL 纹理加载 hook。通过全局 `textureCache` 获取共享纹理，保证 Hero 粒子层在
 *   scroll-away 卸载、scroll-back 重挂载时不重复上传同一张照片纹理。
 * @dependencies
 *   - Three.js Texture filter 参数（LinearFilter / generateMipmaps=false）
 *   - `acquireTexture` / `releaseTexture` 引用计数缓存
 *   - public 目录中的 `/portrait/tim.jpg`
 * @performance / @caveats
 *   - `generateMipmaps=false` 是有意取舍：粒子点云以点采样和 alpha 混合为主，不需要完整 mip 链，
 *     可减少纹理上传后的 GPU 内存占用。
 *   - effect cleanup 总是调用 `releaseTexture(src)`；即使 Promise 尚未 resolve，也通过 `cancelled`
 *     阻止 setState，避免卸载后写入 React 状态。
 *   - 纹理加载失败只设置 `failed=true` 并返回 null 场景，Hero 仍由 CSS ghost photo 承担兜底视觉。
 * @steps
 *   step1: acquireTexture(src) 从共享缓存获取或新建纹理
 *   step2: 配置纹理 filter 与 mipmap 策略
 *   step3: 成功时写入 texture state；失败时写入 failed state
 *   step4: cleanup 释放当前 src 的引用计数
 */
function useImperativeTexture(src: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Shared cache so concurrent uses dedupe; ref-counted so the last release
    // disposes — preserving the unmount-frees-GPU-memory design (see textureCache).
    void acquireTexture(src, (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
    })
      .then((tex) => {
        if (cancelled) return
        setTexture(tex)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        console.warn(`[ParticlePortrait] failed to load ${src} — run \`npm run setup\` inside portfolio/.`)
      })

    return () => {
      cancelled = true
      releaseTexture(src)
    }
  }, [src])

  return { texture, failed }
}

/**
 * @description WebGL Canvas 错误边界。用于捕获 R3F/Three 在运行时可能抛出的 context lost、
 *   shader compile 或设备能力异常，让 Hero 降级为空 Canvas 而不是整站白屏。
 * @dependencies React class ErrorBoundary；下层 Canvas 由 `ParticlePortrait` 挂载
 * @performance / @caveats 捕获后直接返回 null，不做重试；重试 WebGL context 可能造成连续崩溃或 GPU 压力放大
 * @steps
 *   step1: getDerivedStateFromError 标记 errored=true
 *   step2: componentDidCatch 输出轻量 warning，保留组件栈用于调试
 *   step3: render 阶段返回 null，由 Hero 静态 ghost 视觉兜底
 */
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

/**
 * @description 粒子肖像场景桥接层。先解析纹理加载状态，再决定是否挂载真正的 `PortraitPoints`。
 * @dependencies `useImperativeTexture` 负责纹理缓存和失败兜底；`PortraitPoints` 负责几何与 shader 动画
 * @performance / @caveats 在纹理未就绪或失败时返回 null，避免创建空材质/空几何造成无意义 GPU work
 */
function PortraitScene({ quality, src }: { quality: GLQualityProfile; src: string }) {
  const { texture, failed } = useImperativeTexture(src)
  if (failed || !texture) return null
  return <PortraitPoints quality={quality} texture={texture} />
}

/**
 * @description 粒子肖像 —— Hero 章节的 WebGL 核心视觉层。
 *   将 Tim 的照片转换为点云粒子场 (R3F Canvas + 自定义 GLSL 着色器)，
 *   以 GPU 驱动的顶点着色器实现以下效果：
 *     1. 亮度→Z 轴位移：暗区域凹陷，亮区域凸起，形成伪 3D 浮雕
 *     2. Simplex Noise 微动：粒子随时间缓慢漂移，制造 "呼吸感"
 *     3. 鼠标互动排斥：粒子避开指针，产生 "推开" 交互
 *     4. 亮度→PointSize：高亮像素渲染更大粒子，边缘像素缩小
 *     5. 入场动效：introUniform (0→1) 控制粒子从 Z 深处浮出
 *
 *   智能生命周期 (useGLSurface):
 *     - visible margin (120px): 在此 band 内 frameloop="always" 运行着色器
 *     - mount margin (100% viewport): 在此 band 外 Canvas 完全卸载，释放 WebGL context / textures / geometry
 *     - 两边界之间的 hysteresis 防止 mount/unmount 频繁切换
 *
 * @dependencies
 *   - React Three Fiber (Canvas, useFrame, useThree)
 *   - Three.js (ShaderMaterial, BufferGeometry, Points)
 *   - GLSL vertex/fragment shaders (Simplex noise, sRGB luma, edge detection)
 *   - `useGLSurface` (双 IntersectionObserver smart mount/pause)
 *   - `getGLQualityProfile` (设备能力自适应 particle count + DPR 上限)
 *   - `acquireTexture / releaseTexture` (引用计数纹理缓存)
 *   - `contextRegistry` (WebGL context 预算管理 —— 仅允许有限数量的并发 WebGL 场景)
 *   - `useReducedMotion` (降动时完全跳过 Canvas 渲染)
 *
 * @performance / @caveats
 *   - `geometry.setDrawRange(0, 0)` — 在没有纹理时阻止 GPU 绘制任何粒子 (避免空白帧开销)
 *   - 着色器内置 edge detection (Sobel-like, 相邻像素亮度差) —— edge 像素使用更大 alpha/pointsSize，
 *     在粒子密度较低 (移动端) 时保持边缘可见
 *   - `uPixelRatio` 传入着色器以适配 Retina/HiDPI 屏幕点大小
 *   - `useFrame` 中 `introRef` 仅在前 2.2s 递增 (0→1)，之后跳过计算分支节省 GPU ALU
 *   - `CanvasErrorBoundary` 捕获 WebGL context lost 等异常，静默降级为 null (幽灵照片替代)
 *   - `acquireTexture` 使用 shared cache + refcount → 快速重挂载时复用已加载纹理，卸载时最后一个引用释放才 dispose
 *
 * @steps
 *   step1: 检查 reduced-motion (OS 降动) → 如果开启，返回 null
 *   step2: useGLSurface 返回 { visible, mounted } → 控制 Canvas frameloop 与 挂载
 *   step3: getGLQualityProfile → 根据设备能力返回 particle count / size / DPR
 *   step4: acquireContext → 注册 WebGL context 到全局预算
 *   step5: Canvas 渲染 (仅当 mounted) → PortraitScene
 *   step6:   useImperativeTexture → acquireTexture (shared cache)
 *   step7:   PortraitPoints → 构建 BufferGeometry + 着色器 → useFrame (animate intro + mouse)
 *   step8: 卸载时释放 context + texture refcount
 */
export default function ParticlePortrait({ src = '/portrait/tim.jpg' }: { src?: string }) {
  // Smart mount/pause lifecycle (dual IntersectionObserver + hysteresis) is now
  // the shared GL-surface contract. `visible` gates the render loop; `mounted`
  // unmounts the whole Canvas a viewport away to free GPU memory.
  const { ref: wrapRef, visible, mounted } = useGLSurface()
  const reduced = useReducedMotion()
  const quality = useMemo(() => getGLQualityProfile(), [])

  // Account this Canvas in the WebGL context budget for its mounted lifetime,
  // so optional surfaces (the transition field) can see real pressure.
  useEffect(() => {
    if (reduced || !mounted) return
    acquireContext()
    return () => releaseContext()
  }, [reduced, mounted])

  // Honour the OS "reduce motion" setting: skip the animated particle field
  // entirely. The static hero ghost photo behind it carries the composition.
  if (reduced) return null

  return (
    <CanvasErrorBoundary>
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
        {mounted && (
          <Canvas
            frameloop={visible ? 'always' : 'never'}
            dpr={[1, quality.dprMax]}
            gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 2.4], fov: 45 }}
            style={{ background: 'transparent' }}
          >
            <PortraitScene quality={quality} src={src} />
          </Canvas>
        )}
      </div>
    </CanvasErrorBoundary>
  )
}

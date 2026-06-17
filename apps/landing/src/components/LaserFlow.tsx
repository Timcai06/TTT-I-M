import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion } from '../lib/motion'
import VERT from './shaders/LaserFlow.vert.glsl'
import FRAG from './shaders/LaserFlow.frag.glsl'

/**
 * @description React Bits LaserFlow（官方 TS 版）—— 体积感激光束 + wisp 微流 + 体积雾。
 *   渲染在**不透明黑底**上（alpha:false / NormalBlending），靠容器的
 *   `mix-blend-mode: screen` 把黑色抠掉、只留下发光的光束，因此必须套在带
 *   screen 混合的容器里（见 .projects__bento-laser）。
 * @customization 相比上游官方源，本仓库加了两处护栏：
 *   1. `prefersReducedMotion()` 早退 —— 降动用户不启动 WebGL；
 *   2. DPR 上限 1.5（官方为 2）—— 与本仓库其它 canvas 像素预算一致。
 * @perf 自带 IntersectionObserver 离屏暂停、visibilitychange 后台暂停、
 *   基于实测 FPS 的自适应 DPR、上下文丢失恢复，挂载/卸载完整清理。
 */

interface LaserUniforms {
  iTime: THREE.IUniform<number>
  iResolution: THREE.IUniform<THREE.Vector3>
  iMouse: THREE.IUniform<THREE.Vector4>
  uWispDensity: THREE.IUniform<number>
  uTiltScale: THREE.IUniform<number>
  uFlowTime: THREE.IUniform<number>
  uFogTime: THREE.IUniform<number>
  uBeamXFrac: THREE.IUniform<number>
  uBeamYFrac: THREE.IUniform<number>
  uFlowSpeed: THREE.IUniform<number>
  uVLenFactor: THREE.IUniform<number>
  uHLenFactor: THREE.IUniform<number>
  uFogIntensity: THREE.IUniform<number>
  uFogScale: THREE.IUniform<number>
  uWSpeed: THREE.IUniform<number>
  uWIntensity: THREE.IUniform<number>
  uFlowStrength: THREE.IUniform<number>
  uDecay: THREE.IUniform<number>
  uFalloffStart: THREE.IUniform<number>
  uFogFallSpeed: THREE.IUniform<number>
  uColor: THREE.IUniform<THREE.Vector3>
  uFade: THREE.IUniform<number>
  [uniform: string]: THREE.IUniform
}

type Props = {
  className?: string
  style?: React.CSSProperties
  wispDensity?: number
  dpr?: number
  mouseSmoothTime?: number
  mouseTiltStrength?: number
  horizontalBeamOffset?: number
  verticalBeamOffset?: number
  flowSpeed?: number
  verticalSizing?: number
  horizontalSizing?: number
  fogIntensity?: number
  fogScale?: number
  wispSpeed?: number
  wispIntensity?: number
  flowStrength?: number
  decay?: number
  falloffStart?: number
  fogFallSpeed?: number
  color?: string
}

export const LaserFlow: React.FC<Props> = ({
  className,
  style,
  wispDensity = 1,
  dpr,
  mouseSmoothTime = 0.0,
  mouseTiltStrength = 0.01,
  horizontalBeamOffset = 0.1,
  verticalBeamOffset = 0.0,
  flowSpeed = 0.35,
  verticalSizing = 2.0,
  horizontalSizing = 0.5,
  fogIntensity = 0.45,
  fogScale = 0.3,
  wispSpeed = 15.0,
  wispIntensity = 5.0,
  flowStrength = 0.25,
  decay = 1.1,
  falloffStart = 1.2,
  fogFallSpeed = 0.6,
  color = '#FF79C6'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const uniformsRef = useRef<LaserUniforms | null>(null)
  const hasFadedRef = useRef(false)
  const rectRef = useRef<DOMRect | null>(null)
  const baseDprRef = useRef<number>(1)
  const currentDprRef = useRef<number>(1)
  const lastSizeRef = useRef({ width: 0, height: 0, dpr: 0 })
  const fpsSamplesRef = useRef<number[]>([])
  const lastFpsCheckRef = useRef<number>(0)
  const emaDtRef = useRef<number>(16.7) // ms
  const pausedRef = useRef<boolean>(false)
  const inViewRef = useRef<boolean>(true)

  const hexToRGB = (hex: string) => {
    let c = hex.trim()
    if (c[0] === '#') c = c.slice(1)
    if (c.length === 3)
      c = c
        .split('')
        .map(x => x + x)
        .join('')
    const n = parseInt(c, 16) || 0xffffff
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || prefersReducedMotion()) return

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
      logarithmicDepthBuffer: false
    })
    rendererRef.current = renderer

    baseDprRef.current = Math.min(dpr ?? (window.devicePixelRatio || 1), 1.5)
    currentDprRef.current = baseDprRef.current

    renderer.setPixelRatio(currentDprRef.current)
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    mount.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))

    const uniforms: LaserUniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      uWispDensity: { value: wispDensity },
      uTiltScale: { value: mouseTiltStrength },
      uFlowTime: { value: 0 },
      uFogTime: { value: 0 },
      uBeamXFrac: { value: horizontalBeamOffset },
      uBeamYFrac: { value: verticalBeamOffset },
      uFlowSpeed: { value: flowSpeed },
      uVLenFactor: { value: verticalSizing },
      uHLenFactor: { value: horizontalSizing },
      uFogIntensity: { value: fogIntensity },
      uFogScale: { value: fogScale },
      uWSpeed: { value: wispSpeed },
      uWIntensity: { value: wispIntensity },
      uFlowStrength: { value: flowStrength },
      uDecay: { value: decay },
      uFalloffStart: { value: falloffStart },
      uFogFallSpeed: { value: fogFallSpeed },
      uColor: { value: new THREE.Vector3(1, 1, 1) },
      uFade: { value: hasFadedRef.current ? 1 : 0 }
    }
    uniformsRef.current = uniforms

    const material = new THREE.RawShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    scene.add(mesh)

    const clock = new THREE.Clock()
    let prevTime = 0
    let fade = hasFadedRef.current ? 1 : 0

    const mouseTarget = new THREE.Vector2(0, 0)
    const mouseSmooth = new THREE.Vector2(0, 0)

    const setSizeNow = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      const pr = currentDprRef.current

      const last = lastSizeRef.current
      const sizeChanged = Math.abs(w - last.width) > 0.5 || Math.abs(h - last.height) > 0.5
      const dprChanged = Math.abs(pr - last.dpr) > 0.01
      if (!sizeChanged && !dprChanged) {
        return
      }

      lastSizeRef.current = { width: w, height: h, dpr: pr }
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w * pr, h * pr, pr)
      rectRef.current = canvas.getBoundingClientRect()

      if (!pausedRef.current) {
        renderer.render(scene, camera)
      }
    }

    let resizeRaf = 0
    const scheduleResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(setSizeNow)
    }

    setSizeNow()
    const ro = new ResizeObserver(scheduleResize)
    ro.observe(mount)

    const io = new IntersectionObserver(
      entries => {
        inViewRef.current = entries[0]?.isIntersecting ?? true
      },
      { root: null, threshold: 0 }
    )
    io.observe(mount)

    const onVis = () => {
      pausedRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onVis, { passive: true })

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = rectRef.current
      if (!rect) return
      const x = clientX - rect.left
      const y = clientY - rect.top
      const ratio = currentDprRef.current
      const hb = rect.height * ratio
      mouseTarget.set(x * ratio, hb - y * ratio)
    }
    const onMove = (ev: PointerEvent | MouseEvent) => updateMouse(ev.clientX, ev.clientY)
    const onLeave = () => mouseTarget.set(0, 0)
    canvas.addEventListener('pointermove', onMove as EventListener, { passive: true })
    canvas.addEventListener('pointerdown', onMove as EventListener, { passive: true })
    canvas.addEventListener('pointerenter', onMove as EventListener, { passive: true })
    canvas.addEventListener('pointerleave', onLeave as EventListener, { passive: true })

    const onCtxLost = (e: Event) => {
      e.preventDefault()
      pausedRef.current = true
    }
    const onCtxRestored = () => {
      pausedRef.current = false
      scheduleResize()
    }
    canvas.addEventListener('webglcontextlost', onCtxLost, false)
    canvas.addEventListener('webglcontextrestored', onCtxRestored, false)

    let raf = 0

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const dprFloor = 0.6
    const lowerThresh = 50
    const upperThresh = 58
    let lastDprChangeRef = 0
    const dprChangeCooldown = 2000

    const adjustDprIfNeeded = (now: number) => {
      const elapsed = now - lastFpsCheckRef.current
      if (elapsed < 750) return

      const samples = fpsSamplesRef.current
      if (samples.length === 0) {
        lastFpsCheckRef.current = now
        return
      }
      const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length

      let next = currentDprRef.current
      const base = baseDprRef.current

      if (avgFps < lowerThresh) {
        next = clamp(currentDprRef.current * 0.85, dprFloor, base)
      } else if (avgFps > upperThresh && currentDprRef.current < base) {
        next = clamp(currentDprRef.current * 1.1, dprFloor, base)
      }

      if (Math.abs(next - currentDprRef.current) > 0.01 && now - lastDprChangeRef > dprChangeCooldown) {
        currentDprRef.current = next
        lastDprChangeRef = now
        setSizeNow()
      }

      fpsSamplesRef.current = []
      lastFpsCheckRef.current = now
    }

    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (pausedRef.current || !inViewRef.current) return

      const t = clock.getElapsedTime()
      const dt = Math.max(0, t - prevTime)
      prevTime = t

      const dtMs = dt * 1000
      emaDtRef.current = emaDtRef.current * 0.9 + dtMs * 0.1
      const instFps = 1000 / Math.max(1, emaDtRef.current)
      fpsSamplesRef.current.push(instFps)

      uniforms.iTime.value = t

      const cdt = Math.min(0.033, Math.max(0.001, dt))
      uniforms.uFlowTime.value += cdt
      uniforms.uFogTime.value += cdt

      if (!hasFadedRef.current) {
        const fadeDur = 1.0
        fade = Math.min(1, fade + cdt / fadeDur)
        uniforms.uFade.value = fade
        if (fade >= 1) hasFadedRef.current = true
      }

      const tau = Math.max(1e-3, mouseSmoothTime)
      const alpha = 1 - Math.exp(-cdt / tau)
      mouseSmooth.lerp(mouseTarget, alpha)
      uniforms.iMouse.value.set(mouseSmooth.x, mouseSmooth.y, 0, 0)

      renderer.render(scene, camera)

      adjustDprIfNeeded(performance.now())
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointermove', onMove as EventListener)
      canvas.removeEventListener('pointerdown', onMove as EventListener)
      canvas.removeEventListener('pointerenter', onMove as EventListener)
      canvas.removeEventListener('pointerleave', onLeave as EventListener)
      canvas.removeEventListener('webglcontextlost', onCtxLost)
      canvas.removeEventListener('webglcontextrestored', onCtxRestored)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (mount.contains(canvas)) mount.removeChild(canvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return

    uniforms.uWispDensity.value = wispDensity
    uniforms.uTiltScale.value = mouseTiltStrength
    uniforms.uBeamXFrac.value = horizontalBeamOffset
    uniforms.uBeamYFrac.value = verticalBeamOffset
    uniforms.uFlowSpeed.value = flowSpeed
    uniforms.uVLenFactor.value = verticalSizing
    uniforms.uHLenFactor.value = horizontalSizing
    uniforms.uFogIntensity.value = fogIntensity
    uniforms.uFogScale.value = fogScale
    uniforms.uWSpeed.value = wispSpeed
    uniforms.uWIntensity.value = wispIntensity
    uniforms.uFlowStrength.value = flowStrength
    uniforms.uDecay.value = decay
    uniforms.uFalloffStart.value = falloffStart
    uniforms.uFogFallSpeed.value = fogFallSpeed

    const { r, g, b } = hexToRGB(color || '#FFFFFF')
    uniforms.uColor.value.set(r, g, b)
  }, [
    wispDensity,
    mouseTiltStrength,
    horizontalBeamOffset,
    verticalBeamOffset,
    flowSpeed,
    verticalSizing,
    horizontalSizing,
    fogIntensity,
    fogScale,
    wispSpeed,
    wispIntensity,
    flowStrength,
    decay,
    falloffStart,
    fogFallSpeed,
    color
  ])

  return <div ref={mountRef} className={`laser-flow-container ${className || ''}`.trim()} style={style} />
}

export default LaserFlow

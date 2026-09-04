import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/motion'
import { tryAcquireOptionalContext } from '../lib/webgl/contextRegistry'
import VERT from './shaders/Dither.vert.glsl'
import FRAG from './shaders/Dither.frag.glsl'

interface DitherUniforms {
  iTime: THREE.IUniform<number>
  iResolution: THREE.IUniform<THREE.Vector2>
  uColorLow: THREE.IUniform<THREE.Vector3>
  uColorHigh: THREE.IUniform<THREE.Vector3>
  uColorSteps: THREE.IUniform<number>
  uScale: THREE.IUniform<number>
  uSpeed: THREE.IUniform<number>
  uPixelSize: THREE.IUniform<number>
  uFade: THREE.IUniform<number>
  [uniform: string]: THREE.IUniform
}

type Props = {
  /** Quantization levels — lower = chunkier dither banding. Default 5. */
  colorSteps?: number
  /** Noise field zoom. Default 3.2. */
  scale?: number
  /** Drift speed. Default 0.5. */
  speed?: number
  /** Retro dither block size in device px — larger = chunkier pixel dots. Default 3. */
  pixelSize?: number
  className?: string
}

// Two-tone black↔red palette — mirrors the reference's black↔white, in red.
const COLOR_LOW = new THREE.Vector3(0.027, 0.012, 0.012) // #070303 near-black
const COLOR_HIGH = new THREE.Vector3(0.847, 0.118, 0.086) // #d81e16 red

/**
 * @description Dither 开屏背景 —— 单 pass 的「波动噪声 + Bayer 有序抖动」着色器，配成红黑/余烬。
 *   只作为 intro 面板的动态背景层（替换原静态渐变的角色），面板退场后随 Loader 卸载，
 *   不进站点稳态 GPU 预算。
 * @customization 不依赖 postprocessing（官方 React Bits Dither 的双 pass 依赖），
 *   把抖动量化折进主 fragment，单 pass。降动用户直接早退（不挂 canvas，露出 intro 的静态渐变兜底）。
 * @perf DPR 上限 1.5；visibilitychange 后台暂停；挂载 1s uFade 淡入；卸载完整清理 + forceContextLoss。
 *   不绑指针/不做离屏 IO（intro 期间始终全屏可见）。
 */
export default function DitherBackground({
  colorSteps = 5,
  scale = 3.2,
  speed = 0.5,
  pixelSize = 3,
  className = '',
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || reducedMotion) return
    mount.dataset.ditherState = 'fallback'

    const contextLease = tryAcquireOptionalContext('loader-dither')
    if (!contextLease) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      })
    } catch {
      contextLease.release()
      // The intro already carries a CSS gradient fallback. A denied or lost
      // WebGL context must not tear down the React tree around it.
      return
    }
    let canvas: HTMLCanvasElement | null = null
    let geometry: THREE.BufferGeometry | null = null
    let material: THREE.RawShaderMaterial | null = null
    let resizeObserver: ResizeObserver | null = null
    let resizeFallbackAttached = false
    let visibilityAttached = false
    let contextLossAttached = false
    let disposed = false
    let contextLost = false
    let shaderFailed = false
    let raf = 0
    let running = false
    let lastFrame = 0
    let elapsed = 0
    let fade = 0
    let scene: THREE.Scene | null = null
    let camera: THREE.OrthographicCamera | null = null
    let uniforms: DitherUniforms | null = null
    const stop = () => {
      running = false
      window.cancelAnimationFrame(raf)
      raf = 0
      lastFrame = 0
    }
    const setSize = () => {
      if (!uniforms) return
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w * dpr, h * dpr)
      uniforms.uPixelSize.value = Math.max(1, pixelSize * dpr)
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    const disposeSurface = () => {
      if (disposed) return
      disposed = true
      stop()
      resizeObserver?.disconnect()
      if (resizeFallbackAttached) window.removeEventListener('resize', setSize)
      if (visibilityAttached) document.removeEventListener('visibilitychange', onVis)
      if (contextLossAttached) canvas?.removeEventListener('webglcontextlost', onContextLost)
      geometry?.dispose()
      material?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      contextLease.release()
      canvas?.remove()
      mount.dataset.ditherState = 'fallback'
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      disposeSurface()
    }

    const animate = (now: number) => {
      if (!running || contextLost || disposed || !uniforms || !scene || !camera || !canvas) return
      if (lastFrame === 0) lastFrame = now
      const delta = Math.min(0.1, Math.max(0, now - lastFrame) / 1000)
      lastFrame = now
      elapsed += delta
      uniforms.iTime.value = elapsed
      if (fade < 1) {
        fade = Math.min(1, fade + delta)
        uniforms.uFade.value = fade
      }
      renderer.render(scene, camera)
      if (shaderFailed) {
        disposeSurface()
        return
      }
      if (mount.dataset.ditherState !== 'live') {
        canvas.style.opacity = '1'
        mount.dataset.ditherState = 'live'
      }
      raf = requestAnimationFrame(animate)
    }
    const start = () => {
      if (running || contextLost || disposed || document.hidden) return
      running = true
      lastFrame = 0
      raf = requestAnimationFrame(animate)
    }

    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      renderer.debug.onShaderError = () => { shaderFailed = true }
      renderer.setPixelRatio(dpr)
      renderer.setClearColor(0x000000, 1)
      canvas = renderer.domElement
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.display = 'block'
      canvas.style.opacity = '0'
      mount.appendChild(canvas)
      mount.dataset.ditherState = 'initializing'
      canvas.addEventListener('webglcontextlost', onContextLost)
      contextLossAttached = true

      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))

      uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1, 1) },
        uColorLow: { value: COLOR_LOW.clone() },
        uColorHigh: { value: COLOR_HIGH.clone() },
        uColorSteps: { value: colorSteps },
        uScale: { value: scale },
        uSpeed: { value: speed },
        uPixelSize: { value: Math.max(1, pixelSize * dpr) },
        uFade: { value: 0 },
      }

      material = new THREE.RawShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        depthTest: false,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.frustumCulled = false
      scene.add(mesh)

      setSize()
      resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(setSize)
      if (resizeObserver) resizeObserver.observe(mount)
      else {
        window.addEventListener('resize', setSize, { passive: true })
        resizeFallbackAttached = true
      }
      document.addEventListener('visibilitychange', onVis, { passive: true })
      visibilityAttached = true
      start()
    } catch {
      disposeSurface()
      return
    }

    return disposeSurface
  }, [colorSteps, pixelSize, reducedMotion, scale, speed])

  return <div ref={mountRef} className={`intro__dither ${className}`.trim()} aria-hidden="true" />
}

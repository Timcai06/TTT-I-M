import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion } from '../lib/motion'
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
    })
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(dpr)
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

    const uniforms: DitherUniforms = {
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

    const material = new THREE.RawShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    scene.add(mesh)

    const setSize = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w * dpr, h * dpr)
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(mount)

    let paused = false
    const onVis = () => {
      paused = document.hidden
    }
    document.addEventListener('visibilitychange', onVis, { passive: true })

    const clock = new THREE.Clock()
    let raf = 0
    let fade = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (paused) return
      const t = clock.getElapsedTime()
      uniforms.iTime.value = t
      if (fade < 1) {
        fade = Math.min(1, fade + 1 / 60) // ~1s ease-in over frames
        uniforms.uFade.value = fade
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (mount.contains(canvas)) mount.removeChild(canvas)
    }
  }, [colorSteps, scale, speed, pixelSize])

  return <div ref={mountRef} className={`intro__dither ${className}`.trim()} aria-hidden="true" />
}

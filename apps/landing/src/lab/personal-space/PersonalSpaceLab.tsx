import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Mesh, Texture, type Material, type BufferGeometry, type WebGLRenderer } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { createArchiveModelLoader } from '../../components/personal-archive/archiveModelLoader'
import { facts } from '../../content'
import { useReducedMotion } from '../../lib/motion'
import { acquireOptionalContextWhenAvailable, canCreateWebGL2Context, type ContextLease } from '../../lib/webgl/contextRegistry'
import { getGLQualityProfile } from '../../lib/webgl/quality'
import SpaceScene from './SpaceScene'
import modelUrl from '../../assets/personal-archive/personal-space.glb?url'
import cameras from '../../assets/personal-archive/cameras.json'
import { prepareArchiveMaterials } from '../../components/personal-archive/archiveMaterials'
import './personal-space.css'

function disposeModel(model: GLTF) {
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  model.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const mesh = object as Mesh<BufferGeometry, Material | Material[]>
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material)
  })
  materials.forEach((material) => {
    Object.values(material).forEach((value) => { if (value instanceof Texture) textures.add(value) })
    material.dispose()
  })
  textures.forEach((texture) => {
    texture.dispose()
    const data: unknown = texture.source.data
    if (typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap) data.close()
  })
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function PersonalSpaceLab() {
  const [model, setModel] = useState<GLTF | null>(null)
  const [renderer, setRenderer] = useState<WebGLRenderer | null>(null)
  const [admitted, setAdmitted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [opened, setOpened] = useState(false)
  const [reading, setReading] = useState(false)
  const reducedMotion = useReducedMotion()
  const openButton = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const rendererCleanup = useRef<(() => void) | null>(null)
  const fail = useCallback(() => { setFailed(true) }, [])

  useEffect(() => {
    let cancelled = false
    let lease: ContextLease | null = null
    const timeout = window.setTimeout(fail, 20_000)
    const cancelAdmission = acquireOptionalContextWhenAvailable('personal-space-lab', (acquired) => {
      lease = acquired
      queueMicrotask(() => {
        if (cancelled) return
        if (!canCreateWebGL2Context()) { acquired.release(); fail(); return }
        window.clearTimeout(timeout)
        setAdmitted(true)
      })
    })
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      cancelAdmission()
      rendererCleanup.current?.()
      rendererCleanup.current = null
      lease?.release()
    }
  }, [fail])

  useEffect(() => {
    if (!renderer) return
    let cancelled = false, loaded: GLTF | null = null
    const timeout = window.setTimeout(fail, 20_000)
    const resource = createArchiveModelLoader(renderer)
    void resource.loader.loadAsync(modelUrl).then(result => {
      window.clearTimeout(timeout)
      if (cancelled) { disposeModel(result); return }
      loaded = result
      prepareArchiveMaterials(result.scene, renderer.capabilities.getMaxAnisotropy())
      const project = result.scene.getObjectByName('MonitorState_project'), photo = result.scene.getObjectByName('MonitorState_photo')
      if (project) project.visible = true
      if (photo) photo.visible = false
      setModel(result)
    }).catch(() => { window.clearTimeout(timeout); if (!cancelled) fail() }).finally(resource.dispose)
    return () => { cancelled = true; window.clearTimeout(timeout); if (loaded) disposeModel(loaded) }
  }, [renderer, fail])

  const close = useCallback(() => {
    setReading(false)
    setOpened(false)
    openButton.current?.focus()
  }, [])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [close])
  useEffect(() => { if (reading) heading.current?.focus() }, [reading])

  const settled = useCallback((isOpen: boolean) => {
    setReady(true)
    setReading(isOpen)
  }, [])
  const open = useCallback(() => {
    setOpened(true)
    if (failed || !ready) setReading(true)
  }, [failed, ready])

  return <main className={`space-lab ${reading ? 'space-lab--reading' : ''}`} data-ready={ready} data-opened={opened}>
    <div className="space-lab__scene" aria-hidden="true">
      {admitted && !failed && <SceneBoundary onFailure={fail}>
        <Canvas shadows frameloop="demand" dpr={[1, getGLQualityProfile().dprMax]}
          camera={{ position: cameras.entrance.position as [number, number, number], fov: cameras.entrance.fov, near: 0.02, far: 30 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            setRenderer(gl)
            const lost = (event: Event) => { event.preventDefault(); fail() }
            gl.domElement.addEventListener('webglcontextlost', lost)
            rendererCleanup.current = () => {
              gl.domElement.removeEventListener('webglcontextlost', lost)
              gl.dispose()
              gl.forceContextLoss()
            }
          }}>
          {model && <SpaceScene model={model} opened={opened} reducedMotion={reducedMotion} onOpen={open} onSettled={settled} />}
        </Canvas>
      </SceneBoundary>}
    </div>
    <header className="space-lab__header">
      <a href="/" className="space-lab__brand">TIM CAI <span>／ PERSONAL ARCHIVE</span></a>
      <span className="space-lab__edition">材质与物件 · STUDY 02</span>
    </header>
    {!reading && <div className="space-lab__intro">
      <p className="space-lab__eyebrow">A PLACE TO THINK & MAKE</p>
      <h1>一些想法，<br />在这里发生。</h1>
      <p>从桌上的笔记本，认识我。</p>
    </div>}
    <nav className="space-lab__controls" aria-label="空间操作">
      <button ref={openButton} onClick={open} aria-expanded={reading} aria-controls="space-about">打开笔记本 <span>↗</span></button>
      {opened && <button onClick={close}>返回空间 <span>↙</span></button>}
      <a href="/#about">直接阅读原站</a>
    </nav>
    <p className="space-lab__status" role="status">{failed ? '当前使用文字阅读模式' : !ready ? '正在准备空间，可先打开文字档案' : opened && !reading ? '正在靠近笔记本' : '01 / ABOUT · 其余章节物件待接入'}</p>
    {reading && <section id="space-about" className="space-lab__reader" aria-labelledby="space-about-title">
      <div className="space-lab__reader-top"><span>PERSONAL ARCHIVE / 001</span><button onClick={close} aria-label="关闭档案，返回空间">×</button></div>
      <p className="space-lab__eyebrow">ABOUT</p>
      <h2 ref={heading} tabIndex={-1} id="space-about-title">把想法，<br />做成可以运行的东西。</h2>
      <p>上海大一在读，我把模型、数据和交互做成能运行、能复盘的系统。</p>
      <p>我关心的不只是模型有没有跑通，而是证据从哪来、运行时发生了什么，以及别人能不能复现。</p>
      <dl className="space-lab__facts">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      <a href="/#about">继续阅读完整 About ↗</a>
    </section>}
  </main>
}

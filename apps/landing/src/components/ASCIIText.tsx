import { useEffect, type CSSProperties } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  getWebGLRecoveryDelay,
  type ContextLease,
} from '../lib/webgl/contextRegistry'
import { useGLSurface } from '../lib/webgl/useGLSurface'

const ASCII_FONT_WAIT_MS = 2_000

function waitForAsciiFonts(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(finish, ASCII_FONT_WAIT_MS)
    void Promise.all([
      document.fonts.load('600 200px "JetBrains Mono"').catch(() => undefined),
      document.fonts.ready,
    ]).then(finish)
  })
}

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
  vUv = uv;
  float time = uTime * 5.0;
  vec3 transformed = position;
  transformed.x += sin(time + position.y) * 0.5 * uEnableWaves;
  transformed.y += cos(time + position.z) * 0.15 * uEnableWaves;
  transformed.z += sin(time + position.x) * uEnableWaves;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}`

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
  vec2 pos = vUv;
  float r = texture2D(uTexture, pos + cos(uTime + pos.x) * 0.01).r;
  float g = texture2D(uTexture, pos + tan(uTime * 0.5 + pos.x - uTime) * 0.01).g;
  float b = texture2D(uTexture, pos - cos(uTime * 2.0 + pos.y) * 0.01).b;
  float a = texture2D(uTexture, pos).a;
  gl_FragColor = vec4(r, g, b, a);
}`

const mapRange = (value: number, start: number, stop: number, outputStart: number, outputStop: number) =>
  ((value - start) / (stop - start)) * (outputStop - outputStart) + outputStart

class CanvasText {
  readonly canvas = document.createElement('canvas')
  readonly context = this.canvas.getContext('2d')
  private text: string
  private fontSize: number
  private color: string

  constructor(text: string, fontSize: number, color: string) {
    this.text = text
    this.fontSize = fontSize
    this.color = color
  }

  resize() {
    if (!this.context) return
    this.context.font = `600 ${this.fontSize}px "JetBrains Mono"`
    const metrics = this.context.measureText(this.text)
    this.canvas.width = Math.ceil(metrics.width) + 20
    this.canvas.height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 20
  }

  render() {
    if (!this.context) return
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.fillStyle = this.color
    this.context.font = `600 ${this.fontSize}px "JetBrains Mono"`
    const metrics = this.context.measureText(this.text)
    this.context.fillText(this.text, 10, 10 + metrics.actualBoundingBoxAscent)
  }
}

class AsciiFilter {
  readonly domElement = document.createElement('div')
  // The live glyph grid is decorative and aria-hidden. Keep the only semantic
  // <pre> as the durable fallback so assistive/document tooling never sees two
  // competing preformatted representations of the same text.
  private readonly glyphs = document.createElement('div')
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })
  private columns = 0
  private rows = 0
  private angle = 0
  private pointer = { x: 0, y: 0 }
  private center = { x: 0, y: 0 }
  private readonly charset = ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
  private renderer: THREE.WebGLRenderer
  private fontSize: number

  constructor(renderer: THREE.WebGLRenderer, fontSize: number) {
    this.renderer = renderer
    this.fontSize = fontSize
    this.domElement.className = 'ascii-filter'
    this.glyphs.className = 'ascii-text__glyphs'
    this.glyphs.setAttribute('aria-hidden', 'true')
    this.domElement.append(this.glyphs, this.canvas)
    if (this.context) this.context.imageSmoothingEnabled = false
  }

  setPointer(x: number, y: number) { this.pointer = { x, y } }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false)
    this.center = { x: width / 2, y: height / 2 }
    this.pointer = { ...this.center }
    if (!this.context) return
    this.context.font = `${this.fontSize}px "JetBrains Mono"`
    const charWidth = this.context.measureText('A').width
    this.columns = Math.max(1, Math.floor(width / charWidth))
    this.rows = Math.max(1, Math.floor(height / this.fontSize))
    this.canvas.width = this.columns
    this.canvas.height = this.rows
    this.glyphs.style.fontSize = `${this.fontSize}px`
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.render(scene, camera)
    if (!this.context) return
    const width = this.canvas.width
    const height = this.canvas.height
    this.context.clearRect(0, 0, width, height)
    this.context.drawImage(this.renderer.domElement, 0, 0, width, height)
    const data = this.context.getImageData(0, 0, width, height).data
    let output = ''
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = x * 4 + y * 4 * width
        const alpha = data[index + 3] ?? 0
        if (alpha === 0) {
          output += ' '
          continue
        }
        const red = data[index] ?? 0
        const green = data[index + 1] ?? 0
        const blue = data[index + 2] ?? 0
        const gray = (0.3 * red + 0.6 * green + 0.1 * blue) / 255
        const character = Math.max(0, Math.min(this.charset.length - 1, Math.floor(gray * (this.charset.length - 1))))
        output += this.charset[character] ?? ' '
      }
      output += '\n'
    }
    this.glyphs.textContent = output
    const targetAngle = Math.atan2(this.pointer.y - this.center.y, this.pointer.x - this.center.x) * 180 / Math.PI
    this.angle += (targetAngle - this.angle) * 0.075
    this.domElement.style.filter = `hue-rotate(${this.angle.toFixed(1)}deg)`
  }
}

class AsciiScene {
  private width: number
  private height: number
  private readonly camera: THREE.PerspectiveCamera
  private readonly scene = new THREE.Scene()
  private renderer!: THREE.WebGLRenderer
  private filter!: AsciiFilter
  private textCanvas!: CanvasText
  private texture!: THREE.CanvasTexture
  private geometry!: THREE.PlaneGeometry
  private material!: THREE.ShaderMaterial
  private mesh!: THREE.Mesh
  private frame = 0
  private running = false
  private disposed = false
  private shaderFailed = false
  private contextLease: ContextLease | null = null
  private pointer = { x: 0, y: 0 }
  private container: HTMLElement
  private readonly onContextLost: () => void
  private options: Required<Pick<ASCIITextProps, 'text' | 'asciiFontSize' | 'textFontSize' | 'textColor' | 'planeBaseHeight' | 'enableWaves'>>

  constructor(
    container: HTMLElement,
    options: Required<Pick<ASCIITextProps, 'text' | 'asciiFontSize' | 'textFontSize' | 'textColor' | 'planeBaseHeight' | 'enableWaves'>>,
    width: number,
    height: number,
    onContextLost: () => void,
  ) {
    this.container = container
    this.options = options
    this.width = width
    this.height = height
    this.onContextLost = onContextLost
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
    this.camera.position.z = 30
    this.pointer = { x: width / 2, y: height / 2 }
  }

  init(contextLease: ContextLease) {
    if (this.disposed) {
      contextLease.release()
      throw new Error('Cannot initialize a disposed ASCII scene.')
    }
    this.contextLease = contextLease
    this.textCanvas = new CanvasText(this.options.text, this.options.textFontSize, this.options.textColor)
    this.textCanvas.resize()
    this.textCanvas.render()
    this.texture = new THREE.CanvasTexture(this.textCanvas.canvas)
    this.texture.minFilter = THREE.NearestFilter
    const aspect = this.textCanvas.canvas.width / this.textCanvas.canvas.height
    this.geometry = new THREE.PlaneGeometry(this.options.planeBaseHeight * aspect, this.options.planeBaseHeight, 36, 36)
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.options.enableWaves ? 1 : 0 },
      },
    })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.mesh)
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    this.renderer.debug.onShaderError = () => { this.shaderFailed = true }
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.setPixelRatio(1)
    this.renderer.setClearColor(0x000000, 0)
    this.filter = new AsciiFilter(this.renderer, this.options.asciiFontSize)
    this.container.appendChild(this.filter.domElement)
    this.setSize(this.width, this.height)
  }

  setSize(width: number, height: number) {
    this.width = width
    this.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.filter.setSize(width, height)
  }

  setPointer(x: number, y: number) {
    this.pointer = { x, y }
    this.filter.setPointer(x, y)
  }

  start() {
    if (this.running) return
    this.running = true
    const animate = () => {
      if (!this.running) return
      this.frame = requestAnimationFrame(animate)
      try {
        const time = performance.now() * 0.001
        this.textCanvas.render()
        this.texture.needsUpdate = true
        const timeUniform = this.material.uniforms.uTime
        if (timeUniform) timeUniform.value = Math.sin(time)
        const rotationX = mapRange(this.pointer.y, 0, this.height, 0.5, -0.5)
        const rotationY = mapRange(this.pointer.x, 0, this.width, -0.5, 0.5)
        this.mesh.rotation.x += (rotationX - this.mesh.rotation.x) * 0.05
        this.mesh.rotation.y += (rotationY - this.mesh.rotation.y) * 0.05
        this.filter.render(this.scene, this.camera)
        if (this.shaderFailed) this.fail()
      } catch {
        this.fail()
      }
    }
    animate()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.geometry?.dispose()
    this.material?.dispose()
    this.texture?.dispose()
    this.scene.clear()
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    this.filter?.domElement.remove()
    this.contextLease?.release()
    this.contextLease = null
  }

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault()
    this.fail()
  }

  private fail() {
    if (this.disposed) return
    this.stop()
    this.contextLease?.release()
    this.contextLease = null
    this.onContextLost()
  }
}

interface ASCIITextProps {
  text?: string
  asciiFontSize?: number
  textFontSize?: number
  textColor?: string
  planeBaseHeight?: number
  enableWaves?: boolean
  className?: string
  gradient?: string
}

export default function ASCIIText({
  text = 'LET\'S BUILD',
  asciiFontSize = 8,
  textFontSize = 190,
  textColor = '#6f342c',
  planeBaseHeight = 8,
  enableWaves = true,
  className = '',
  gradient = 'radial-gradient(circle, #6f342c 0%, #9d7459 48%, #425c5b 100%)',
}: ASCIITextProps) {
  const { ref: containerRef, mounted, visible } = useGLSurface({
    renderMargin: '12% 0px',
    mountMargin: '35% 0px',
    initiallyMounted: false,
  })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.dataset.asciiState = 'idle'
    if (reducedMotion || !mounted || !visible) {
      container.dataset.asciiState = 'fallback'
      return
    }
    let scene: AsciiScene | null = null
    let cancelled = false
    let initializing = false
    let failureCount = 0
    let retryTimer = 0
    let stopWaitingForContext = () => {}
    const scheduleRetry = () => {
      if (cancelled) return
      const delay = getWebGLRecoveryDelay(failureCount)
      if (delay === null) return
      window.clearTimeout(retryTimer)
      retryTimer = window.setTimeout(() => {
        initializing = false
        void setup()
      }, delay)
    }
    const recoverFromFailure = (instance: AsciiScene) => {
      if (scene === instance) scene = null
      instance.dispose()
      initializing = false
      failureCount += 1
      container.dataset.asciiState = 'fallback'
      scheduleRetry()
    }
    const setup = async () => {
      if (initializing || scene) return
      initializing = true
      container.dataset.asciiState = 'initializing'
      await waitForAsciiFonts()
      if (cancelled) return
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        container.dataset.asciiState = 'waiting-for-size'
        initializing = false
        return
      }
      container.dataset.asciiState = 'waiting-for-context'
      stopWaitingForContext = acquireOptionalContextWhenAvailable('contact-ascii', (lease) => {
        if (cancelled) {
          lease.release()
          return
        }
        const instance = new AsciiScene(container, {
          text,
          asciiFontSize,
          textFontSize,
          textColor,
          planeBaseHeight,
          enableWaves,
        }, rect.width, rect.height, () => {
          recoverFromFailure(instance)
        })
        try {
          instance.init(lease)
        } catch {
          recoverFromFailure(instance)
          return
        }
        if (cancelled) {
          instance.dispose()
          return
        }
        scene = instance
        container.dataset.asciiState = 'live'
        initializing = false
        try {
          scene.start()
        } catch {
          recoverFromFailure(instance)
        }
      })
    }
    const resizeScene = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return
      if (scene) {
        const instance = scene
        try {
          instance.setSize(width, height)
        } catch {
          recoverFromFailure(instance)
        }
      }
      else if (!initializing) void setup()
    }
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      resizeScene(entry.contentRect.width, entry.contentRect.height)
    })
    const resizeFallback = () => {
      const rect = container.getBoundingClientRect()
      resizeScene(rect.width, rect.height)
    }
    const pointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      scene?.setPointer(event.clientX - rect.left, event.clientY - rect.top)
    }
    resize?.observe(container)
    if (!resize) window.addEventListener('resize', resizeFallback, { passive: true })
    container.addEventListener('pointermove', pointer)
    void setup()
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      stopWaitingForContext()
      resize?.disconnect()
      window.removeEventListener('resize', resizeFallback)
      container.removeEventListener('pointermove', pointer)
      scene?.dispose()
    }
  }, [asciiFontSize, containerRef, enableWaves, mounted, planeBaseHeight, reducedMotion, text, textColor, textFontSize, visible])

  return (
    <div
      ref={containerRef}
      className={`ascii-text-container${className ? ` ${className}` : ''}`}
      style={{ '--ascii-gradient': gradient } as CSSProperties}
      aria-hidden="true"
    >
      <pre className="ascii-text__fallback">{text}</pre>
    </div>
  )
}

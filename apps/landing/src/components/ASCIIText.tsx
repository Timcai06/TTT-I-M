import { useEffect, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'

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
  private readonly pre = document.createElement('pre')
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
    this.domElement.append(this.pre, this.canvas)
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
    this.pre.style.fontSize = `${this.fontSize}px`
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
    this.pre.textContent = output
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
  private pointer = { x: 0, y: 0 }
  private container: HTMLElement
  private options: Required<Pick<ASCIITextProps, 'text' | 'asciiFontSize' | 'textFontSize' | 'textColor' | 'planeBaseHeight' | 'enableWaves'>>

  constructor(
    container: HTMLElement,
    options: Required<Pick<ASCIITextProps, 'text' | 'asciiFontSize' | 'textFontSize' | 'textColor' | 'planeBaseHeight' | 'enableWaves'>>,
    width: number,
    height: number,
  ) {
    this.container = container
    this.options = options
    this.width = width
    this.height = height
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
    this.camera.position.z = 30
    this.pointer = { x: width / 2, y: height / 2 }
  }

  async init() {
    await document.fonts.load('600 200px "JetBrains Mono"').catch(() => undefined)
    await document.fonts.ready
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
    }
    animate()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  dispose() {
    this.stop()
    this.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.filter.domElement.remove()
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.dataset.asciiState = 'idle'
    let scene: AsciiScene | null = null
    let cancelled = false
    let visible = false
    let initializing = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setup = async () => {
      if (initializing || scene) return
      initializing = true
      container.dataset.asciiState = 'initializing'
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        container.dataset.asciiState = 'waiting-for-size'
        initializing = false
        return
      }
      const instance = new AsciiScene(container, {
        text,
        asciiFontSize,
        textFontSize,
        textColor,
        planeBaseHeight,
        enableWaves: enableWaves && !reduced,
      }, rect.width, rect.height)
      try {
        await instance.init()
      } catch {
        // Keep the real-text fallback rendered below when WebGL is denied.
        // This effect is decorative and must never make Contact unreadable.
        container.dataset.asciiState = 'fallback'
        initializing = false
        return
      }
      if (cancelled) {
        instance.dispose()
        return
      }
      scene = instance
      container.dataset.asciiState = 'live'
      initializing = false
      container.querySelector('.ascii-text__fallback')?.remove()
      if (visible) scene.start()
    }

    const setVisible = (next: boolean) => {
      visible = next
      if (!scene && visible) void setup()
      else if (visible) scene?.start()
      else scene?.stop()
    }
    const intersection = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setVisible(entry.isIntersecting)
    }, { rootMargin: '12% 0px', threshold: 0.01 })
    const checkRect = () => {
      const rect = container.getBoundingClientRect()
      setVisible(rect.bottom >= -window.innerHeight * 0.12 && rect.top <= window.innerHeight * 1.12)
    }
    const resize = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        scene?.setSize(entry.contentRect.width, entry.contentRect.height)
      }
    })
    const pointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      scene?.setPointer(event.clientX - rect.left, event.clientY - rect.top)
    }
    intersection.observe(container)
    resize.observe(container)
    container.addEventListener('pointermove', pointer)
    window.addEventListener('scroll', checkRect, { passive: true })
    const initialCheck = requestAnimationFrame(checkRect)
    return () => {
      cancelled = true
      cancelAnimationFrame(initialCheck)
      intersection.disconnect()
      resize.disconnect()
      container.removeEventListener('pointermove', pointer)
      window.removeEventListener('scroll', checkRect)
      scene?.dispose()
    }
  }, [asciiFontSize, enableWaves, planeBaseHeight, text, textColor, textFontSize])

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

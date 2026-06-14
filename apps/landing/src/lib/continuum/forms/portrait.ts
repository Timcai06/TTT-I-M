import * as THREE from 'three'

export interface PortraitPixelSource {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface PortraitTargetOptions {
  threshold?: number
  scale?: number
  depth?: number
  jitter?: number
}

interface PortraitCandidate {
  x: number
  y: number
  z: number
  weight: number
}

const DEFAULT_THRESHOLD = 0.18
const DEFAULT_SCALE = 1.34
const DEFAULT_DEPTH = 0.36
const DEFAULT_JITTER = 0.012

function luminance(r: number, g: number, b: number) {
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
}

function hash01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function fallbackCandidate(index: number, count: number, scale: number): PortraitCandidate {
  const t = count <= 1 ? 0 : index / (count - 1)
  const angle = t * Math.PI * 2 * 5
  const radius = scale * (0.12 + 0.44 * Math.sqrt(t))
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: (hash01(index + 11) - 0.5) * 0.16,
    weight: 0.25,
  }
}

/**
 * @description 将肖像 RGBA 像素采样为连续体 GPGPU 目标纹理数据。
 * @dependencies 浏览器 Canvas/ImageData 或测试传入的 RGBA buffer；Three DataTexture 由运行时包装函数创建
 * @performance / @caveats 这是 M0 的启动期一次性工作；候选像素按亮度排序后均匀分配给粒子，
 *   不在逐帧路径执行。空图/全黑图返回有限 fallback 数据，避免 GPGPU 目标出现 NaN。
 */
export function buildPortraitTargetData(
  source: PortraitPixelSource,
  texSize: number,
  options: PortraitTargetOptions = {}
): Float32Array {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const scale = options.scale ?? DEFAULT_SCALE
  const depth = options.depth ?? DEFAULT_DEPTH
  const jitter = options.jitter ?? DEFAULT_JITTER
  const count = texSize * texSize
  const aspect = source.width / Math.max(1, source.height)
  const candidates: PortraitCandidate[] = []

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4
      const alpha = (source.data[offset + 3] ?? 0) / 255
      if (alpha <= 0.01) continue

      const weight = luminance(source.data[offset] ?? 0, source.data[offset + 1] ?? 0, source.data[offset + 2] ?? 0) * alpha
      if (weight < threshold) continue

      const nx = source.width <= 1 ? 0 : x / (source.width - 1) - 0.5
      const ny = source.height <= 1 ? 0 : 0.5 - y / (source.height - 1)

      candidates.push({
        x: nx * 2 * aspect * scale,
        y: ny * 2 * scale,
        z: (weight - 0.5) * depth,
        weight,
      })
    }
  }

  candidates.sort((a, b) => b.weight - a.weight)

  const data = new Float32Array(count * 4)
  for (let i = 0; i < count; i += 1) {
    const candidateIndex = Math.floor((i / Math.max(1, count - 1)) * Math.max(0, candidates.length - 1))
    const candidate = candidates[candidateIndex] ?? fallbackCandidate(i, count, scale)
    const jitterX = (hash01(i * 2 + 1) - 0.5) * jitter
    const jitterY = (hash01(i * 2 + 2) - 0.5) * jitter
    const offset = i * 4

    data[offset] = candidate.x + jitterX
    data[offset + 1] = candidate.y + jitterY
    data[offset + 2] = candidate.z
    data[offset + 3] = candidate.weight
  }

  return data
}

export function createPortraitTargetTexture(
  source: PortraitPixelSource,
  texSize: number,
  options?: PortraitTargetOptions
): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    buildPortraitTargetData(source, texSize, options),
    texSize,
    texSize,
    THREE.RGBAFormat,
    THREE.FloatType
  )
  texture.needsUpdate = true
  return texture
}

async function decodeImage(src: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  if (typeof image.decode === 'function') {
    await image.decode()
  } else {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(`Failed to load portrait image: ${src}`))
    })
  }
  return image
}

export async function loadPortraitTargetTexture(src: string, texSize: number): Promise<THREE.DataTexture> {
  const image = await decodeImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not create 2D canvas context for portrait target')

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return createPortraitTargetTexture(imageData, texSize)
}

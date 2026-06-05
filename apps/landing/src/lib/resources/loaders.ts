import { preloadLazyChapters } from '../../chapters/registry'
import { preloadAboutTextParticles } from '../aboutTextParticles'
import { enqueueImageDecode } from './imageDecodeQueue'

// Per-resource-type loaders. This is the seam for future asset types:
// KTX2 (KTX2Loader.detectSupport(renderer)), Draco/Meshopt-compressed GLTF, etc.
// add a loader here and a manifest entry — nothing else changes.

export const HERO_TEXTURE = '/portrait/tim.jpg'
const FONT_READY_DEV_TIMEOUT_MS = 6000
type ImageDecodeMode = 'eager' | 'idle' | 'none'

interface LoadImageOptions {
  decode?: ImageDecodeMode
  fetchPriority?: 'high' | 'low' | 'auto'
  loading?: 'eager' | 'lazy'
}

export function loadImage(src: string, {
  decode = 'none',
  fetchPriority = 'low',
  loading = 'lazy',
}: LoadImageOptions = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const complete = async () => {
      if (settled) return
      settled = true
      if (decode === 'eager' && typeof image.decode === 'function') {
        try {
          await image.decode()
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn(`[resources] eager image decode rejected for ${src}`, error)
          }
        }
      } else if (decode === 'idle') {
        void enqueueImageDecode(image).catch((error) => {
          if (import.meta.env.DEV) {
            console.warn(`[resources] idle image decode rejected for ${src}`, error)
          }
        })
      }
      resolve()
    }
    const image = new Image()
    image.decoding = 'async'
    image.loading = loading
    image.fetchPriority = fetchPriority
    image.onload = complete
    image.onerror = () => reject(new Error(`Failed to preload image: ${src}`))
    image.src = src

    if (image.complete) {
      image.onload = null
      image.onerror = null
      if (image.naturalWidth <= 0) {
        reject(new Error(`Failed to preload image: ${src}`))
        return
      }
      void complete()
    }
  })
}

export function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (import.meta.env.DEV) {
    return Promise.race([
      document.fonts.ready.then(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          console.warn(`[resources] document.fonts.ready exceeded ${FONT_READY_DEV_TIMEOUT_MS}ms in dev; continuing with current font fallback.`)
          resolve()
        }, FONT_READY_DEV_TIMEOUT_MS)
      }),
    ])
  }
  return document.fonts.ready.then(() => undefined)
}

export async function loadHeroTexture(): Promise<void> {
  const THREE = await import('three')
  const texture = await new THREE.TextureLoader().loadAsync(HERO_TEXTURE)
  // Warms the HTTP/decode cache; the actual GPU upload happens (ref-counted) when
  // ParticlePortrait mounts. Disposing here keeps the unmount-frees-memory design.
  texture.dispose()
}

export function loadPretext(): Promise<void> {
  return import('@chenglou/pretext').then(() => undefined)
}

export function loadTextParticlesChunk(): Promise<void> {
  return import('../../components/TextParticles').then(() => undefined)
}

export { preloadLazyChapters, preloadAboutTextParticles }

import { preloadLazyChapters } from '../../chapters/registry'
import { preloadAboutTextParticles } from '../aboutTextParticles'

// Per-resource-type loaders. This is the seam for future asset types:
// KTX2 (KTX2Loader.detectSupport(renderer)), Draco/Meshopt-compressed GLTF, etc.
// add a loader here and a manifest entry — nothing else changes.

export const HERO_TEXTURE = '/portrait/tim.jpg'
const FONT_READY_DEV_TIMEOUT_MS = 6000

export function loadImage(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const complete = () => {
      if (settled) return
      settled = true
      resolve()
      // Decode off the critical path: fire-and-forget so a heavy decode never
      // blocks the task from settling (keeps the intro gate moving).
      if (typeof image.decode === 'function') {
        void image.decode().catch((error) => {
          if (import.meta.env.DEV) {
            console.warn(`[resources] image loaded but decode().catch rejected for ${src}`, error)
          }
        })
      }
    }
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
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
      complete()
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

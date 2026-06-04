import * as THREE from 'three'

/**
 * Ref-counted texture cache.
 *
 * Unifies the texture-load path so overlapping consumers share one decode/upload
 * instead of each loading its own, and gives future scenes a single, KTX2-ready
 * entry point.
 *
 * Deliberately ref-counted rather than persistent: ParticlePortrait intentionally
 * unmounts its whole Canvas when the hero scrolls a viewport away to free GPU
 * memory. A persistent cache would fight that by keeping the texture resident, so
 * here the last release disposes. The result preserves the unmount-frees-memory
 * design while still de-duplicating any *concurrent* uses (StrictMode double
 * mount, future multiple portraits, etc.).
 *
 * KTX2/Draco/Meshopt: this is the seam to add them. KTX2Loader needs
 * `detectSupport(renderer)`, so a `.ktx2` branch would take a renderer param;
 * left as an explicit extension point rather than half-wired.
 */
type ConfigureTexture = (texture: THREE.Texture) => void

interface CacheEntry {
  promise: Promise<THREE.Texture>
  texture: THREE.Texture | null
  refs: number
}

const cache = new Map<string, CacheEntry>()
const loader = new THREE.TextureLoader()

/**
 * Acquire a texture by url, incrementing its ref count. `configure` runs once,
 * the first time the texture loads (e.g. set filters / mipmaps).
 */
export function acquireTexture(src: string, configure?: ConfigureTexture): Promise<THREE.Texture> {
  const existing = cache.get(src)
  if (existing) {
    existing.refs += 1
    return existing.promise
  }

  const entry: CacheEntry = { promise: Promise.resolve() as unknown as Promise<THREE.Texture>, texture: null, refs: 1 }
  entry.promise = loader.loadAsync(src).then((texture) => {
    configure?.(texture)
    // Only keep it if no one released us to zero while loading.
    if (cache.get(src) === entry) entry.texture = texture
    else texture.dispose()
    return texture
  })
  cache.set(src, entry)
  return entry.promise
}

/** Release one ref; the last release disposes and evicts. */
export function releaseTexture(src: string): void {
  const entry = cache.get(src)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs > 0) return
  cache.delete(src)
  entry.texture?.dispose()
}

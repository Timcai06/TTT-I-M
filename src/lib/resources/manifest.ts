import { archiveImages } from '../../data/frames'
import { photos } from '../../data/life'
import { projects } from '../../data/projects'
import {
  HERO_TEXTURE,
  loadFonts,
  loadHeroTexture,
  loadImage,
  loadPretext,
  loadTextParticlesChunk,
  preloadAboutTextParticles,
  preloadLazyChapters,
} from './loaders'

// SCOPE = LANDING. This manifest covers only the bounded, curated landing asset
// set. The future blog / work / UGC zones grow without bound and must NOT be
// added here — they load lazily / via SSR. (See plan/00-principles.md.)

export type ResourceTier = 'critical' | 'deferred'
export type ResourceType = 'image' | 'font' | 'texture' | 'chunk' | 'particles'

export interface ResourceTask {
  id: string
  label: string
  tier: ResourceTier
  type: ResourceType
  load: () => Promise<void>
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function srcSetUrls(srcSet: string) {
  return srcSet
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
}

function collectImageUrls() {
  const frameUrls = archiveImages.flatMap((image) => [
    image.src,
    ...srcSetUrls(image.srcSet),
  ])

  const projectUrls = projects.flatMap((project) =>
    project.media?.shots.flatMap((shot) => [shot.src]) ?? []
  )

  return unique([
    HERO_TEXTURE,
    '/portrait/about_me.jpg',
    ...photos.map((photo) => photo.src),
    ...projectUrls,
    ...frameUrls,
  ])
}

/**
 * The whole-site preload manifest, in load order.
 *
 * `critical` gates the intro (hero texture, fonts, Pretext, lazy chapter chunks,
 * the About manifesto particle field). `deferred` is every curated image — still
 * preloaded aggressively (no fast-scroll pop-in, an intentional product choice),
 * just after the critical group so the intro can resolve as soon as the
 * above-the-fold experience is ready.
 */
export function buildResourceManifest(): ResourceTask[] {
  const critical: ResourceTask[] = [
    { id: 'chunks:pretext', label: 'Pretext', tier: 'critical', type: 'chunk', load: loadPretext },
    { id: 'texture:hero', label: 'hero texture', tier: 'critical', type: 'texture', load: loadHeroTexture },
    { id: 'fonts:document', label: 'fonts', tier: 'critical', type: 'font', load: loadFonts },
    { id: 'chunks:chapters', label: 'chapters', tier: 'critical', type: 'chunk', load: preloadLazyChapters },
    { id: 'chunks:text-particles', label: 'TextParticles', tier: 'critical', type: 'chunk', load: loadTextParticlesChunk },
    { id: 'particles:about-manifesto', label: 'Built by hand, frame by frame.', tier: 'critical', type: 'particles', load: preloadAboutTextParticles },
  ]

  const deferred: ResourceTask[] = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    label: src,
    tier: 'deferred',
    type: 'image',
    load: () => loadImage(src),
  }))

  return [...critical, ...deferred]
}

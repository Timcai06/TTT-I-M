import { useEffect, useState } from 'react'
import { preloadLazyChapters } from '../chapters/registry'
import { archiveImages } from '../data/frames'
import { photos } from '../data/life'
import { projects } from '../data/projects'

interface PreloadTask {
  id: string
  label: string
  load: () => Promise<void>
}

export interface WholeSitePreloadState {
  completed: number
  failed: string[]
  label: string
  ready: boolean
  total: number
}

const HERO_TEXTURE = '/portrait/tim.jpg'

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

function loadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.onload = () => {
      if (typeof image.decode !== 'function') {
        resolve()
        return
      }
      image.decode().then(() => resolve(), reject)
    }
    image.onerror = () => reject(new Error(`Failed to preload image: ${src}`))
    image.src = src

    if (image.complete) {
      image.onload = null
      image.onerror = null
      if (image.naturalWidth <= 0) {
        reject(new Error(`Failed to preload image: ${src}`))
        return
      }
      if (typeof image.decode !== 'function') {
        resolve()
        return
      }
      image.decode().then(() => resolve(), reject)
    }
  })
}

function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return document.fonts.ready.then(() => undefined)
}

async function loadHeroTexture() {
  const THREE = await import('three')
  const texture = await new THREE.TextureLoader().loadAsync(HERO_TEXTURE)
  texture.dispose()
}

function createWholeSitePreloadTasks(): PreloadTask[] {
  const imageTasks = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    label: src,
    load: () => loadImage(src),
  }))

  return [
    { id: 'chunks:chapters', label: 'chapters', load: preloadLazyChapters },
    { id: 'chunks:text-particles', label: 'TextParticles', load: () => import('../components/TextParticles').then(() => undefined) },
    { id: 'texture:hero', label: 'hero texture', load: loadHeroTexture },
    { id: 'fonts:document', label: 'fonts', load: loadFonts },
    ...imageTasks,
  ]
}

export function useWholeSitePreload(): WholeSitePreloadState {
  const [tasks] = useState(createWholeSitePreloadTasks)
  const [state, setState] = useState<WholeSitePreloadState>(() => ({
    completed: 0,
    failed: [],
    label: 'Preparing',
    ready: false,
    total: tasks.length,
  }))

  useEffect(() => {
    let cancelled = false
    let completed = 0

    const running = tasks.map(async (task) => {
      await task.load()
      completed += 1
      if (!cancelled) {
        setState((current) => ({
          ...current,
          completed,
          label: task.label,
        }))
      }
    })

    void Promise.allSettled(running).then((results) => {
      if (cancelled) return

      const failed = results
        .map((result, index) => result.status === 'rejected' ? tasks[index]?.id : undefined)
        .filter((id): id is string => Boolean(id))

      if (failed.length > 0) {
        if (import.meta.env.DEV) {
          console.warn('[sitePreload] blocking intro because resources failed:', failed)
        }
        setState((current) => ({
          ...current,
          failed,
          ready: false,
        }))
        return
      }

      setState({
        completed: tasks.length,
        failed: [],
        label: 'Ready',
        ready: true,
        total: tasks.length,
      })
    })

    return () => {
      cancelled = true
    }
  }, [tasks])

  return state
}

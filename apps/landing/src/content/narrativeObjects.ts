import type { LifePhoto } from '../data/life.ts'
import type { ArchiveImage, ArchiveTheme } from '../data/frames.ts'
import { archiveThemes, photos } from './index.ts'

export type NarrativePhotoContentId = 'life-football-action' | 'frame-final-horizon'

export type NarrativePhotoResolution =
  | Readonly<{
      status: 'resolved'
      contentId: NarrativePhotoContentId
      photo: LifePhoto | ArchiveImage
    }>
  | Readonly<{
      status: 'error'
      contentId: string
      reason: 'unknown-content-id' | 'missing' | 'duplicate'
      matches: number
    }>

const photoSourceByContentId: Readonly<Record<NarrativePhotoContentId, string>> = Object.freeze({
  'life-football-action': '/life/football-action.webp',
  'frame-final-horizon': '/frame/scenery/scenery-11.webp',
})

/** Resolves semantic photo identity without relying on collection position. */
export function resolveNarrativePhoto(
  contentId: NarrativePhotoContentId,
  entries: readonly LifePhoto[] = photos,
  themes: readonly ArchiveTheme[] = archiveThemes,
): NarrativePhotoResolution {
  if (!Object.hasOwn(photoSourceByContentId, contentId)) {
    return Object.freeze({ status: 'error', contentId, reason: 'unknown-content-id', matches: 0 })
  }

  const source = photoSourceByContentId[contentId]
  const matches = contentId === 'life-football-action'
    ? entries.filter(photo => photo.src === source)
    : themes
      .filter(theme => theme.id === 'scenery')
      .flatMap(theme => theme.clusters.filter(cluster => cluster.id === 'scenery-close'))
      .flatMap(cluster => cluster.slots.filter(slot => slot.role === 'primary'))
      .map(slot => slot.image)
      .filter(image => image.id === 11 && image.src === source)
  const photo = matches[0]
  if (!photo || matches.length !== 1) {
    return Object.freeze({
      status: 'error',
      contentId,
      reason: matches.length === 0 ? 'missing' : 'duplicate',
      matches: matches.length,
    })
  }

  return Object.freeze({ status: 'resolved', contentId, photo })
}

export function resolveFinalHorizonImage(themes: readonly ArchiveTheme[] = archiveThemes): ArchiveImage {
  const resolved = resolveNarrativePhoto('frame-final-horizon', photos, themes)
  if (resolved.status !== 'resolved' || !('srcSet' in resolved.photo)) {
    throw new Error(`Frame final horizon is ${resolved.status === 'error' ? resolved.reason : 'invalid'}`)
  }
  return resolved.photo
}

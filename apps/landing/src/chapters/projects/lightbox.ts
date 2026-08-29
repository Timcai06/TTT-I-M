import type { ProjectShot } from '../../content'
import type { ImageLightboxItem } from '../../shared/media/openImageLightbox'
import { openSafeAsset } from '../../shared/media/openSafeAsset.ts'

export function toLightboxItems(shots: readonly ProjectShot[]): ImageLightboxItem[] {
  return shots.map((shot) => ({
    src: shot.src,
    alt: shot.alt,
    width: shot.width,
    height: shot.height,
    label: shot.label,
  }))
}

export async function openProjectLightbox(
  shots: readonly ProjectShot[],
  index: number,
  opener: HTMLElement,
): Promise<void> {
  const item = shots[index] ?? shots[0]
  if (!item) return

  try {
    const { openImageLightbox } = await import('../../shared/media/openImageLightbox')
    await openImageLightbox({ items: toLightboxItems(shots), index, opener })
  } catch (error) {
    console.warn('[projects] PhotoSwipe unavailable; opening the source image.', error)
    openSafeAsset(item.src)
  }
}

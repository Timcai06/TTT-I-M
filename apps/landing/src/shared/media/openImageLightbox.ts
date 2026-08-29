import type { SlideData } from 'photoswipe'

export interface ImageLightboxItem {
  src: string
  alt: string
  width: number
  height: number
  label?: string
}

export interface OpenImageLightboxOptions {
  items: readonly ImageLightboxItem[]
  index?: number
  opener?: HTMLElement | null
}

let activeLightbox: import('photoswipe').default | null = null

/**
 * Load PhotoSwipe only after an explicit image interaction. Callers retain a
 * normal href, so no-JS and import-failure paths can still reach the asset.
 */
export async function openImageLightbox({
  items,
  index = 0,
  opener,
}: OpenImageLightboxOptions): Promise<void> {
  if (items.length === 0) return

  const [{ default: PhotoSwipe }] = await Promise.all([
    import('photoswipe'),
    import('photoswipe/style.css'),
  ])

  activeLightbox?.destroy()

  const dataSource: SlideData[] = items.map((item, itemIndex) => ({
    src: item.src,
    msrc: item.src,
    alt: item.alt,
    width: item.width,
    height: item.height,
    element: itemIndex === index ? opener ?? undefined : undefined,
    caption: item.label,
  }))

  const lightbox = new PhotoSwipe({
    dataSource,
    index: Math.min(Math.max(index, 0), items.length - 1),
    bgOpacity: 0.96,
    loop: items.length > 2,
    returnFocus: true,
    trapFocus: true,
    closeTitle: '关闭图片预览',
    zoomTitle: '缩放图片',
    arrowPrevTitle: '上一张图片',
    arrowNextTitle: '下一张图片',
    errorMsg: '图片无法加载',
    appendToEl: opener?.closest<HTMLElement>('[role="dialog"]') ?? undefined,
  })

  activeLightbox = lightbox
  const closeBeforeParentOverlays = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopImmediatePropagation()
    lightbox.close()
  }
  window.addEventListener('keydown', closeBeforeParentOverlays, true)
  lightbox.on('destroy', () => {
    window.removeEventListener('keydown', closeBeforeParentOverlays, true)
    if (activeLightbox === lightbox) activeLightbox = null
    opener?.focus({ preventScroll: true })
  })
  lightbox.init()
}

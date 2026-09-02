import type { CSSProperties, MouseEvent, ReactElement } from 'react'
import type { ArchiveClusterSlot, ArchiveImage } from '../../content'
import {
  openImageLightbox,
  type ImageLightboxItem,
} from '../../shared/media/openImageLightbox'
import { openSafeAsset } from '../../shared/media/openSafeAsset.ts'
import SignatureMark from '../SignatureMark'

interface ArchiveSlotStyle extends CSSProperties {
  /** 图片原始宽高比，CSS 用它保留摄影构图比例，避免移动端和桌面端被硬裁切 */
  '--image-aspect'?: string
  /** 设计层次位移 X，来自内容层 slot.offset.x，并在组件内做安全钳制 */
  '--slot-x'?: string
  /** 设计层次位移 Y，来自内容层 slot.offset.y，并在组件内做安全钳制 */
  '--slot-y'?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * @description 渲染 Frame archive 里的单张摄影卡槽，保持原始比例、caption 对位和轻微层次偏移
 * @dependencies 依赖 ArchiveClusterSlot 内容结构、responsive srcSet/sizes 和 frame.css 中的 CSS 变量布局
 * @performance 所有图片保持 eager fetch 以支撑 Frame 快速滚入的可信展示；只有首图通过 fetchPriority=high 提升优先级
 * @caveats x/y offset 在组件内钳制；内容层 scale 不参与渲染，视觉层级统一由 role × orientation 尺度表控制
 */
export default function ArchiveImageSlot({
  eager,
  gallery,
  galleryIndex,
  slot,
}: {
  eager: boolean
  gallery: readonly ImageLightboxItem[]
  galleryIndex: number
  slot: ArchiveClusterSlot
}): ReactElement {
  const image: ArchiveImage = slot.image
  const slotStyle: ArchiveSlotStyle = {
    '--image-aspect': `${image.width} / ${image.height}`,
    '--slot-x': `${clamp(slot.offset?.x ?? 0, -10, 10)}px`,
    '--slot-y': `${clamp(slot.offset?.y ?? 0, -12, 12)}px`,
  }
  const openImage = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    void openImageLightbox({
      items: gallery,
      index: galleryIndex,
      opener: event.currentTarget,
    }).catch((error: unknown) => {
      console.warn('[frame] PhotoSwipe unavailable; opening the source image.', error)
      openSafeAsset(image.src)
    })
  }

  return (
    <figure
      className={[
        'archive-slot',
        `archive-slot--${slot.role}`,
        `archive-slot--${image.orientation}`,
      ].join(' ')}
      data-tone={image.tone}
      data-cursor="hover"
      style={slotStyle}
    >
      <a
        className="archive-slot__media archive-slot__open"
        data-particle-portal-target
        href={image.src}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openImage}
        aria-label={`全屏查看：${image.title}`}
      >
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={image.title}
          loading="eager"
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
        />
      </a>
      <figcaption className="archive-slot__caption">
        <span className="archive-slot__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
        <SignatureMark variant="seal" className="archive-slot__signature" />
      </figcaption>
    </figure>
  )
}

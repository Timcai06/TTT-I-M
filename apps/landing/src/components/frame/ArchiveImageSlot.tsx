import type { CSSProperties } from 'react'
import type { ArchiveClusterSlot, ArchiveImage } from '../../content'

interface ArchiveSlotStyle extends CSSProperties {
  '--image-aspect'?: string
  '--slot-x'?: string
  '--slot-y'?: string
  '--slot-scale'?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function ArchiveImageSlot({ eager, slot }: { eager: boolean; slot: ArchiveClusterSlot }) {
  const image: ArchiveImage = slot.image
  const slotStyle: ArchiveSlotStyle = {
    '--image-aspect': `${image.width} / ${image.height}`,
    '--slot-x': `${clamp(slot.offset?.x ?? 0, -10, 10)}px`,
    '--slot-y': `${clamp(slot.offset?.y ?? 0, -12, 12)}px`,
    '--slot-scale': clamp(slot.offset?.scale ?? 1, 0.9, 1.08),
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
      <div className="archive-slot__media">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={image.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'low'}
        />
      </div>
      <figcaption className="archive-slot__caption">
        <span className="archive-slot__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
      </figcaption>
    </figure>
  )
}

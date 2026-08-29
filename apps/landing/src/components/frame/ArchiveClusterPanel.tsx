import type { ArchiveCluster, ArchiveTheme } from '../../content'
import type { ImageLightboxItem } from '../../shared/media/openImageLightbox'
import ArchiveImageSlot from './ArchiveImageSlot'

export default function ArchiveClusterPanel({
  cluster,
  eagerFirstImage,
  theme,
}: {
  cluster: ArchiveCluster
  eagerFirstImage: boolean
  theme: ArchiveTheme
}) {
  const lightboxItems: readonly ImageLightboxItem[] = cluster.slots.map(({ image }) => ({
    src: image.src,
    alt: `${image.title} · ${image.location}`,
    width: image.width,
    height: image.height,
    label: `${image.title} — ${image.meta}`,
  }))

  return (
    <article
      className={[
        'frame-panel',
        'frame-panel--cluster',
        'archive-cluster',
        `archive-cluster--${cluster.layout}`,
        `archive-cluster--theme-${theme.id}`,
        `archive-cluster--direction-${theme.direction}`,
        `archive-cluster--rhythm-${cluster.rhythm}`,
      ].join(' ')}
      data-theme={theme.id}
      data-cluster={cluster.id}
      data-cluster-title={cluster.title}
      data-direction={theme.direction}
    >
      {cluster.slots.map((slot, index) => (
        <ArchiveImageSlot
          eager={eagerFirstImage && index === 0}
          gallery={lightboxItems}
          galleryIndex={index}
          key={`${cluster.id}-${slot.image.src}`}
          slot={slot}
        />
      ))}
    </article>
  )
}

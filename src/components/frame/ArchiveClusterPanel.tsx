import type { ArchiveCluster, ArchiveTheme } from '../../data/frames'
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
          key={`${cluster.id}-${slot.image.src}`}
          slot={slot}
        />
      ))}
    </article>
  )
}

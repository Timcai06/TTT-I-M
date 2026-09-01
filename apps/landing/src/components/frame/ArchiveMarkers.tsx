import type { ArchiveCluster, ArchiveTheme } from '../../content'

export function ArchiveThemeMarker({ theme }: { theme: ArchiveTheme }) {
  return (
    <article className="frame-panel frame-panel--theme archive-theme-marker" data-theme={theme.id}>
      <p className="frame-panel__eyebrow">{theme.eyebrow}</p>
      <h2 className="archive-theme-marker__title">{theme.title}</h2>
      <p className="frame-panel__body archive-theme-marker__body">{theme.body}</p>
    </article>
  )
}

export function ArchiveClusterMarker({
  cluster,
  clusterIndex,
  theme,
}: {
  cluster: ArchiveCluster
  clusterIndex: number
  theme: ArchiveTheme
}) {
  if (theme.id !== 'building' || !cluster.body) return null

  return (
    <article className="frame-panel archive-cluster-marker" data-cluster-marker={cluster.id}>
      <p className="frame-panel__eyebrow">
        Building / {String(clusterIndex + 1).padStart(2, '0')}
      </p>
      <h3 className="archive-cluster-marker__title">{cluster.title}</h3>
      <p className="archive-cluster-marker__body">{cluster.body}</p>
    </article>
  )
}

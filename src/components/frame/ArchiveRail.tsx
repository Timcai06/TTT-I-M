import { archiveThemes, type ArchiveTheme } from '../../content'

export interface ActiveArchiveState {
  clusterIndex: number
}

export default function ArchiveRail({
  active,
  theme,
  themeIndex,
}: {
  active: ActiveArchiveState
  theme: ArchiveTheme
  themeIndex: number
}) {
  const cluster = theme.clusters[active.clusterIndex]
  const clusterNumber = active.clusterIndex >= 0 ? active.clusterIndex + 1 : 0

  return (
    <aside className="frame-horizontal__rail" aria-label={`${theme.title} progress`}>
      <span className="frame-horizontal__rail-kicker">Frame</span>
      <span className="frame-horizontal__rail-title">{theme.title}</span>
      <span className="frame-horizontal__rail-count">
        Part {String(themeIndex + 1).padStart(2, '0')} / {String(archiveThemes.length).padStart(2, '0')}
      </span>
      <span className="frame-horizontal__rail-subcount">
        Cluster {String(clusterNumber).padStart(2, '0')} / {String(theme.clusters.length).padStart(2, '0')}
      </span>
      {cluster && <span className="frame-horizontal__rail-current">{cluster.title}</span>}
    </aside>
  )
}

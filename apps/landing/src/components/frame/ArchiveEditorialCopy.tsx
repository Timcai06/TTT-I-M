import type { ArchiveTheme } from '../../content'
import type { ActiveArchiveState } from './ArchiveRail'

/**
 * Stable editorial copy for a pinned Frame theme. It is deliberately outside
 * the moving/captured image rail so typography stays crisp while photographs
 * bend at the viewport edges.
 */
export default function ArchiveEditorialCopy({
  active,
  theme,
}: {
  active: ActiveArchiveState
  theme: ArchiveTheme
}) {
  const cluster = theme.clusters[active.clusterIndex] ?? theme.clusters[0]

  if (!cluster) return null

  return (
    <header className="archive-editorial-copy" data-active-cluster={cluster.id}>
      <p className="archive-editorial-copy__eyebrow">
        <span>{theme.eyebrow}</span>
        <span>
          {String(active.clusterIndex + 1).padStart(2, '0')} / {String(theme.clusters.length).padStart(2, '0')}
        </span>
      </p>
      <h2 className="archive-editorial-copy__theme-title">{theme.title}</h2>
      <div className="archive-editorial-copy__cluster" key={cluster.id}>
        <span className="archive-editorial-copy__rule" aria-hidden="true" />
        <h3>{cluster.title}</h3>
        <p>{cluster.body ?? theme.body}</p>
      </div>
    </header>
  )
}

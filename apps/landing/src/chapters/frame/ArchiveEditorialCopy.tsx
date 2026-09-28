import type { ArchiveTheme } from '../../content'
import type { ActiveArchiveState } from './ArchiveRail'

/**
 * Stable editorial copy for a pinned Frame theme. Typography stays outside the
 * Bend capture for legibility, but its compact rail-facing treatment keeps it
 * visually attached to the active photograph group instead of reading as a
 * separate information panel.
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
    <header
      className={`archive-editorial-copy archive-editorial-copy--${theme.direction}`}
      data-active-cluster={cluster.id}
    >
      <p className="archive-editorial-copy__eyebrow">
        {theme.eyebrow}
      </p>
      <h2 className="archive-editorial-copy__theme-title">{theme.title}</h2>
      <div className="archive-editorial-copy__cluster" key={cluster.id}>
        <span className="archive-editorial-copy__rule" aria-hidden="true">
          <i />
        </span>
        <h3>{cluster.title}</h3>
        <p>{cluster.body ?? theme.body}</p>
      </div>
    </header>
  )
}

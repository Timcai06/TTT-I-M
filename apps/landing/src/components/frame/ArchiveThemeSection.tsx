import { Fragment, useRef } from 'react'
import type { ArchiveTheme } from '../../content'
import ArchiveClusterPanel from './ArchiveClusterPanel'
import { ArchiveClusterMarker, ArchiveThemeMarker } from './ArchiveMarkers'
import ArchiveRail from './ArchiveRail'
import useArchiveThemeScroll from './useArchiveThemeScroll'

export default function ArchiveThemeSection({ theme, themeIndex }: { theme: ArchiveTheme; themeIndex: number }) {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const active = useArchiveThemeScroll({ section, theme, track })
  const themeWord = theme.id.toUpperCase()

  return (
    <section
      aria-labelledby={`frame-${theme.id}-title`}
      className={`archive-theme-section archive-theme-section--${theme.id}`}
      data-archive-theme={theme.id}
      data-theme-word={themeWord}
      ref={section}
    >
      <div className="archive-theme-section__pin">
        <ArchiveRail active={active} theme={theme} themeIndex={themeIndex} />

        <div className="archive-theme-section__track" data-horizontal-track ref={track}>
          <ArchiveThemeMarker theme={theme} />
          {theme.clusters.map((cluster, clusterIndex) => (
            <Fragment key={cluster.id}>
              <ArchiveClusterMarker cluster={cluster} clusterIndex={clusterIndex} theme={theme} />
              <ArchiveClusterPanel
                cluster={cluster}
                eagerFirstImage={clusterIndex === 0}
                theme={theme}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

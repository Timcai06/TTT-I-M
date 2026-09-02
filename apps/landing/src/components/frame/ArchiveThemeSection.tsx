import { Fragment, useRef, useState } from 'react'
import type { ArchiveTheme } from '../../content'
import ArchiveClusterPanel from './ArchiveClusterPanel'
import { ArchiveClusterMarker, ArchiveThemeMarker } from './ArchiveMarkers'
import ArchiveRail from './ArchiveRail'
import GradualBlur from '../GradualBlur'
import useArchiveThemeScroll from './useArchiveThemeScroll'
import HorizontalBendSurface from './HorizontalBendSurface'
import type { HorizontalBendHandle } from '../../lib/canvas-ui/horizontalBend'
import ArchiveEditorialCopy from './ArchiveEditorialCopy'

/**
 * @description Frame 视觉档案的单个主题段落容器；桌面端固定文案并仅让图片轨进入 Bend，移动端恢复完整 marker 文档流
 * @dependencies 依赖 ArchiveTheme 内容模型、useArchiveThemeScroll 横向 pin 逻辑、ArchiveRail 进度显示和 frame.css 响应式布局
 * @performance 首个 cluster 的图片标记为 eagerFirstImage，后续 cluster 交给滚动预热和浏览器调度，避免同一帧拉高全部 fetchPriority
 * @caveats Canvas 首帧成功前保持 DOM 可见，失败或 context loss 后立即恢复；移动端由 CSS 文档流承接
 */
export default function ArchiveThemeSection({ theme, themeIndex }: { theme: ArchiveTheme; themeIndex: number }) {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const bendHandle = useRef<HorizontalBendHandle | null>(null)
  const [bendEnhanced, setBendEnhanced] = useState(false)
  const active = useArchiveThemeScroll({ section, theme, track, bendHandle })
  const themeWord = theme.id.toUpperCase()
  const visualClusters = theme.direction === 'left-to-right'
    ? theme.clusters.map((cluster, clusterIndex) => ({ cluster, clusterIndex })).reverse()
    : theme.clusters.map((cluster, clusterIndex) => ({ cluster, clusterIndex }))

  return (
    <section
      id={`frame-${theme.id}`}
      aria-label={`Frame archive: ${theme.title}`}
      className={`archive-theme-section archive-theme-section--${theme.id}${bendEnhanced ? ' is-bend-enhanced' : ''}`}
      data-archive-theme={theme.id}
      data-theme-word={themeWord}
      ref={section}
      tabIndex={-1}
    >
      <div className="archive-theme-section__pin" ref={pin}>
        <ArchiveRail active={active} theme={theme} themeIndex={themeIndex} />
        <ArchiveEditorialCopy active={active} theme={theme} />

        {/* Cinematic edge dissolve: the horizontal track's left/right margins fade
            into a soft blur so images don't hard-cut at the viewport edge. zIndex
            sits above the track content (z 1) but below the rail HUD (z 4) so the
            HUD stays sharp. Hidden on mobile (vertical flow) via .frame-edge-blur. */}
        <GradualBlur
          position="left"
          target="parent"
          width="clamp(48px, 7vw, 120px)"
          strength={2.4}
          divCount={6}
          curve="ease-out"
          zIndex={3}
          className="frame-edge-blur"
        />
        <GradualBlur
          position="right"
          target="parent"
          width="clamp(48px, 7vw, 120px)"
          strength={2.4}
          divCount={6}
          curve="ease-out"
          zIndex={3}
          className="frame-edge-blur"
        />

        <div className="archive-theme-section__track" data-horizontal-track ref={track}>
          <ArchiveThemeMarker theme={theme} />
          {visualClusters.map(({ cluster, clusterIndex }) => (
            <Fragment key={cluster.id}>
              <ArchiveClusterMarker cluster={cluster} clusterIndex={clusterIndex} theme={theme} />
              <ArchiveClusterPanel
                cluster={cluster}
                eagerFirstImage={clusterIndex === 0}
                narrativeIndex={clusterIndex}
                theme={theme}
              />
            </Fragment>
          ))}
        </div>
        <HorizontalBendSurface
          capture={track}
          viewport={pin}
          handleRef={bendHandle}
          onEnhancedChange={setBendEnhanced}
        />
      </div>
    </section>
  )
}

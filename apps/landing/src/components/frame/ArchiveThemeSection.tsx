import { Fragment, useRef } from 'react'
import type { ArchiveTheme } from '../../content'
import ArchiveClusterPanel from './ArchiveClusterPanel'
import { ArchiveClusterMarker, ArchiveThemeMarker } from './ArchiveMarkers'
import ArchiveRail from './ArchiveRail'
import GradualBlur from '../GradualBlur'
import useArchiveThemeScroll from './useArchiveThemeScroll'

/**
 * @description Frame 视觉档案的单个主题段落容器，负责把主题 marker、cluster marker 和图片 panel 串成一条横向叙事轨道
 * @dependencies 依赖 ArchiveTheme 内容模型、useArchiveThemeScroll 横向 pin 逻辑、ArchiveRail 进度显示和 frame.css 响应式布局
 * @performance 首个 cluster 的图片标记为 eagerFirstImage，后续 cluster 交给滚动预热和浏览器调度，避免同一帧拉高全部 fetchPriority
 * @caveats 组件只组织真实内容和 DOM 结构，不直接写滚动动画；移动端由 CSS 文档流承接，不能把桌面 pin 假设写死在组件里
 */
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

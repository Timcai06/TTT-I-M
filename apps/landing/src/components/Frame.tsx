import { lazy, Suspense } from 'react'
import { archiveIntro, archiveThemes } from '../content'
import ArchiveTextPanel from './frame/ArchiveTextPanel'
import ArchiveThemeSection from './frame/ArchiveThemeSection'
import AccordionGallery from './AccordionGallery'

const loadFrameParticleHandoff = () => import('./frame/FrameParticleHandoff')
const FrameParticleHandoff = lazy(loadFrameParticleHandoff)

// Frame itself is already a deferred chapter. Start fetching the heavier
// Particle Scroll adapter as soon as the chapter chunk evaluates so the final
// scenery movement never reaches an empty transition boundary.
void loadFrameParticleHandoff()

/**
 * @description Frame 章节入口 —— 将摄影存档组织为横向叙事流。
 *   页面结构固定为 intro 文本面板 → 可点击的摄影索引 → 三个主题段落（building / cuisine / scenery）→ 粒子交接。
 *   真正的横向滚动、集群布局和图片加载策略由 `ArchiveThemeSection` 及 frame 子组件负责。
 * @dependencies
 *   - `archiveIntro` / `archiveThemes` 内容仓储导出
 *   - `ArchiveTextPanel` 负责纯文本开场
 *   - `ArchiveThemeSection` 负责每个摄影主题的 pin / horizontal scroll / active cluster 状态
 * @performance / @caveats
 *   - 此组件刻意保持无 effect、无 ScrollTrigger；避免顶层 Frame 在每次重渲染时重建横滚状态。
 *   - `data-horizontal-section` 是滚动刷新/测试守卫识别横向章节的稳定标记，不应随视觉重构删除。
 * @steps
 *   step1: 渲染 intro text panel
 *   step2: 渲染三张可交互主题预览，作为 Building / Cuisine / Scenery 的章节入口
 *   step3: 按 archiveThemes 顺序渲染三个完整主题段落
 *   step4: 渲染 Particle Scroll outro，把摄影像素拆成信号后交还给 Stack 章节
 */
export default function Frame() {
  return (
    <section className="frame-horizontal" id="frame" data-horizontal-section>
      <ArchiveTextPanel layout="intro" panel={archiveIntro} />
      <div className="frame-accordion container" data-frame-accordion>
        <div className="frame-accordion__meta">
          <span>Archive index · 摄影索引</span>
          <p><i aria-hidden="true" /> Hover to preview · click to enter · 悬停预览，点击进入章节</p>
        </div>
        <AccordionGallery
          items={archiveThemes.map((theme) => {
            const image = theme.clusters[0]?.slots[0]?.image
            return {
              image: image?.src ?? '',
              alt: image?.title ?? theme.title,
              label: theme.title,
              link: `#frame-${theme.id}`,
            }
          })}
          defaultIndex={1}
          height={520}
          expandRatio={0.58}
          accentColor="#d8bd86"
          overlayColor="#080a0c"
          textColor="#f5f2ea"
          grayscale
          showLabels
          trigger="hover"
          particleNavigation
        />
      </div>
      {archiveThemes.map((theme, index) => (
        <ArchiveThemeSection key={theme.id} theme={theme} themeIndex={index} />
      ))}
      <Suspense fallback={<div className="frame-particle-handoff frame-particle-handoff--loading" aria-hidden="true" />}>
        <FrameParticleHandoff />
      </Suspense>
    </section>
  )
}

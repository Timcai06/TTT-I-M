import { getLenis } from './lenis'
import { restoredChapterTop } from './archiveReadingMemory'

interface ChapterScrollOptions {
  /** true 时不播放平滑滚动，转场落点和 reduced-motion 路径使用。 */
  immediate?: boolean
  /** true 时用 replaceState 更新 hash，不新增浏览器历史记录。 */
  updateHash?: boolean
  /** Restore the last in-session reading position when revisiting a chapter. */
  restore?: boolean
}

/**
 * A chapter may expose a reading landing inside its visual continuity frame.
 * Natural scrolling still sees the whole section, while explicit navigation
 * lands on the first readable viewport instead of replaying the handoff.
 */
export function getChapterScrollTarget(id: string): HTMLElement | null {
  const chapter = document.getElementById(id)
  if (!chapter) return null
  return chapter.querySelector<HTMLElement>('[data-chapter-reading-target]') ?? chapter
}

export function getChapterScrollViewportTop(id: string): number {
  return document.querySelector(`[data-archive-target="${CSS.escape(id)}"]`) ? 0 : 40
}

/**
 * @description 滚动到指定章节的统一入口。
 *   优先使用 Lenis 保持全站滚动手感一致；Lenis 不存在时回退到原生 `window.scrollTo`。
 * @dependencies `getLenis`、DOM `document.getElementById`
 * @performance / @caveats
 *   - 固定 `offset=-40` 用于避开顶部导航/视觉留白，所有章节跳转共享同一落点规则。
 *   - `updateHash` 使用 replaceState，不污染浏览器 back stack；章节导航不是页面级路由。
 *   - `immediate` 用于 ChapterTransition 快门落点，避免转场中再叠加平滑滚动动画。
 * @steps
 *   step1: 查找目标 DOM section，缺失时直接返回
 *   step2: 可选更新 URL hash
 *   step3: Lenis 可用则调用 lenis.scrollTo，否则用原生 scrollTo
 */
export function scrollToChapter(id: string, options: ChapterScrollOptions = {}) {
  const el = getChapterScrollTarget(id)
  if (!el) return

  // GSAP wraps pinned chapter triggers in a generated spacer. Once pinned, the
  // section itself can carry a transform/fixed position, so asking Lenis to
  // resolve that element produces a stale or viewport-relative destination.
  // The spacer remains in normal document flow and is the stable chapter start.
  const parent = el.parentElement
  const target = parent?.classList.contains('pin-spacer') ? parent : el
  // Spatial handoffs end at the exact reading viewport. A negative offset would
  // leave their final projected frame covering a deliberate chapter jump.
  const restoredTop = options.restore ? restoredChapterTop(id) : null
  const offset = restoredTop === null ? -getChapterScrollViewportTop(id) : 0
  const destination: HTMLElement | number = restoredTop ?? target

  if (options.updateHash) {
    const url = new URL(window.location.href)
    url.hash = id
    window.history.replaceState(window.history.state, '', url)
  }

  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(destination, {
      offset,
      duration: options.immediate ? 0 : 1.0,
      force: options.immediate,
      immediate: options.immediate,
    })
  } else {
    const top = typeof destination === 'number'
      ? destination
      : destination.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({
      top,
      behavior: options.immediate ? 'auto' : 'smooth',
    })
  }
}

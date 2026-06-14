import { useEffect, useMemo, useRef, useState } from 'react'
import { navChapters, progressChapters } from '../chapters/registry'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  dispatchChapterArrived,
  onChapterTransitionRequest,
  type ChapterTransitionRequest,
} from '../lib/chapterTransition'
import { scrollToChapter } from '../lib/chapterScroll'
import { getChapterTheme } from '../lib/chapterThemeTokens'
import { getStage, setStage } from '../lib/stage'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { createTransitionTimeline } from '../lib/timelines/transitionTimeline'
import { prefersReducedMotion } from '../lib/motion'
import { usePretextTextInteraction } from '../lib/pretextIntroText'

const transitionChapters = navChapters.map((chapter) => {
  const progress = progressChapters.find((entry) => entry.id === chapter.id)?.progress
  return {
    id: chapter.id,
    index: progress?.index ?? chapter.nav.label.slice(0, 2),
    label: chapter.nav.label.replace(/^\d+\s*·\s*/, ''),
    name: progress?.name ?? chapter.nav.label,
  }
})

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

function splitText(text: string, className: string) {
  return text.split('').map((char, index) => {
    const displayChar = char === ' ' ? '\u00a0' : char
    return (
      <span className={className} data-final={char} key={`${char}-${index}`}>
        {displayChar}
      </span>
    )
  })
}

/**
 * @description 章节过渡动画层 —— 点击导航时的全屏「液体幕布」过渡效果。
 *   一块带波浪前缘的双层填充带（奶白前导边 + 深红主体）沿跳转方向洗过视口，
 *   满屏定格时显示目标章节的 SEC 编号和名称（字符绑定 pretext 漂浮），
 *   殿后边再沿同一方向抽走。方向感知：向下跳章时幕布自下而上（与内容运动同向）。
 *
 *   流程：导航点击 → `setStage('transitioning')` → 波浪前缘漫过 → 显示目标章节名
 *   → 满屏定格 scrollToChapter (immediate) → ScrollTrigger.refresh → dispatchChapterArrived
 *   → 殿后边抽离 → `setStage('live')`。
 *
 *   如果过渡中又收到新请求，排队到 `queuedRef`，当前过渡完成后立即执行。
 *
 * @dependencies
 *   - GSAP timeline (createTransitionTimeline)
 *   - `stage` 状态机 (transitioning ↔ live)
 *   - `chapterTransition` 事件总线 (onChapterTransitionRequest)
 *   - `scrollToChapter` (final jump, immediate mode)
 *   - `usePretextTextInteraction` (目标名文字漂浮)
 *   - `prefersReducedMotion` (降动时跳过过渡，直接 immediate scroll)
 *
 * @performance / @caveats
 *   - 降动 (reduced-motion) 下完全跳过幕布动画，直接 immediate scroll — 避免触发任何基于 transform 的着色器
 *   - `setPretextReady` 由 transitionTimeline 的 onRevealTarget 回调触发 ——
 *     保证 pretext glyph 在快门打开/目标名可见时才初始化，不会在隐藏时计算 DOM 尺寸
 *   - 过渡过程中 Lenis 被 stage→transitioning 冻结 (`lenis.stop()`)，过渡完成后恢复 (`lenis.start()`)
 *
 * @steps
 *   step1: onChapterTransitionRequest 监听事件 → 若为 transitioning 则排队
 *   step2: setStage('transitioning') → setActive(true) → 按目标位置算方向 → 波浪前缘入场
 *   step3: onRevealTarget → setPretextReady → 激活 glyph 漂浮交互
 *   step4: onLand（满屏定格）→ scrollToChapter + ScrollTrigger.refresh + dispatchChapterArrived
 *   step5: onComplete → setStage('live') → 如果有排队请求则递归执行
 */
export default function ChapterTransition() {
  const rootRef = useRef<HTMLDivElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const queuedRef = useRef<ChapterTransitionRequest | null>(null)
  const [active, setActive] = useState(false)
  const [pretextReady, setPretextReady] = useState(false)
  const [pretextRefreshKey, setPretextRefreshKey] = useState(0)
  const [targetId, setTargetId] = useState<string>('hero')

  const target = useMemo(
    () => transitionChapters.find((chapter) => chapter.id === targetId) ?? transitionChapters[0],
    [targetId]
  )

  usePretextTextInteraction(targetNameRef, {
    enabled: active && pretextReady,
    glyphSelector: '.chapter-transition__target-glyph',
    refreshKey: pretextRefreshKey,
    strength: 0.5,
    text: target?.name ?? '',
  })

  useEffect(() => {
    const runTransition = async (request: ChapterTransitionRequest) => {
      if (getStage() === 'transitioning') {
        queuedRef.current = request
        return
      }

      if (prefersReducedMotion()) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        return
      }

      setStage('transitioning')
      setPretextReady(false)
      setTargetId(request.id)
      setActive(true)
      await nextFrame()

      const root = rootRef.current
      if (!root) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        setStage('live')
        return
      }

      // Direction-aware wash: jumping DOWN the page means content sweeps up,
      // so the wave travels up with it (the reference-video direction); jumping
      // up mirrors it. Fallback 'up' when the target isn't mounted yet.
      const targetEl = document.getElementById(request.id)
      const direction = targetEl && targetEl.getBoundingClientRect().top < 0 ? 'down' : 'up'

      // The cover takes the TARGET chapter's theme color — the wave's color
      // announces the destination before the page gets there.
      root.style.setProperty('--transition-cover', getChapterTheme(request.id).cover)

      await new Promise<void>((resolve) => {
        createTransitionTimeline(root, direction, {
          onRevealTarget: () => {
            setPretextReady(true)
            setPretextRefreshKey((key) => key + 1)
          },
          onLand: () => {
            setPretextReady(false)
            scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
            window.requestAnimationFrame(() => {
              requestScrollRefresh(true)
              ScrollTrigger.update()
              dispatchChapterArrived(request.id)
            })
          },
          onComplete: resolve,
        })
      })

      gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
      setActive(false)
      setPretextReady(false)
      setStage('live')

      const queued = queuedRef.current
      queuedRef.current = null
      if (queued) void runTransition(queued)
    }

    return onChapterTransitionRequest((request) => {
      void runTransition(request)
    })
  }, [])

  return (
    <div
      className={`chapter-transition${active ? ' is-active' : ''}`}
      ref={rootRef}
      aria-hidden={!active}
    >
      <svg className="chapter-transition__wave" aria-hidden="true" preserveAspectRatio="none">
        <path className="chapter-transition__wave-lead" />
        <path className="chapter-transition__wave-main" />
      </svg>
      <div className="chapter-transition__grain" aria-hidden="true" />

      <div className="chapter-transition__content">
        <div className="chapter-transition__target">
          <span className="chapter-transition__target-index">SEC {target?.index}</span>
          <strong>
            <span className="chapter-transition__target-name" ref={targetNameRef}>
              {splitText(target?.name ?? '', 'chapter-transition__target-glyph')}
            </span>
          </strong>
        </div>
      </div>
    </div>
  )
}

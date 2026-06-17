import { gsap } from '../gsap'
import { waveBandPath, type WaveDirection } from '../waveFrontPath'

const TARGET_REVEAL_AT = 0.7
const TARGET_EXIT_AT = 1.5

export const CHAPTER_TRANSITION_TARGET_GLITCH_SECONDS = TARGET_EXIT_AT - TARGET_REVEAL_AT

/**
 * @description 章节转场 timeline 在关键帧上回调 React/滚动状态的桥接函数集合
 */
export interface TransitionTimelineCallbacks {
  /** 目标章节名已经可见，可以启用 Pretext glyph 测量和指针扰动 */
  onRevealTarget: () => void
  /** 幕布满屏的定格时刻，可以执行立即跳转、刷新 ScrollTrigger、派发 arrived 事件 */
  onLand: () => void
  /** 幕布抽离且视觉层退场完成，可以把 stage 恢复为 live */
  onComplete: () => void
}

/**
 * @description 「液体幕布」章节转场 —— 一块带波浪前缘的双层填充带洗过视口
 *   （奶白前导边 + 深红主体），满屏定格时显示目标章节名并完成真实跳转，
 *   然后幕布殿后边沿同一方向继续抽走（一股浪洗过去，不回头）。
 *   几何全部来自 lib/waveFrontPath 纯函数；timeline 只 tween 标量
 *   （front/back 行程 + 波相位），每帧重建两条 path d。
 * @dependencies GSAP timeline、ChapterTransition 的 SVG/grain/标题 DOM、waveBandPath
 * @performance 每帧成本 = 2 条路径 × 27 个采样点的字符串拼接 + 2 次 setAttribute，
 *   无 layout、无全屏 filter（旧快门皮的 blur aura 已随重构移除）。
 * @caveats 方向语义：direction='up' 表示幕布自下而上洗过（用于向下跳章 ——
 *   覆盖运动与内容运动同向）；调用方负责 reduced-motion 分支和 stage 状态切换
 * @steps
 * step1: 0 – 1.1s 前缘漫过视口（波幅中段最大、贴边收平 → 满屏为解析保证）
 * step2: 0.65 – 1.0s grain/编号/章节名在主体上浮现
 * step3: 1.1 – 1.25s 色差闪；1.2s onLand 在满屏定格中执行真实跳转
 * step4: 1.6 – 2.4s 殿后边同向抽离，文字/grain 先行淡出
 */
export function createTransitionTimeline(
  root: HTMLElement,
  direction: WaveDirection,
  cb: TransitionTimelineCallbacks,
): gsap.core.Timeline {
  const svg = root.querySelector<SVGSVGElement>('.chapter-transition__wave')
  const leadPath = root.querySelector<SVGPathElement>('.chapter-transition__wave-lead')
  const mainPath = root.querySelector<SVGPathElement>('.chapter-transition__wave-main')
  const targetGlitch = root.querySelector<HTMLElement>('.chapter-transition__target-glitch')
  const targetName = root.querySelector<HTMLElement>('.chapter-transition__target-name')
  const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
  const grain = root.querySelector<HTMLElement>('.chapter-transition__grain')
  const index = root.querySelector<HTMLElement>('.chapter-transition__target-index')
  const targetExitNodes = [index, targetGlitch, ...targetChars].filter(
    (node): node is HTMLElement => Boolean(node),
  )

  const width = root.clientWidth || window.innerWidth
  const height = root.clientHeight || window.innerHeight
  svg?.setAttribute('viewBox', `0 0 ${width} ${height}`)

  // The tweened scalars. phase keeps advancing the whole ride so the crests
  // roll sideways while the band travels — that rolling is the liquid feel.
  const wave = { front: 0, back: 0, phase: Math.random() * Math.PI * 2 }

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

  const render = () => {
    if (!leadPath || !mainPath) return
    // The cream lead edge runs ~5% ahead while covering and ~5% behind while
    // leaving, so a warm liquid rim sweeps both page edges. Envelope-scaled:
    // the rim converges with the main band exactly when both park off-screen.
    const leadFront = clamp01(wave.front + 0.05 * Math.sin(Math.PI * clamp01(wave.front)))
    const leadBack = Math.max(0, wave.back - 0.05 * Math.sin(Math.PI * clamp01(wave.back)))
    leadPath.setAttribute('d', waveBandPath({
      width, height, direction,
      frontProgress: leadFront,
      backProgress: leadBack,
      phase: wave.phase + 0.9,
      curl: -1,
    }))
    mainPath.setAttribute('d', waveBandPath({
      width, height, direction,
      frontProgress: wave.front,
      backProgress: wave.back,
      phase: wave.phase,
      curl: 1,
    }))
  }

  gsap.set(root, { autoAlpha: 1, pointerEvents: 'auto' })
  gsap.set(grain, { opacity: 0 })
  gsap.set(targetGlitch, { opacity: 0 })
  gsap.set(targetChars, {
    opacity: 0,
    filter: 'blur(8px)',
    scale: 1.05,
    clipPath: 'inset(-20% 100% -20% -20%)',
  })
  gsap.set(targetName, { textShadow: 'none', x: 0 })
  gsap.set(index, { opacity: 0, y: 10 })
  render()

  const tl = gsap.timeline({ onComplete: cb.onComplete })

  // 1. 0 - 1.1s: the wavy front washes across the viewport. Only overlay
  // paths are animated; the page keeps stable layout for ScrollTrigger.
  tl.to(wave, { front: 1, duration: 1.1, ease: 'power3.inOut', onUpdate: render }, 0)
  // The crests roll for the full ride (linear — easing lives in front/back).
  tl.to(wave, { phase: `+=${Math.PI * 2.2}`, duration: 2.4, ease: 'none', onUpdate: render }, 0)

  // 2. 0.65 - 1.0s: grain, index and the target name surface on the band.
  tl.to(grain, { opacity: 0.85, duration: 0.18 }, 0.65)
  tl.to(index, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }, TARGET_REVEAL_AT)
  tl.to(targetGlitch, { opacity: 1, duration: 0.16, ease: 'power2.out' }, TARGET_REVEAL_AT)
  tl.to(targetChars, {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    clipPath: 'inset(-20% -20% -20% -20%)',
    duration: 0.34,
    stagger: 0.022,
    ease: 'power3.out',
  }, TARGET_REVEAL_AT)
    .call(cb.onRevealTarget, undefined, 0.8)

  // 3. 1.1s - 1.25s: chromatic aberration flash as the cover completes.
  tl.to(targetName, {
    textShadow: '-5px 0px 0px rgba(255, 0, 0, 0.8), 5px 0px 0px rgba(0, 255, 255, 0.8)',
    x: -2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 1.1)
  tl.to(targetName, {
    textShadow: '3px 0px 0px rgba(255, 0, 0, 0.5), -3px 0px 0px rgba(0, 255, 255, 0.5)',
    x: 2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 1.15)
  tl.to(targetName, {
    textShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
    x: 0,
    duration: 0.1,
    ease: 'power2.out',
  }, 1.2)

  // 4. 1.2s: the landing moment — inside the full-cover hold (front parked
  // past one edge at 1.1s, back parked past the other until 1.6s).
  tl.call(cb.onLand, undefined, 1.2)

  // 5. 1.5s+: text and grain recede, then the trailing edge pulls away in the
  // SAME direction — one wave washing through, never doubling back.
  tl.to(targetExitNodes, { opacity: 0, duration: 0.22, ease: 'power2.in' }, TARGET_EXIT_AT)
  tl.to(grain, { opacity: 0, duration: 0.32, ease: 'power2.inOut' }, TARGET_EXIT_AT)
  tl.to(wave, { back: 1, duration: 0.8, ease: 'power2.inOut', onUpdate: render }, 1.6)

  return tl
}

import { gsap } from '../gsap'

/**
 * @description 章节转场 timeline 在关键帧上回调 React/滚动状态的桥接函数集合
 */
export interface TransitionTimelineCallbacks {
  /** 目标章节名已经可见，可以启用 Pretext glyph 测量和指针扰动 */
  onRevealTarget: () => void
  /** 快门闭合到黑场，可以执行立即跳转、刷新 ScrollTrigger、派发 arrived 事件 */
  onLand: () => void
  /** 快门打开且视觉层退场完成，可以把 stage 恢复为 live */
  onComplete: () => void
}

/**
 * @description 创建章节点击后的电影感快门转场 timeline，保持页面布局稳定，只动画 overlay 元素
 * @dependencies GSAP timeline、ChapterTransition DOM 结构和 TransitionTimelineCallbacks
 * @performance 只动画 transform、opacity、filter、clipPath 和 textShadow；不移动页面主体，避免破坏 ScrollTrigger 测量
 * @caveats `_rail` 参数保留给旧签名兼容，当前不使用；调用方负责 reduced-motion 分支和 stage 状态切换
 * @steps
 * step1: 初始化快门、grain、aura、seam 和目标字符状态
 * step2: 0–0.35s 快门闭合覆盖当前章节
 * step3: 0.18–0.55s 展示目标章节名、编号、光晕和噪点
 * step4: 0.5s 触发 onLand，在黑场中执行真实章节跳转
 * step5: 0.65–1.0s 快门打开并淡出转场视觉层
 */
export function createTransitionTimeline(
  root: HTMLElement,
  _rail: HTMLElement | null,
  cb: TransitionTimelineCallbacks,
): gsap.core.Timeline {
  const topShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--top')
  const bottomShutter = root.querySelector<HTMLElement>('.chapter-transition__shutter--bottom')
  const targetName = root.querySelector<HTMLElement>('.chapter-transition__target-name')
  const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
  const grain = root.querySelector<HTMLElement>('.chapter-transition__grain')
  const index = root.querySelector<HTMLElement>('.chapter-transition__target-index')
  const aura = root.querySelector<HTMLElement>('.chapter-transition__aura')
  const seam = root.querySelector<HTMLElement>('.chapter-transition__seam')

  gsap.set(root, { autoAlpha: 1, pointerEvents: 'auto' })
  gsap.set(topShutter, { yPercent: -100 })
  gsap.set(bottomShutter, { yPercent: 100 })
  gsap.set(grain, { opacity: 0 })
  gsap.set(aura, { opacity: 0, scale: 0.96, filter: 'blur(16px) saturate(1.04)' })
  gsap.set(seam, { opacity: 0, scaleX: 0.18 })
  gsap.set(targetChars, {
    opacity: 0,
    filter: 'blur(8px)',
    scale: 1.05,
    clipPath: 'inset(-20% 100% -20% -20%)',
  })
  gsap.set(targetName, { textShadow: 'none', x: 0 })
  gsap.set(index, { opacity: 0, y: 10 })

  const tl = gsap.timeline({ onComplete: cb.onComplete })

  // 1. 0 - 0.35s: Shutters cover the current chapter. The page itself is not
  // transformed here; ScrollTrigger and image visibility depend on stable layout.
  tl.to([topShutter, bottomShutter], {
    yPercent: 0,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0)

  // 2. 0.18 - 0.55s: Grain, aura, and central target flash in.
  tl.to(aura, { opacity: 1, scale: 1, filter: 'blur(12px) saturate(1.18)', duration: 0.42, ease: 'power2.out' }, 0.12)
  tl.to(seam, { opacity: 1, scaleX: 1, duration: 0.34, ease: 'expo.out' }, 0.16)
  tl.to(grain, { opacity: 0.85, duration: 0.15 }, 0.2)
  tl.to(index, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.2)
  tl.to(targetChars, {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    clipPath: 'inset(-20% -20% -20% -20%)',
    duration: 0.3,
    stagger: 0.02,
    ease: 'power3.out',
  }, 0.2)
    .call(cb.onRevealTarget, undefined, 0.25)

  // 3. 0.45s - 0.65s: Chromatic Aberration Flash right before/during the land
  tl.to(targetName, {
    textShadow: '-5px 0px 0px rgba(255, 0, 0, 0.8), 5px 0px 0px rgba(0, 255, 255, 0.8)',
    x: -2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 0.45)
  tl.to(targetName, {
    textShadow: '3px 0px 0px rgba(255, 0, 0, 0.5), -3px 0px 0px rgba(0, 255, 255, 0.5)',
    x: 2,
    duration: 0.05,
    ease: 'power4.inOut',
  }, 0.5)
  tl.to(targetName, {
    textShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
    x: 0,
    duration: 0.1,
    ease: 'power2.out',
  }, 0.55)

  // 4. 0.50s: The Landing Moment (Black screen hold)
  tl.call(cb.onLand, undefined, 0.5)

  // 5. 0.65 - 1.00s: Shutters snap open & background pulls focus back
  tl.to(topShutter, {
    yPercent: -100,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0.65)
  tl.to(bottomShutter, {
    yPercent: 100,
    duration: 0.35,
    ease: 'expo.inOut',
  }, 0.65)

  // 6. Fade out text and grain as shutters open
  tl.to([index, ...targetChars], {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
  }, 0.65)
  tl.to([grain, aura], {
    opacity: 0,
    duration: 0.35,
    ease: 'power2.inOut',
  }, 0.65)
  tl.to(seam, { opacity: 0, scaleX: 0.34, duration: 0.24, ease: 'power2.inOut' }, 0.68)

  return tl
}

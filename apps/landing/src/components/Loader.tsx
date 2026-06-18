import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import DitherBackground from './DitherBackground'
import { dispatchIntroExit } from '../lib/intro'
import { setStage } from '../lib/stage'
import { useIntroPretextInteraction } from '../lib/pretextIntroText'
import { useWholeSitePreload } from '../lib/resources/preloadController'
import {
  displayedProgressValue,
  introCharGroup,
  introRiseStagger,
  stepDisplayedProgress,
} from '../lib/loaderTiming'

const BAFFLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░█'

function randomBaffleChar() {
  return BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)] ?? ''
}

/**
 * @description Loader 全屏加载页 —— 站点入口动画的 start-to-end 编排。
 *   阶段 1 (intro): 标题 "Tim Cai." 字符从遮罩边缘升起 + Baffle 乱码效果 (42ms 间隔 × 15 帧) → 进度条动画
 *   阶段 2 (hand-off): 一旦 introReady (字符落地) 且 preload.criticalReady (runtime 核心就绪；deferred 图片继续后台拉)，
 *     标题向上浮出遮罩 → 计数器/进度条淡出 → 整个面板向上 wipe out，露出 Hero
 *   阶段 3 (complete): `done` 状态置 true，组件返回 null，彻底从 DOM 卸载
 *
 *   生命周期通过 `stage` 状态机协调：标题落地 → `setStage('intro')`；面板退出 → `dispatchIntroExit()` → `stage→live`
 *
 * @dependencies
 *   - GSAP (timeline + gsap.context)
 *   - `stage` 状态机 (setStage → dispatchIntroExit)
 *   - `useWholeSitePreload` (资源预加载进度反馈)
 *   - `useIntroPretextInteraction` (字符指针漂浮，仅在 introReady 且未退场时激活)
 *
 * @performance / @caveats
 *   - Baffle 乱码使用 `setInterval(42ms)` 而非 requestAnimationFrame —— 42ms ≈ 24fps，
 *     视觉上刚好产生 "字符抖动" 效果，不需要 60fps 精度
 *   - 进度条使用 rAF 驱动的 displayedProgress 缓动 (damp 0.075→0.18)，
 *     避免 preload 进度跳变时进度条视觉抖动
 *   - 退出时 panel 的 yPercent: -100 动画使用 expo.inOut 缓动 (1.15s)，制造 "卷帘门" 升起感
 *
 * @steps
 *   step1: Effect 1 — 字符初始化 (opacity=0, yPercent=120) + Baffle 乱码定时器
 *   step2: Effect 1 — 字符缓慢升起到基线 (1.25s, stagger 0.075s)
 *   step3: Effect 1 — timeline onComplete → setStage('intro') → 激活 pretext 交互
 *   step4: Effect 2 — 进度条 rAF loop: displayedProgress 缓动追踪 preload progress
 *   step5: Effect 3 — introReady && preload.criticalReady → 退出 timeline: 标题上浮 + bar/counter 淡出 + panel 上滑
 *   step6: Effect 3 — panel yPercent: -100 → dispatchIntroExit → 若干 ms 后 setDone(true)
 */
export default function Loader() {
  const panelRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const exitStarted = useRef(false)
  const preloadRef = useRef<ReturnType<typeof useWholeSitePreload> | null>(null)
  const [done, setDone] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const preload = useWholeSitePreload()
  useIntroPretextInteraction(textRef, introReady && !done && !exiting)
  // The exit gate is the FULL manifest (`ready`), not just the critical tier:
  // the loader is a true "everything loaded" screen — when the bar hits 100%
  // every chunk AND every curated image is fetched/decoded, so scrolling into
  // any section (Frame, Work/LaserFlow) is pop-in- and hitch-free. Each task
  // still races a 12s timeout (preloadController) so a dead resource can't
  // strand the intro.
  const stageText = preload.ready ? 'ready' : preload.label

  useEffect(() => {
    preloadRef.current = preload
  }, [preload])

  useEffect(() => {
    if (!panelRef.current) return
    const intervals: number[] = []

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro__char')
      if (!charEls?.length) return

      const tl = gsap.timeline()

      /* ── init ── */
      gsap.set(charEls, { opacity: 0, yPercent: 120 })
      gsap.set('.intro__scan-line', { opacity: 0, scaleX: 0 })

      /* ── baffle scramble (kept) ── */
      charEls.forEach((el) => {
        const glyph = el.querySelector<HTMLElement>('.intro__char-glyph') ?? el
        const final = glyph.getAttribute('data-final') || glyph.textContent || ''
        let frame = 0
        const interval = window.setInterval(() => {
          if (frame < 11) {
            glyph.textContent = randomBaffleChar()
          } else if (frame < 15) {
            glyph.textContent = frame % 2 === 0
              ? randomBaffleChar()
              : final
          } else {
            glyph.textContent = final
            clearInterval(interval)
          }
          frame++
        }, 42)
        intervals.push(interval)
      })

      /* ── chars rise from behind the mask edge, slow expo ── */
      tl.to(charEls, {
        opacity: 1,
        yPercent: 0,
        duration: 1.25,
        stagger: (index, target) => {
          const group = Number((target as HTMLElement).dataset.introGroup ?? index)
          return introRiseStagger(group, index)
        },
        ease: 'expo.out',
      }, 0.1)

      tl.to('.intro__scan-line', {
        opacity: 0.9,
        scaleX: 1,
        duration: 0.42,
        ease: 'power3.out',
      }, '>-0.28')

      tl.to('.intro__scan-line', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      }, '>-0.08')

      tl.call(() => {
        setStage('intro')
        setIntroReady(true)
      })
    }, panelRef)

    return () => {
      intervals.forEach((interval) => window.clearInterval(interval))
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let displayedProgress = 0

    const renderProgress = () => {
      const current = preloadRef.current
      if (!current) return

      // The bar tracks the FULL manifest: 100% = every chunk and every curated
      // image fetched/decoded, the moment the panel may exit. This is real
      // resource progress across all ~50+ tasks, not a critical-only subset.
      const actualProgress = current.total > 0 ? current.completed / current.total : 0
      const target = current.ready ? 1 : actualProgress

      displayedProgress = stepDisplayedProgress(displayedProgress, target, current.ready)

      const displayValue = displayedProgressValue(displayedProgress, current.ready)

      if (countRef.current) countRef.current.textContent = String(displayValue).padStart(2, '0')
      if (barRef.current) barRef.current.style.transform = `scaleX(${displayedProgress.toFixed(4)})`

      if (!current.ready || displayedProgress < 0.999) {
        frame = window.requestAnimationFrame(renderProgress)
      }
    }

    frame = window.requestAnimationFrame(renderProgress)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!introReady || !preload.ready || exitStarted.current || !panelRef.current) return
    exitStarted.current = true
    setExiting(true)

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro__char')
      if (!charEls?.length) return
      const titleChars = textRef.current?.querySelectorAll<HTMLElement>('.intro__char:not(.intro__dot)')
      const dot = textRef.current?.querySelector<HTMLElement>('.intro__dot')

      const tl = gsap.timeline()

      /* ── hold a beat ── */
      tl.to({}, { duration: 0.35 })

      /* ── detail (counter + hairline) recede ── */
      tl.to('.intro__counter, .intro__bar-track, .intro__status', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      }, '>-0.1')

      /* ── name lifts away behind the mask ── */
      tl.to(titleChars ?? charEls, {
        yPercent: -120,
        duration: 0.8,
        stagger: 0.04,
        ease: 'power3.in',
      }, '<')

      if (dot) {
        // GSAP color tweens need concrete values — resolve the design tokens
        // (@timcai/tokens) at exit time instead of hardcoding the accent.
        const rootStyles = getComputedStyle(document.documentElement)
        const popColor = rootStyles.getPropertyValue('--accent-pop').trim() || '#ff4a33'
        const popGlow = rootStyles.getPropertyValue('--accent-pop-glow').trim() || 'rgba(255, 74, 51, 0.72)'
        tl.to(dot, {
          color: popColor,
          textShadow: `0 0 28px ${popGlow}`,
          yPercent: -70,
          duration: 0.52,
          ease: 'power2.in',
        }, '<0.18')

        tl.to(dot, {
          opacity: 0,
          duration: 0.24,
          ease: 'power2.in',
        }, '>-0.08')
      }

      /* ── hand off to hero just before the panel clears ── */
      tl.call(dispatchIntroExit, [], '>-0.15')

      /* ── single panel wipes up, revealing the hero already composed beneath ── */
      tl.to(panelRef.current, {
        yPercent: -100,
        duration: 1.15,
        ease: 'expo.inOut',
      }, '>-0.05')

      tl.call(() => setDone(true))
    }, panelRef)

    return () => ctx.revert()
  }, [introReady, preload.ready])

  if (done) return null

  const text = 'Tim Cai.'
  const charClassName = (ch: string) => {
    if (ch.toLowerCase() === 'i') return 'intro__char intro__char--narrow'
    if (ch.toLowerCase() === 'm') return 'intro__char intro__char--wide'
    return 'intro__char'
  }

  const chars = text.split('').map((ch, i) => {
    if (ch === ' ') {
      return (
        <span key={i} className="intro__char intro__space" data-intro-group={introCharGroup(i)}>
          <span className="intro__char-glyph" data-final=" ">&nbsp;</span>
        </span>
      )
    }
    if (ch === '.') {
      return (
        <span key={i} className="intro__char intro__dot" data-intro-group={introCharGroup(i)}>
          <span className="intro__char-glyph" data-final=".">.</span>
        </span>
      )
    }
    return (
      <span key={i} className={charClassName(ch)} data-intro-group={introCharGroup(i)}>
        <span className="intro__char-glyph" data-final={ch}>{ch}</span>
      </span>
    )
  })

  return (
    <div className="intro" ref={panelRef}>
      <DitherBackground />
      <div className="intro__meta">// Portfolio · 2026</div>

      <div className={`intro__text-wrap${introReady && !exiting ? ' intro__text-wrap--interactive' : ''}`}>
        <div className="intro__text" ref={textRef}>{chars}</div>
      </div>
      <div className="intro__scan-line" aria-hidden="true" />

      <div className="intro__status" aria-hidden="true">
        <span>Runtime gate</span>
        <span>Critical resources</span>
      </div>
      <div className="intro__counter">
        <span ref={countRef}>00</span>
        <span className="intro__counter-sep">/ 100</span>
        <span className="intro__stage">{stageText}</span>
      </div>

      <div className="intro__bar-track">
        <span className="intro__bar" ref={barRef} />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { createHeroParallax } from '../lib/timelines/heroParallax'
import { onIntroExit } from '../lib/intro'
import { usePretextTextInteraction } from '../lib/pretextIntroText'
import { onChapterArrived } from '../lib/chapterTransition'
import ParticlePortrait from './ParticlePortrait'

/**
 * @description Hero 章节 —— 首页视口顶部的身份视觉锚点。同时处理两大动画轨道：
 *   轨道 1 (入场): Loader 退场后触发 GSAP timeline，标题逐字裂分升起、kicker/meta 渐现；
 *   轨道 2 (滚动): 随页面滚动将 Canvas 粒子层、幽灵照片、扫描线和内容层同步 scrubbing 淡出/位移。
 *
 *   此外管理 Pretext 交互（标题文字随指针漂浮）的生命周期：仅在 intro 退出 + 页面回到顶部时激活，
 *   滚动超过 6px 即关闭，避免与滚动驱动的 parallax 冲突。
 *
 * @dependencies
 *   - GSAP + ScrollTrigger（动画引擎 / 滚动绑定）
 *   - React Three Fiber (ParticlePortrait, 条件渲染)
 *   - pretext 库 (文字交互, `usePretextTextInteraction`)
 *   - `stage` 状态机 (intro→live 加载生命周期)
 *   - `chapterTransition` (监听 chapter-arrived 事件重置状态)
 *   - `heroParallax` timeline (标题裂分 parallax 效果)
 *
 * @performance / @caveats
 *   - ParticlePortrait 受 `prefers-reduced-motion` 约束：OS 降动设置下不渲染 Canvas，
 *     依靠 CSS 幽灵照片 (`hero__ghost`) 保持视觉完整性
 *   - 滚动 scrubbing 仅操作 transform/opacity (GPU 合成)，不动 filter/blur (强制 repaint)；
 *     CSS 的 `blur` 静态过滤层由 `.hero__canvas` 伪元素承载，滚动时不再重绘
 *   - 两个 useEffect 分别管理入场 (effect 1) 和滚动态 pretext 开关 (effect 2)，
 *     防止 State 更新相互触发导致重渲染循环
 *   - `pretextEnableTimer` (180ms delay) 防止滚动到顶时立即激活交互，给浏览器布局 settle 留出间隙
 *
 * @steps
 *   step1: 初始化所有可视 sub-element 的隐藏状态 (yPercent=110, opacity=0)
 *   step2: 监听 intro→exit (onIntroExit) → 触发 paused timeline.play()
 *   step3: 监听 chapter-arrived (回跳 hero) → 重置状态，180ms 后激活 pretext
 *   step4: 绑定 5 个 scroll-scrub tweens: canvas, ghost, scan, content, title parallax
 *   step5: 滚动事件 rAF 回调中判断 scrollY>6 决定 pretext 开关
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const pretextEnableTimer = useRef<number | undefined>(undefined)
  /** 标题入场完成计数器：timeline onComplete 或 chapter-arrived 各 ＋1。唤醒 pretextRefreshKey。 */
  const heroTitleReady = useRef(0)
  const [introExited, setIntroExited] = useState(false)
  /** 是否激活 pretext 文字交互（仅在 intro 退出 + 页面在顶部时）。 */
  const [heroPretextEnabled, setHeroPretextEnabled] = useState(false)
  /** pretext 刷新键 —— 变化时重新计算 glyph 布局（适配 resize / 重新激活）。 */
  const [pretextRefreshKey, setPretextRefreshKey] = useState(0)
  /** 仅在非降动模式下展示粒子层（Canvas 构建成本高，降动用户无需承担）。 */
  const [showParticleLayer] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  /**
   * Effect 1: 入场动画 + 滚动 scrubbing 动画。
   * 在 gsap.context 内运行，组件卸载时 ctx.revert() 一次性清理所有 ScrollTrigger。
   */
  useEffect(() => {
    if (!root.current) return
    let cancelIntroExit = () => {}
    let cancelHeroArrived = () => {}
    const ctx = gsap.context(() => {
      // ── 初始化：将所有 split-line sub-element 推到视口下方 ──
      gsap.set('.hero__split .split-line__inner', { yPercent: 110, skewY: 6 })
      gsap.set('.hero__meta-block', { opacity: 0, y: 12 })
      gsap.set('.hero__subline > *', { opacity: 0, y: 8 })
      gsap.set('.hero__kicker', { opacity: 0, y: 10 })

      // 暂停 timeline —— 等待 intro exit 信号
      const tl = gsap.timeline({ paused: true })
      tl.eventCallback('onComplete', () => {
        heroTitleReady.current += 1
        setPretextRefreshKey((key) => key + 1)
      })

      // step2: intro 退出 → 播放入场 timeline
      cancelIntroExit = onIntroExit(() => {
        setIntroExited(true)
        if (tl.paused()) void tl.play()
      })

      // step3: 用户通过导航回跳到 hero → 立即重置所有动画状态到终点
      cancelHeroArrived = onChapterArrived((id) => {
        if (id !== 'hero') return
        setIntroExited(true)
        heroTitleReady.current += 1
        setHeroPretextEnabled(false)
        gsap.set('.hero__content', { opacity: 1, yPercent: 0 })
        gsap.set('.hero__split .split-line__inner', {
          opacity: 1,
          scale: 1,
          skewY: 0,
          xPercent: 0,
          yPercent: 0,
        })
        window.clearTimeout(pretextEnableTimer.current)
        // 延迟激活 pretext，让滚动 settle
        pretextEnableTimer.current = window.setTimeout(() => {
          if (window.scrollY > 6) return
          setPretextRefreshKey((key) => key + 1)
          setHeroPretextEnabled(true)
        }, 180)
      })

      // ── 入场 timeline：kicker → split-lines → meta-block → subline ──
      tl.to('.hero__kicker', { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out' })
        .to('.hero__split .split-line__inner', {
        yPercent: 0,
        skewY: 0,
        duration: 2.2,
        ease: 'expo.out',
        stagger: 0.12,
      }, '-=1.2')
        .to('.hero__meta-block', { opacity: 1, y: 0, duration: 1.8, stagger: 0.15, ease: 'expo.out' }, '-=1.6')
        .to('.hero__subline > *', { opacity: 1, y: 0, duration: 1.8, stagger: 0.12, ease: 'expo.out' }, '-=1.4')

      // ── step4: 滚动 scrubbing —— 粒子画布向上位移 18% 营造前景/背景景深 ──
      gsap.to('.hero__canvas', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // ── 幽灵照片：缩小透明度 + 轻微放大 scale，制造 "消散" 质感 ──
      // 仅操作 transform/opacity (GPU 合成)，不动 filter/blur
      gsap.to('.hero__ghost', {
        opacity: 0.05,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // ── 扫描线光泽：透明度降至接近不可见
      gsap.to('.hero__scan', {
        opacity: 0.05,
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // ── 内容层：上移 + 淡出，为下方的 About 章节让出视口
      gsap.to('.hero__content', {
        yPercent: -8,
        opacity: 0.0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // ── 标题裂分 parallax (由 heroParallax timeline 独立管理) ──
      if (root.current) createHeroParallax(root.current)
    }, root)

    return () => {
      cancelIntroExit()
      cancelHeroArrived()
      window.clearTimeout(pretextEnableTimer.current)
      ctx.revert()
    }
  }, [])

  /**
   * Effect 2: pretext 交互的生命周期管理。
   * 仅在 introExited 后激活。通过 rAF 节流的 scroll 监听器判断页面是否在顶部（≤6px）。
   * 超过阈值立即关闭 pretext 避免滚动冲突；回到顶部后重新激活。
   *
   * @performance 单层 rAF 节流 + passive scroll listener，不阻塞主线程
   */
  useEffect(() => {
    if (!introExited) {
      return
    }

    let ticking = false
    let initialFrame = 0
    const syncPretextAvailability = () => {
      ticking = false
      window.clearTimeout(pretextEnableTimer.current)

      if (window.scrollY > 6) {
        setHeroPretextEnabled(false)
        return
      }

      setPretextRefreshKey((key) => key + 1)
      setHeroPretextEnabled(true)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(syncPretextAvailability)
    }

    initialFrame = window.requestAnimationFrame(syncPretextAvailability)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(pretextEnableTimer.current)
    }
  }, [introExited])

  /** 绑定 pretext 文字交互到标题 heading。strength=0.78 为经过视觉调优后的弹性值。 */
  usePretextTextInteraction(nameRef, {
    enabled: heroPretextEnabled,
    refreshKey: pretextRefreshKey,
    strength: 0.78,
    text: 'Tim Cai.',
  })

  /**
   * 将标题字符串拆分为 pretext glyph 元素。
   * 每个字符被包裹在 `.pretext-glyph` span 中，data-final 属性记录最终字符
   * （用于 pretext 引擎计算目标位置）。句点 (.) 额外加 `<em>` 以适配特殊样式。
   */
  const heroGlyphs = (text: string) => text.split('').map((char, index) => {
    if (char === '.') {
      return <em className="pretext-glyph" data-final="." key={`${char}-${index}`}>.</em>
    }
    return (
      <span className="pretext-glyph" data-final={char} key={`${char}-${index}`}>
        {char}
      </span>
    )
  })

  return (
    <section className="hero" id="hero" ref={root}>
      {/* Canvas 层：幽灵照片 → 粒子肖像 (条件渲染) → 扫描线光泽，三层堆叠 */}
      <div className="hero__canvas">
        <img className="hero__ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
        {showParticleLayer && (
          <ParticlePortrait />
        )}
        <div className="hero__scan" aria-hidden="true" />
      </div>
      {/* 暗角遮罩：CSS 径向渐变，使视线聚焦中央 */}
      <div className="hero__vignette" />
      {/* 内容层：坐标 meta → kicker → 标题 → subline + scroll 指示器 */}
      <div className="container hero__content">
        <div className="hero__meta">
          <div className="hero__meta-block">
            <div>// Profile · 2026</div>
            <div>Shanghai · 31°N 121°E</div>
            <div>Available for collaborations</div>
          </div>
          <div className="hero__meta-block" style={{ textAlign: 'right' }}>
            <div>Tim · Cai</div>
            <div>freshman / builder</div>
            <div>full-stack · AI · 建模</div>
          </div>
        </div>

        <div className="hero__kicker">visual systems / webgl / front-end storytelling</div>
        <h1 className="hero__name hero__split" ref={nameRef}>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Tim')}</span></span>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Cai.')}</span></span>
        </h1>

        <div className="hero__subline">
          <span>↳ coursework, models, and strange ideas rendered into interfaces</span>
          <span className="hero__scroll">
            scroll
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  )
}

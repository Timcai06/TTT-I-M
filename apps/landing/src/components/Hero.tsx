import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { createHeroParallax } from '../lib/timelines/heroParallax'
import { onIntroExit } from '../lib/intro'
import { usePretextTextInteraction } from '../lib/pretextIntroText'
import { onChapterArrived } from '../lib/chapterTransition'
import ParticlePortrait from './ParticlePortrait'
import SignatureMark from './SignatureMark'

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
      gsap.set('.hero__signature-hotspot', { opacity: 0, scale: 0.55 })
      gsap.set('.hero__signature-mark', { opacity: 0, y: 6 })

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
        gsap.set('.hero__signature-stroke, .hero__signature-glow', { strokeDashoffset: 0 })
        gsap.set('.hero__signature-hotspot', { opacity: 1, scale: 1 })
        gsap.set('.hero__signature-mark', { opacity: 1, y: 0 })
        window.clearTimeout(pretextEnableTimer.current)
        // 延迟激活 pretext，让滚动 settle
        pretextEnableTimer.current = window.setTimeout(() => {
          if (window.scrollY > 6) return
          setPretextRefreshKey((key) => key + 1)
          setHeroPretextEnabled(true)
        }, 180)
      })

      // ── 入场 timeline：kicker → split-lines → meta-block → subline → 签名 ──
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

      // ── 签名出笔：句点先点亮，再顺势甩出一笔不断写到「蔡」收尾。
      // 字标延后半拍出现，让签名先像动作，再成为品牌落款。 ──
      const signatureStroke = root.current?.querySelector<SVGPathElement>('.hero__signature-stroke')
      const signatureGlow = root.current?.querySelector<SVGPathElement>('.hero__signature-glow')
      if (signatureStroke) {
        const strokeLength = signatureStroke.getTotalLength()
        gsap.set([signatureStroke, signatureGlow].filter(Boolean), {
          strokeDasharray: strokeLength,
          strokeDashoffset: strokeLength,
        })
        tl.to('.hero__signature-hotspot', { opacity: 1, scale: 1, duration: 0.34, ease: 'power3.out' }, '-=1.72')
          .to([signatureGlow, signatureStroke].filter(Boolean), { strokeDashoffset: 0, duration: 1.86, ease: 'power1.inOut' }, '-=1.58')
          .to('.hero__signature-mark', { opacity: 1, y: 0, duration: 0.82, ease: 'expo.out' }, '-=0.54')
          .to('.hero__signature-hotspot', { scale: 1.22, duration: 0.28, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '-=0.72')
      }

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

    // ── 签名锚定：把 swash 起笔点（viewBox 的 6,18）钉在 "Cai." 句点圆心上。
    // 用 offsetLeft/offsetTop 链测量 —— 它无视 transform，入场动画进行中
    // 也能拿到最终布局位；resize 时重测。 ──
    const positionSignature = () => {
      const rootEl = root.current
      if (!rootEl) return
      const sig = rootEl.querySelector<HTMLElement>('.hero__signature')
      const dot = rootEl.querySelector<HTMLElement>('.hero__name .pretext-glyph[data-final="."]')
      if (!sig || !dot) return
      let x = dot.offsetLeft + dot.offsetWidth / 2
      let y = dot.offsetTop + dot.offsetHeight * 0.82
      let node = dot.offsetParent as HTMLElement | null
      const anchor = sig.offsetParent as HTMLElement | null
      while (node && node !== anchor) {
        x += node.offsetLeft
        y += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      const scale = sig.offsetWidth / 340
      sig.style.left = `${x - 6 * scale}px`
      sig.style.top = `${y - 18 * scale}px`
    }
    positionSignature()
    window.addEventListener('resize', positionSignature)

    return () => {
      cancelIntroExit()
      cancelHeroArrived()
      window.removeEventListener('resize', positionSignature)
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

    let syncFrame = 0
    const syncPretextAvailability = () => {
      syncFrame = 0
      window.clearTimeout(pretextEnableTimer.current)

      if (window.scrollY > 6) {
        setHeroPretextEnabled(false)
        return
      }

      setPretextRefreshKey((key) => key + 1)
      setHeroPretextEnabled(true)
    }

    const onScroll = () => {
      if (syncFrame) return
      syncFrame = window.requestAnimationFrame(syncPretextAvailability)
    }

    syncFrame = window.requestAnimationFrame(syncPretextAvailability)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(syncFrame)
      syncFrame = 0
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
        <img className="hero__ghost hero__portrait-ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
        <ParticlePortrait />
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
            <div>freshman / AI builder</div>
            <div>systems · RAG · 建模</div>
          </div>
        </div>

        <div className="hero__kicker">AI systems / evidence / visual interfaces</div>
        <h1 className="hero__name hero__split" ref={nameRef}>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Tim')}</span></span>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Cai.')}</span></span>
        </h1>

        {/* 签名手势：一条不断笔的 SVG 线 —— 从 "Cai." 句点（运行时测量锚定）
            甩出 swash，下探、回环，行至右侧直接连笔写出行书「蔡」
            （由真实笔画中线连笔化生成，字形保真），收笔向右上扬出。
            单路径 = 单 dashoffset，整个签名是一次不间断的运笔。纯装饰，aria-hidden。 */}
        <div className="hero__signature" aria-hidden="true">
          <svg viewBox="0 0 340 175" fill="none">
            <defs>
              <linearGradient id="hero-signature-gradient" x1="0" y1="18" x2="329" y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fff0d2" />
                <stop offset="0.12" stopColor="#ff6a30" />
                <stop offset="0.48" stopColor="#ff2e1f" />
                <stop offset="1" stopColor="#9b1518" />
              </linearGradient>
            </defs>
            <path
              className="hero__signature-glow"
              d="M 6,18 C 18,40 40,50 64,46 C 80,43 92,36 98,28 C 102,21 96,15 90,20 C 84,26 90,36 104,38 C 114,40 124,48 132.7,61.3 C 143.3,60.2 174.3,56.4 187.9,55.7 C 201.5,54.9 210.6,58.7 203.7,57.3 C 196.7,55.8 160.9,49.2 151.8,48.1 C 142.7,47.0 154.8,47.7 156.3,51.5 C 157.7,55.4 154.7,69.5 159.4,68.0 C 164.0,66.4 176.1,48.0 180.5,43.5 C 184.9,38.9 181.5,43.6 182.3,44.4 C 183.0,45.2 185.3,43.2 184.3,47.6 C 183.4,52.1 184.3,63.4 177.2,67.5 C 170.1,71.6 153.2,66.9 147.4,68.8 C 141.6,70.6 150.3,72.3 147.0,77.2 C 143.6,82.0 129.6,93.8 130.2,94.0 C 130.8,94.1 144.1,80.9 150.2,78.1 C 156.3,75.3 164.0,72.9 161.8,79.2 C 159.6,85.6 146.4,103.1 138.9,111.2 C 131.4,119.3 122.0,126.1 122.8,121.3 C 123.6,116.6 138.8,93.2 142.9,86.5 C 147.1,79.8 143.3,85.7 144.4,86.4 C 145.6,87.0 150.9,88.5 148.9,89.9 C 146.9,91.3 136.3,92.8 133.8,93.6 C 131.4,94.4 135.0,93.5 136.0,94.0 C 137.1,94.4 138.1,95.0 139.1,96.0 C 140.2,97.1 134.6,103.9 141.7,99.6 C 148.7,95.3 166.1,79.2 175.7,73.7 C 185.3,68.3 187.7,71.1 191.7,71.2 C 195.7,71.3 197.6,71.5 196.4,74.4 C 195.2,77.3 190.3,85.6 185.5,86.3 C 180.6,86.9 170.0,75.4 171.2,77.8 C 172.4,80.1 182.1,92.1 191.8,98.4 C 201.5,104.8 228.4,110.2 221.5,110.5 C 214.6,110.9 167.2,102.0 155.9,100.2 C 144.7,98.3 159.4,101.1 162.8,100.9 C 166.2,100.6 170.2,99.2 173.6,98.8 C 177.0,98.4 186.0,96.1 180.5,98.9 C 175.1,101.7 144.3,111.5 145.1,113.5 C 145.9,115.5 175.3,109.9 184.7,109.5 C 194.0,109.0 197.4,110.3 193.8,111.2 C 190.1,112.1 170.6,109.0 165.8,114.1 C 161.0,119.2 170.5,133.4 168.9,137.8 C 167.3,142.1 161.3,139.5 157.5,136.6 C 153.8,133.8 151.7,124.2 149.4,123.1 C 147.1,122.0 147.3,127.9 145.5,130.9 C 143.6,133.9 132.1,140.2 139.6,138.6 C 147.1,137.0 173.3,123.8 184.4,122.6 C 195.6,121.4 194.5,130.0 197.4,132.5 C 200.4,135.0 199.1,134.4 199.7,135.7 C 200.4,137.0 200.8,138.7 201.0,139.4 C 231.0,141.4 265.0,131.4 293.0,117.4 C 307.0,110.4 319.0,103.4 329.0,95.4"
            />
            <path
              className="hero__signature-stroke"
              d="M 6,18 C 18,40 40,50 64,46 C 80,43 92,36 98,28 C 102,21 96,15 90,20 C 84,26 90,36 104,38 C 114,40 124,48 132.7,61.3 C 143.3,60.2 174.3,56.4 187.9,55.7 C 201.5,54.9 210.6,58.7 203.7,57.3 C 196.7,55.8 160.9,49.2 151.8,48.1 C 142.7,47.0 154.8,47.7 156.3,51.5 C 157.7,55.4 154.7,69.5 159.4,68.0 C 164.0,66.4 176.1,48.0 180.5,43.5 C 184.9,38.9 181.5,43.6 182.3,44.4 C 183.0,45.2 185.3,43.2 184.3,47.6 C 183.4,52.1 184.3,63.4 177.2,67.5 C 170.1,71.6 153.2,66.9 147.4,68.8 C 141.6,70.6 150.3,72.3 147.0,77.2 C 143.6,82.0 129.6,93.8 130.2,94.0 C 130.8,94.1 144.1,80.9 150.2,78.1 C 156.3,75.3 164.0,72.9 161.8,79.2 C 159.6,85.6 146.4,103.1 138.9,111.2 C 131.4,119.3 122.0,126.1 122.8,121.3 C 123.6,116.6 138.8,93.2 142.9,86.5 C 147.1,79.8 143.3,85.7 144.4,86.4 C 145.6,87.0 150.9,88.5 148.9,89.9 C 146.9,91.3 136.3,92.8 133.8,93.6 C 131.4,94.4 135.0,93.5 136.0,94.0 C 137.1,94.4 138.1,95.0 139.1,96.0 C 140.2,97.1 134.6,103.9 141.7,99.6 C 148.7,95.3 166.1,79.2 175.7,73.7 C 185.3,68.3 187.7,71.1 191.7,71.2 C 195.7,71.3 197.6,71.5 196.4,74.4 C 195.2,77.3 190.3,85.6 185.5,86.3 C 180.6,86.9 170.0,75.4 171.2,77.8 C 172.4,80.1 182.1,92.1 191.8,98.4 C 201.5,104.8 228.4,110.2 221.5,110.5 C 214.6,110.9 167.2,102.0 155.9,100.2 C 144.7,98.3 159.4,101.1 162.8,100.9 C 166.2,100.6 170.2,99.2 173.6,98.8 C 177.0,98.4 186.0,96.1 180.5,98.9 C 175.1,101.7 144.3,111.5 145.1,113.5 C 145.9,115.5 175.3,109.9 184.7,109.5 C 194.0,109.0 197.4,110.3 193.8,111.2 C 190.1,112.1 170.6,109.0 165.8,114.1 C 161.0,119.2 170.5,133.4 168.9,137.8 C 167.3,142.1 161.3,139.5 157.5,136.6 C 153.8,133.8 151.7,124.2 149.4,123.1 C 147.1,122.0 147.3,127.9 145.5,130.9 C 143.6,133.9 132.1,140.2 139.6,138.6 C 147.1,137.0 173.3,123.8 184.4,122.6 C 195.6,121.4 194.5,130.0 197.4,132.5 C 200.4,135.0 199.1,134.4 199.7,135.7 C 200.4,137.0 200.8,138.7 201.0,139.4 C 231.0,141.4 265.0,131.4 293.0,117.4 C 307.0,110.4 319.0,103.4 329.0,95.4"
            />
          </svg>
          <span className="hero__signature-hotspot" />
          <SignatureMark className="hero__signature-mark" />
        </div>
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

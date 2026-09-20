import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { createHeroParallax } from '../lib/timelines/heroParallax'
import { onIntroExit } from '../lib/intro'
import { usePretextTextInteraction } from '../lib/pretextIntroText'
import { onChapterArrived } from '../lib/chapterTransition'
import ParticlePortrait from './ParticlePortrait'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
const ArchiveIndexSurface = lazy(() => import('./personal-archive/ArchiveIndexSurface'))

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
/**
 * The three pieces of work the opening frame puts forward, in reading order.
 *
 * Each note is a fact about the thing, not a line about it: the frame already
 * carries one aphorism under the name and a second register of the same voice
 * would read as copy rather than as evidence.
 *
 * Every row used to carry a right-aligned `2026` as well. Three identical
 * monospace labels stacked down one column is a typographic impression of a data
 * table, not a table: they distinguished nothing from anything. The dates live on
 * the work chapter, beside the rest of each project's record.
 */
const selectedWork = [
  { name: 'SciScope', note: 'Every answer links back to the sentence it came from.' },
  { name: 'Earnlytics', note: '109 filings from 30 companies, summarised and still answerable.' },
  { name: 'BDI Infra Scan', note: 'Drone photographs turned into inspectable defect records.' },
]

export default function Hero() {
  // Same gate ArchiveAbout uses to decide the room exists at all.
  //
  // Both hooks are called unconditionally and combined afterwards. Written as
  // `!useMobileExperience() && !useReducedMotion()` the `&&` short-circuits, so
  // useReducedMotion was only called when the first returned false — a hook behind
  // a condition. useMobileExperience is two useSyncExternalStore calls and
  // useReducedMotion is one, so the two branches rendered three hooks or two, and
  // the moment a media query settled after first paint the count changed under
  // React. That is the "change in the order of Hooks called by Hero" warning, and
  // the TypeError reading 'length' that followed it was React failing on the
  // inconsistent hook list. In production it took the whole Hero chapter into its
  // error boundary and left the loader waiting at 99.
  const mobileExperience = useMobileExperience()
  const reducedMotion = useReducedMotion()
  const archiveIndexMode = !mobileExperience && !reducedMotion

  const root = useRef<HTMLElement>(null)
  const screenPage = useRef<HTMLDivElement>(null)
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
      gsap.set('.hero__subline', { opacity: 0, y: 8 })
      gsap.set('.hero__kicker', { opacity: 0, y: 10 })
      gsap.set('.hero__signature-seal', { opacity: 0, scale: 1.16, rotate: -3.4 })

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
        gsap.set('.hero__signature-seal', { opacity: 1, scale: 1, rotate: -3.4 })
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
        .to('.hero__subline', { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out' }, '-=1.4')

      // ── 钤印：标题落定后半拍盖下，是这一段唯一的动作。──
      // 原来是 1.86s 的描边书写动画 + glow path + 发光 hotspot + 「signed / 2026」字标。
      // 描边在实际尺寸下读起来是一根红电线，所以整条路径都删了；留下的是一次钤印。
      tl.fromTo(
        '.hero__signature-seal',
        // rotation travels in the tween, not in CSS: GSAP writes the whole
        // `transform`, so a rotate() left in the stylesheet is erased the moment
        // the stamp scales.
        { opacity: 0, scale: 1.16, rotate: -3.4 },
        { opacity: 1, scale: 1, rotate: -3.4, duration: 0.32, ease: 'power4.out', transformOrigin: '62% 32%' },
        '-=1.1',
      )

      // The Index lives projected on the room's monitor, so the hero must not also
      // parallax itself out of the way. These five scrub tweens are the pre-archive
      // design: canvas, ghost, scan line, content and title all slide and fade over
      // the first screen, and the content tween is commented in as many words as
      // clearing the viewport for About. That is the scroll-down effect the room
      // narrative does not want — you should be able to sit on the Index and open it.
      // Mobile and reduced-motion still run the original hero, which has no room.
      if (!archiveIndexMode) {
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
      }


    }, root)

    // 印章不再需要运行时测量。它曾经用 offsetLeft/offsetTop 链把起笔点钉在
    // 标题最后一个字形上（更早还钉在那个句点上），resize 时重测；现在它是右下角
    // 的一方压脚章，位置由 CSS 的栏边距给出，这段测量代码连同它的 resize 监听
    // 一起删掉了。

    return () => {
      cancelIntroExit()
      cancelHeroArrived()
      window.clearTimeout(pretextEnableTimer.current)
      ctx.revert()
    }
  }, [archiveIndexMode])

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
    interactionRoot: screenPage,
    refreshKey: pretextRefreshKey,
    strength: 0.78,
    text: 'Tim Cai',
  })

  /**
   * 将标题字符串拆分为 pretext glyph 元素。
   * 每个字符被包裹在 `.pretext-glyph` span 中，data-final 属性记录最终字符
   * （用于 pretext 引擎计算目标位置）。句点 (.) 额外加 `<em>` 以适配特殊样式。
   */
  const heroGlyphs = (text: string) => text.split('').map((char, index) => (
    <span className="pretext-glyph" data-final={char} key={`${char}-${index}`}>
      {char}
    </span>
  ))

  return (
    <section className="hero hero--archive-index" id="hero" ref={root}>
      <Suspense fallback={null}><ArchiveIndexSurface root={root} page={screenPage} /></Suspense>
      {/* The Index panel is no longer a control. Click-to-enlarge was the only
          movement it had while the opening camera was fixed; the pull-back gives
          that movement to scroll, so scrolling back to the top is the enlarged
          Index and there is nothing left to toggle. Its own links stay focusable,
          which is all the keyboard ever needed here. */}
      {/* The room recedes while the opening frame is up. The first shot is a lit
          screen in a dark space, not a landscape with a monitor in it: at
          --index-frame 1 the photograph behind the glass is held down to a
          suggestion, and it comes back as the camera pulls away from the
          monitor. Rides the same number as the panel's signature radius, so the
          room arriving and the frame retiring are one gesture. */}
      <div className="hero__room-scrim" aria-hidden="true" />
      <div ref={screenPage} className="hero__screen-page">
      {/* Canvas 层：幽灵照片 → 粒子肖像 (条件渲染) → 扫描线光泽，三层堆叠 */}
      <div className="hero__canvas">
        <img className="hero__ghost hero__portrait-ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
        <ParticlePortrait />
        </div>
      {/* 暗角遮罩：CSS 径向渐变，使视线聚焦中央 */}
      <div className="hero__vignette" />
      {/* There used to be an identity block in the top-right corner: two lines of
          10px mono reading `Freshman / AI builder` and `Shanghai / open to
          collaborations`. It said, in the frame's least legible type, what the
          sentence under the name says in a sentence — and `open to
          collaborations` belongs on the contact chapter, which is where a reader
          goes to act on it. */}
      {/* 落款：一方朱文印，钤在整幅的右下角。
          它曾经紧挨着「Cai」，被当成标点用 —— 既不在 cap line 也不在 baseline，
          悬在两者之间，而且是画面里唯一一处饱和色，只出现一次、不承担任何结构。
          现在它回到落款该在的位置：右下角的一方压脚章。红色在页面上出现两次
          （这方印，和证据块那条规则线左端的红头），于是它是一套记号，不是贴纸。
          印面刻意做了 3.4° 的歪斜、不匀的边缘和不匀的墨色 ——
          真正的印不会是一个完美的矩形。纯装饰，aria-hidden。 */}        <div className="hero__signature" aria-hidden="true">
        <svg viewBox="0 0 96 96" fill="none">
          <defs>
            {/* A chop is cut into stone and pressed into paper: the edge is
                bitten, the ink is uneven, and no two impressions match. A flat
                rect with a knocked-out glyph is a sticker. feTurbulence at a
                low frequency displaces the edge by a couple of units, which is
                what the stone's grain does. */}
            <filter
              id="hero-seal-ink"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              {/* Bite the edge: low-frequency noise displaces the outline by a
                  few units, which is what the stone's grain does to the line a
                  blade cut. */}
              <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="3" seed="7" result="edgeNoise" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="edgeNoise"
                scale="5.2"
                xChannelSelector="R"
                yChannelSelector="G"
                result="bitten"
              />
              {/* Wear the ink: cinnabar paste does not lay down evenly, so a
                  high-frequency field is thresholded into an alpha and punched
                  out of the impression. Without this the seal is a flat red
                  chip — a sticker, not a stamp. */}
              <feTurbulence type="fractalNoise" baseFrequency="0.58" numOctaves="2" seed="19" result="grain" />
              <feColorMatrix
                in="grain"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        1.7 0 0 0 -0.66"
                result="grainAlpha"
              />
              <feComposite in="bitten" in2="grainAlpha" operator="out" result="worn" />
              {/* Displacement interpolates, so the bitten edge came back soft —
                  visibly lower fidelity than the vector serif 40px away. A
                  steep alpha ramp throws it back to a hard edge while keeping
                  the shape the noise cut. */}
              <feComponentTransfer in="worn">
                <feFuncA type="linear" slope="4.2" intercept="-0.85" />
              </feComponentTransfer>
            </filter>
            <mask id="hero-seal-mask">
              {/* Each edge is off true by 1–2 units and no corner is 90°. */}
              <path d="M 33.1,2.4 L 87.4,0.9 L 89.0,55.2 L 34.6,56.8 Z" fill="#fff" />
              {/* Stroked as well as filled: at this size a Songti 蔡 knocks out
                  as hairlines, and a chop is cut with a blade, not a nib. */}
              <text
                x="61.2"
                y="28.7"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Noto Serif SC', 'Songti SC', serif"
                fontSize="38"
                fill="#000"
                stroke="#000"
                strokeWidth="1.5"
              >蔡</text>
            </mask>
          </defs>
          <g className="hero__signature-seal">
            <rect
              x="31"
              y="-1"
              width="60"
              height="60"
              fill="#b5342a"
              mask="url(#hero-seal-mask)"
              filter="url(#hero-seal-ink)"
            />
          </g>
        </svg>
      </div>
      {/* 页脚登记行：把画面的下缘收住。
          顶上有 nav，底下什么都没有 —— 内容悬在中间，上下各留一百多像素的黑，
          读起来是一块没有落地的版心。这一行只有两项，和 nav 共用左右两条边距。 */}
      <div className="hero__register">
        <span>Shanghai</span>
        <span>Open for work — 2026</span>
      </div>
      {/* 内容层：标题 → subline → index */}
      <div className="container hero__content">
        {/* The eyebrow is gone. `AI systems / evidence / visual interfaces` was a
            slash-delimited triad — the syntax of every agency about-page since
            2018 — and it said, in 10px tracked-out mono, roughly what the
            sentence under the name says in a sentence. */}
        <h1 className="hero__name hero__split" ref={nameRef}>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Tim')}</span></span>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Cai')}</span></span>
        </h1>

        {/* The middle of the type scale. Everything here used to be either 320px
            or 10px with nothing between, so the one line that says what the work
            actually is arrived as tracked-out 10px mono and got skipped. It is a
            sentence now, set in the serif, on a measure short enough to read in
            one pass. The second scroll cue that used to sit beside it is gone —
            the framed panel already carries one. */}
        <p className="hero__subline">
          Coursework, models, and strange ideas rendered into interfaces.
        </p>

        {/* 第二落点。首屏原本是「名字 → 印章 → 没了」：没有作品、没有年份、没有
            一句可验证的主张，眼睛落一次就无处可去。这一行是画面里唯一另一个
            要求被读的东西，而且它是真的 —— 点进去就是那个项目。 */}
        {/* 三条，不是一条。
            这里原来只有一个项目：一条发丝规则线、一个红头、一个右对齐年份和一句
            描述 —— 那是一份索引的解剖结构，却只装了一行，读起来是个孤儿；而首屏
            剩下四分之一的高度是空的。三条把规则线变成一个真正的系统，给眼睛第三、
            第四个落点，也把画面的脚撑住了。 */}
        <nav className="hero__index" aria-label="Selected work">
          {selectedWork.map((project) => (
            <a className="hero__index-row" href="#projects" key={project.name}>
              <span className="hero__index-name">{project.name}</span>
              <span className="hero__index-note">{project.note}</span>
            </a>
          ))}
        </nav>
      </div>
      </div>
    </section>
  )
}

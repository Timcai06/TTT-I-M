import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { revealWords } from '../lib/wordReveal'
import { facts } from '../content'
import { ABOUT_PARTICLE_TEXT } from '../lib/aboutTextParticles'
import DeferredTextParticles from './DeferredTextParticles'

/**
 * @description About 章节 —— 自述与工程叙事。内容分为左右两栏：
 *   左栏：标题逐行裂分入场 → 三段文字块 (Vision / Tech Stack / Manifesto)
 *         → 统计数字牌 → DeferredTextParticles 背景粒子效果
 *   右栏：圆角肖像框入场（一次性缓动，避免 scroll-scrub 的 border-radius repaint 开销）
 *         → Policy 哲学段落
 *
 *   Manifesto 段落使用 `revealWords` 做逐字模糊→清晰 scrub reveal（CJK 感知 tokenizer），
 *   其余段落使用 GSAP fromTo 渐现。双向回退 (`toggleActions: 'play none none reverse'`)
 *   确保用户向上滚动时动画自然撤消。
 *
 * @dependencies
 *   - GSAP + ScrollTrigger + gsap.context (动画生命周期管理)
 *   - `revealWords` (CJK 感知 word-by-word blur→clear scrub)
 *   - `DeferredTextParticles` (canvas 粒子背景，延迟加载不阻塞首屏)
 *   - Tech 竖线使用自定义贝塞尔路径 (C 1,2,3,4...) strokeDashoffset scrubbing
 *
 * @performance / @caveats
 *   - 肖像框的 `borderRadius` tween 原先为 scroll-scrub，每 tick 触发 repaint (border-radius 无法 GPU 合成)。
 *     现在改为一次性进入缓动，repaint 仅发生一次（约 1.4s 内），视觉平滑度不变，性能提升显著
 *   - Tech 竖线使用 `strokeDashoffset` 驱动（非 filter/blur），仅操作 SVG 描边，GPU 友好
 *   - DeferredTextParticles 通过 IntersectionObserver 延迟实例化，不阻塞 About 首帧渲染
 *
 * @steps
 *   step1: 标题逐行裂分 (split-line) 从下升起，stagger 0.12s
 *   step2: 各段落块逐个 fromTo 渐现，每块独立 ScrollTrigger
 *   step3: Manifesto 段落逐字 scrub reveal (blur→clear)
 *   step4: 统计牌 stagger 进场
 *   step5: 肖像框一次性 borderRadius 缓动 + 图片 scale 回缩
 *   step6: Tech 竖线路径 strokeDashoffset scrubbing (draws progressively)
 */
export default function About() {
  const root = useRef<HTMLElement>(null)
  const techPathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      // Title stagger lines reveal
      gsap.fromTo(
        '.about__lead-line',
        { yPercent: 100, skewY: 5 },
        {
          scrollTrigger: {
            trigger: '.about__lead',
            start: 'top 85%',
            toggleActions: 'play none none reverse', // 双向回退触发
          },
          yPercent: 0,
          skewY: 0,
          duration: 1.8,
          ease: 'expo.out',
          stagger: 0.12,
        }
      )

      // Independent paragraph blocks reveal. The manifesto is excluded here —
      // it gets a word-level blur→clear reveal instead (see below).
      gsap.utils
        .toArray<HTMLElement>('.about__block:not(.about__block--manifesto)')
        .forEach((block) => {
          gsap.fromTo(
            block,
            { y: 32, opacity: 0 },
            {
              scrollTrigger: {
                trigger: block,
                start: 'top 90%',
                toggleActions: 'play none none reverse', // 双向回退触发
              },
              y: 0,
              opacity: 1,
              duration: 1.6,
              ease: 'expo.out',
            }
          )
        })

      // Manifesto: scrubbed word-by-word de-blur as the line crosses the band.
      revealWords(root.current!, '.about__block--manifesto p')

      // Stats reveal
      gsap.from('.about__fact', {
        scrollTrigger: {
          trigger: '.about__facts',
          start: 'top 92%',
          toggleActions: 'play none none reverse', // 双向回退触发
        },
        y: 32,
        opacity: 0,
        duration: 1.8,
        stagger: 0.15,
        ease: 'expo.out',
      })

      // Luke-style red-portrait reveal.
      // Previously scrub-driven, which repainted `border-radius` on every
      // scroll tick (border-radius can't be GPU-composited). Now it's a
      // single eased tween fired on enter: the costly repaint happens once
      // over ~1.4s instead of continuously, and the morph reads smoother.
      gsap.fromTo(
        '.about__portrait-frame',
        {
          borderRadius: '180px 0 0 180px',
          y: 80,
          opacity: 0,
        },
        {
          scrollTrigger: {
            trigger: '.about__grid',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
          borderRadius: '320px 0 0 320px',
          y: 0,
          opacity: 1,
          duration: 1.4,
          ease: 'expo.out',
        }
      )

      gsap.fromTo(
        '.about__portrait-img',
        { scale: 1.12 },
        {
          scrollTrigger: {
            trigger: '.about__grid',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
          scale: 1.0,
          duration: 1.6,
          ease: 'expo.out',
        }
      )

      // Tech scroll line animation (draws custom bezier curve progressively until the chapter ends)
      const path = techPathRef.current
      if (path) {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
        gsap.to(path, {
          strokeDashoffset: 0,
          scrollTrigger: {
            trigger: '.about__block--tech',
            endTrigger: '.about__grid',
            start: 'top 80%',
            end: 'bottom 80%',
            scrub: 1.0,
          },
        })
      }
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="section about" id="about" ref={root}>
      <div className="about__grid">
        <div className="about__left">
          <div className="section__label">About — 自述</div>
          <h2 className="about__lead">
            <span className="split-line"><span className="about__lead-line split-line__inner">在上海读大一，</span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner">写代码、做建模、跑视觉算法</span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>抓那些会变成产品的</em></span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>瞬间。</em></span></span>
          </h2>

          <DeferredTextParticles
            text={ABOUT_PARTICLE_TEXT}
            className="about__manifesto-fx"
          />

          <div className="about__content-flow">
            {/* Block 1: Vision / Background (Large Serif, Left-aligned) */}
            <div className="about__block about__block--vision">
              <p>
                今年大一，把课内的 <span className="highlight-text">Linux 实践</span>、
                数学建模和课外的 <span className="highlight-text">AI 工具链、深度学习算法、GNN CNN神经网络</span>做成一些能真正跑起来的东西。
                从自创无人机巡检 YOLOv8-seg 视觉算法到完整美股财报分析 RAG 系统，
                我喜欢把 <span className="highlight-text font-italic">“算法 → 原型 → 产品”</span> 这一步抠到能复现的程度。
              </p>
            </div>

            {/* Block 2: Tech Specs (Indented/Right aligned, Small Mono/Sans) */}
            <div className="about__block about__block--tech">
              <div className="about__tech-line-container">
                <svg className="about__tech-svg" viewBox="0 0 40 180" fill="none" preserveAspectRatio="none">
                  {/* Guide Track line */}
                  <path
                    d="M 20,0 C 20,40 2,60 2,90 C 2,120 38,140 38,180"
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                  {/* Flowing active line */}
                  <path
                    ref={techPathRef}
                    d="M 20,0 C 20,40 2,60 2,90 C 2,120 38,140 38,180"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="about__block-label">// TECHNICAL STACK</span>
              <p>
                前端: React / Next.js / Tailwind CSS / GSAP / R3F<br />
                后端: FastAPI / Django / Celery / PostgreSQL / Redis<br />
                AI & 建模: Codex / Claude code / Pytorch / Python3 / Tensorflow
              </p>
            </div>

            {/* Block 3: Manifesto (Medium Serif, Indented Left, Accent Highlight) */}
            <div className="about__block about__block--manifesto">
              <p>
                我是一个在代码上比较克制的人。
                宁可多写几句文档，也不喜欢留一堆
                <span className="highlight-code"> as、any</span> 让队友在深夜兜底。
              </p>
            </div>
          </div>

          <div className="about__facts">
            {facts.map((f) => (
              <div className="about__fact" key={f.label}>
                <span className="about__fact-value">{f.value}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="about__right">
          <div className="about__portrait-sticky">
            <div className="about__portrait-frame">
              <div className="about__portrait-glow" />
              <img className="about__portrait-img" src="/portrait/about_me.jpg" alt="Tim's Portrait" />
              <div className="about__portrait-vignette" />
              <div className="about__portrait-meta">→ V3.0</div>
            </div>

            {/* Block 4: Philosophy moved underneath the portrait frame */}
            <div className="about__block about__block--philosophy">
              <p>
                这个站本身也是一次尝试 — GSAP + R3F + 自定义 GLSL，<br />
                没有用模板，每一帧 & 每一行着色器代码都是手写的。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

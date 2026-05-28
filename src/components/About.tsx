import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const facts = [
  { value: '10+', label: 'Public repos' },
  { value: '6', label: 'Stacks shipped' },
  { value: '2026', label: 'Freshman year' },
]

export default function About() {
  const root = useRef<HTMLElement>(null)
  const techPathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      // Title stagger lines reveal
      gsap.fromTo(
        '.about__lead-line',
        { yPercent: 100 },
        {
          scrollTrigger: {
            trigger: '.about__lead',
            start: 'top 85%',
            toggleActions: 'play none none reverse', // 双向回退触发
          },
          yPercent: 0,
          duration: 1.8,
          ease: 'expo.out',
          stagger: 0.12,
        }
      )

      // Independent paragraph blocks reveal
      gsap.utils.toArray<HTMLElement>('.about__block').forEach((block) => {
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

      // Luke-style Red Portrait ScrollTrigger animations
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
            start: 'top 80%',
            end: 'top 20%', // 缩短滚动区间，确保在进入自述板块早期即完成变形与清晰度渐变
            scrub: 0.8,     // 降低 scrub 延迟，使动画更贴合滚动节奏
          },
          borderRadius: '320px 0 0 320px',
          y: 0,
          opacity: 1,
          ease: 'none',
        }
      )

      gsap.fromTo(
        '.about__portrait-img',
        {
          scale: 1.12,
        },
        {
          scrollTrigger: {
            trigger: '.about__grid',
            start: 'top 80%',
            end: 'top 20%', // 与外框同步，缩短滚动区间
            scrub: 0.8,     // 降低 scrub 延迟
          },
          scale: 1.0,
          ease: 'none',
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

          <div className="about__content-flow">
            {/* Block 1: Vision / Background (Large Serif, Left-aligned) */}
            <div className="about__block about__block--vision">
              <p>
                我在浙江工商大学读大一，把课内的 <span className="highlight-text">Linux 实践</span>、
                数学建模和课外的 <span className="highlight-text">AI 工具链</span>做成一些能真正跑起来的东西。
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

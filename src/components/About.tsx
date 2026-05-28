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
          },
          yPercent: 0,
          duration: 1.8,
          ease: 'expo.out',
          stagger: 0.12,
        }
      )

      // Paragraphs line-by-line reveal
      gsap.fromTo(
        '.about__body-line',
        { yPercent: 100 },
        {
          scrollTrigger: {
            trigger: '.about__body',
            start: 'top 85%',
          },
          yPercent: 0,
          duration: 1.8,
          ease: 'expo.out',
          stagger: 0.08,
        }
      )

      // Stats reveal
      gsap.from('.about__fact', {
        scrollTrigger: {
          trigger: '.about__facts',
          start: 'top 92%',
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
          borderRadius: '50% 10% 50% 10% / 10% 50% 10% 50%',
          y: 80,
          opacity: 0,
        },
        {
          scrollTrigger: {
            trigger: '.about__grid',
            start: 'top 80%',
            end: 'bottom 90%',
            scrub: 1.2,
          },
          borderRadius: '160px 0 0 160px',
          y: 0,
          opacity: 1,
          ease: 'none',
        }
      )

      gsap.fromTo(
        '.about__portrait-img',
        {
          filter: 'blur(20px) brightness(0.92)',
          scale: 1.25,
        },
        {
          scrollTrigger: {
            trigger: '.about__grid',
            start: 'top 80%',
            end: 'bottom 90%',
            scrub: 1.2,
          },
          filter: 'blur(0px) brightness(1.0)',
          scale: 1.0,
          ease: 'none',
        }
      )
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
            <span className="split-line"><span className="about__lead-line split-line__inner">写代码、做建模、</span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>抓那些会变成产品的</em></span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>瞬间。</em></span></span>
          </h2>
          <div className="about__body">
            <p>
              <span className="split-line"><span className="about__body-line split-line__inner">我在浙江工商大学读大一，把课内的 Linux 实践、</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">数学建模和课外的 AI 工具链做成一些能真正跑起来的东西。</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">从无人机巡检的 YOLOv8-seg、美股财报 RAG，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">到给代理写知识基线的多代理文档技能包，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">我喜欢把"原型 → 产品"这一步抠到能复现的程度。</span></span>
            </p>
            <p>
              <span className="split-line"><span className="about__body-line split-line__inner">技术上我偏全栈视角：前端用 React / Next.js / Tailwind，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">后端 FastAPI / Django / Celery，数据库 Postgres / Supabase，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">AI 接 DeepSeek / Cohere / PaddleOCR。我比较克制，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">宁可多写几句文档，也不喜欢留一堆 <code>as any</code> 让队友兜底。</span></span>
            </p>
            <p>
              <span className="split-line"><span className="about__body-line split-line__inner">这个站本身也是一次尝试 — GSAP + R3F + 自定义 GLSL，</span></span>
              <span className="split-line"><span className="about__body-line split-line__inner">没有用模板，每一帧和每一行着色器代码都是手写的。</span></span>
            </p>
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
          </div>
        </div>
      </div>
    </section>
  )
}

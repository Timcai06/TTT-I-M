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
      gsap.fromTo(
        '.about__lead-line',
        { yPercent: 100 },
        {
          scrollTrigger: {
            trigger: '.about__lead',
            start: 'top 75%',
          },
          yPercent: 0,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.06,
        }
      )

      gsap.from('.about__body p', {
        scrollTrigger: {
          trigger: '.about__body',
          start: 'top 80%',
        },
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power2.out',
      })

      gsap.from('.about__fact', {
        scrollTrigger: {
          trigger: '.about__facts',
          start: 'top 85%',
        },
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power2.out',
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="section about container" id="about" ref={root}>
      <div className="section__label">About — 自述</div>
      <div className="about__grid">
        <div>
          <h2 className="about__lead">
            <span className="split-line"><span className="about__lead-line split-line__inner">在上海读大一，</span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner">写代码、做建模、</span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>抓那些会变成产品的</em></span></span>
            <span className="split-line"><span className="about__lead-line split-line__inner"><em>瞬间。</em></span></span>
          </h2>
        </div>
        <div className="about__body">
          <p>
            我在浙江工商大学读大一，把课内的 Linux 实践、数学建模和课外的 AI 工具链做成一些能真正跑起来的东西。
            从无人机巡检的 YOLOv8-seg、美股财报 RAG，到给代理写知识基线的多代理文档技能包，
            我喜欢把"原型 → 产品"这一步抠到能复现的程度。
          </p>
          <p>
            技术上我偏全栈视角：前端用 React / Next.js / Tailwind，后端 FastAPI / Django / Celery，
            数据库 Postgres / Supabase / pgvector，AI 接 DeepSeek / Cohere / PaddleOCR。
            做事情的时候我比较克制，宁可多写几句文档，也不喜欢留一堆 <code>as any</code> 让队友兜底。
          </p>
          <p>
            这个站本身也是一次尝试 — GSAP + R3F + 自定义 GLSL，没有用模板，每一帧都是手写的。
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
    </section>
  )
}

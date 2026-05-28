import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface Row {
  index: string
  name: string
  tags: string[]
}

const rows: Row[] = [
  { index: '/01', name: 'Frontend', tags: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind', 'shadcn/ui'] },
  { index: '/02', name: 'Motion · 3D', tags: ['GSAP', 'ScrollTrigger', 'Three.js', 'R3F', 'GLSL'] },
  { index: '/03', name: 'Backend', tags: ['FastAPI', 'Django', 'Celery', 'Redis', 'PostgreSQL'] },
  { index: '/04', name: 'AI · Data', tags: ['DeepSeek', 'Cohere', 'YOLOv8-seg', 'PaddleOCR', 'pgvector'] },
  { index: '/05', name: 'Infra', tags: ['Docker', 'Vercel', 'Supabase', 'GitHub Actions', 'Linux'] },
  { index: '/06', name: 'Modeling', tags: ['Python', 'R', 'Ridge', 'ARIMA', 'GARCH', 'LaTeX'] },
]

export default function Skills() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.from('.skill-row', {
        scrollTrigger: {
          trigger: '.skills__list',
          start: 'top 80%',
        },
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        stagger: 0.08,
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="section skills container" id="skills" ref={root}>
      <div className="section__label">Stack — 技术栈</div>
      <h2 className="section__title">
        Tools <em>I trust to</em><br />ship.
      </h2>

      <div className="skills__list">
        {rows.map((row) => (
          <div className="skill-row" key={row.index}>
            <div className="skill-row__index">{row.index}</div>
            <div className="skill-row__name">{row.name}</div>
            <div className="skill-row__tags">
              {row.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export interface SkillRow {
  index: string
  name: string
  tags: string[]
}

export const skillRows: SkillRow[] = [
  { index: '/01', name: 'Frontend', tags: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind', 'shadcn/ui'] },
  { index: '/02', name: 'Motion · 3D', tags: ['GSAP', 'ScrollTrigger', 'Three.js', 'R3F', 'GLSL'] },
  { index: '/03', name: 'Backend', tags: ['FastAPI', 'Django', 'Celery', 'Redis', 'PostgreSQL'] },
  { index: '/04', name: 'AI · Data', tags: ['DeepSeek', 'Cohere', 'YOLOv8-seg', 'PaddleOCR', 'pgvector'] },
  { index: '/05', name: 'Infra', tags: ['Docker', 'Vercel', 'Supabase', 'GitHub Actions', 'Linux'] },
  { index: '/06', name: 'Math · Modeling', tags: ['Python', 'R', 'Ridge', 'ARIMA', 'GARCH', 'LaTeX'] },
]

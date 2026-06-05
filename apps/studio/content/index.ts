import { createStaticRepository, defaultMeta, type Post, type WorkEntry } from '@timcai/content'

export const posts = createStaticRepository<Post>([
  {
    body: 'A short platform note about separating the cinematic landing runtime from content surfaces that need SSR, SSG, feeds, and future publishing workflows.',
    excerpt: 'Why the landing stays Vite while the content studio starts as a separate Next surface.',
    meta: {
      ...defaultMeta,
      publishedAt: '2026-06-05',
    },
    slug: 'platform-split',
    title: 'Keeping the landing cinematic and the studio quiet',
  },
])

export const works = createStaticRepository<WorkEntry>([
  {
    description: 'The existing Vite landing remains the cinematic entry surface with stage, preload, WebGL, Frame, and chapter systems isolated from content pages.',
    href: '/',
    meta: {
      ...defaultMeta,
      publishedAt: '2026-06-05',
    },
    slug: 'landing-system',
    tags: ['Vite', 'GSAP', 'WebGL', 'Frame'],
    title: 'TTT I M Landing System',
  },
])

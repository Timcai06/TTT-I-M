import { createStaticRepository, defaultMeta, type Post, type WorkEntry } from '@timcai/content'
import { readPosts } from './mdx'

export const posts = createStaticRepository<Post>(readPosts())

export const works = createStaticRepository<WorkEntry>([
  {
    description: 'The existing Vite landing remains the cinematic entry surface with stage, preload, WebGL, Frame, and chapter systems isolated from content pages.',
    href: '/',
    liveUrl: '/',
    meta: {
      ...defaultMeta,
      publishedAt: '2026-06-05',
    },
    notes: [
      'Stage and preload systems keep the cinematic opening deterministic while still reporting real resource progress.',
      'Frame, Life, Work, and Contact sections remain in the landing runtime instead of leaking into Studio.',
      'Mobile rules are handled as a dedicated experience layer so desktop composition stays intact.',
    ],
    repository: 'https://github.com/Timcai06/TTT-I-M',
    slug: 'landing-system',
    stack: ['Vite', 'React', 'GSAP', 'R3F', 'WebGL', 'Playwright'],
    status: 'Live system',
    summary: 'A cinematic portfolio runtime separated from the lighter Studio content surface.',
    tags: ['Vite', 'GSAP', 'WebGL', 'Frame'],
    title: 'TTT I M Landing System',
    year: '2026',
  },
])

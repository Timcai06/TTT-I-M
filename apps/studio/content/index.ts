import { createStaticRepository, defaultMeta, type Post, type WorkEntry } from '@timcai/content'
import { readPosts } from './mdx'

export const posts = createStaticRepository<Post>(readPosts())

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

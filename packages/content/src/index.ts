export type PublishState = 'draft' | 'submitted' | 'in-review' | 'approved' | 'published' | 'rejected'

export interface ContentMeta {
  author: string
  publishState: PublishState
  publishedAt?: string
  updatedAt?: string
}

export interface Post {
  body: string
  excerpt: string
  meta: ContentMeta
  readingMinutes?: number
  slug: string
  sourcePath?: string
  title: string
}

export interface WorkEntry {
  description: string
  href: string
  liveUrl?: string
  meta: ContentMeta
  notes?: string[]
  repository?: string
  slug: string
  stack?: string[]
  status?: string
  summary?: string
  tags: string[]
  title: string
  year?: string
}

export interface CollectionRepository<T extends { slug: string }> {
  all(): T[]
  get(slug: string): T | undefined
  list(): Promise<T[]>
}

export function createStaticRepository<T extends { slug: string }>(items: T[]): CollectionRepository<T> {
  const bySlug = new Map(items.map((item) => [item.slug, item]))

  return {
    all: () => items,
    get: (slug) => bySlug.get(slug),
    list: async () => items,
  }
}

export const defaultMeta: ContentMeta = {
  author: 'tim',
  publishState: 'published',
}

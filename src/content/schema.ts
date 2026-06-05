// Canonical content schema — the single type surface UI components depend on,
// instead of reaching into individual src/data/*.ts files. Today the data is
// hand-authored TS; tomorrow some of it comes from MDX (blog) or a DB (UGC).
// Components import types/data from `src/content`, so swapping the source is an
// adapter change, not a component change. (plan/04-content-layer.md)

export type * from '../data/projects'
export type * from '../data/frames'
export type * from '../data/life'
export type * from '../data/about'
export type * from '../data/skills'

/**
 * Forward-looking content metadata, shared by curated content (you) and future
 * UGC (others). Stamped with defaults by the static adapter today; a real
 * publish workflow fills it later. Added now so the schema — and the studio /
 * platform built on it (plan 03) — don't need a migration to introduce it.
 */
export type PublishState = 'draft' | 'submitted' | 'in-review' | 'published' | 'rejected'

export interface ContentMeta {
  author: string
  publishState: PublishState
  createdAt?: string
  updatedAt?: string
}

export type WithMeta<T> = T & ContentMeta

export const DEFAULT_META: ContentMeta = {
  author: 'tim',
  publishState: 'published',
}

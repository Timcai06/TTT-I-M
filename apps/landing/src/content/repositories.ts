import type { WithMeta } from './schema'

/**
 * A content collection, source-agnostic.
 *
 * - `all()` — synchronous, bundled data. The landing renders from this so there's
 *   no async empty-frame flash (GSAP/ScrollTrigger query the DOM on first paint).
 * - `list()` / `get()` — the async contract future adapters (MDX blog, DB/API for
 *   the studio + UGC, plan 03) implement. They return items stamped with
 *   ContentMeta so the studio always has author/publishState available.
 */
export interface CollectionRepository<T> {
  all(): T[]
  list(): Promise<WithMeta<T>[]>
  get(id: string): Promise<WithMeta<T> | undefined>
}

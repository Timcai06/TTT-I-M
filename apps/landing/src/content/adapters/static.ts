import { DEFAULT_META, type WithMeta } from '../schema'
import type { CollectionRepository } from '../repositories'

/**
 * Static adapter — backs a collection with a bundled in-repo array (today's
 * source for every landing collection). `all()` hands back the array directly
 * (sync, zero copy); `list()`/`get()` satisfy the async contract and stamp the
 * default ContentMeta. Future adapters (mdx.ts, api.ts) implement the same
 * CollectionRepository against MDX files or a DB without touching components.
 */
export function createStaticRepository<T>(
  items: T[],
  getId: (item: T) => string,
): CollectionRepository<T> {
  const withMeta = (item: T): WithMeta<T> => ({ ...item, ...DEFAULT_META })

  return {
    all: () => items,
    list: () => Promise.resolve(items.map(withMeta)),
    get: (id) => {
      const found = items.find((item) => getId(item) === id)
      return Promise.resolve(found ? withMeta(found) : undefined)
    },
  }
}

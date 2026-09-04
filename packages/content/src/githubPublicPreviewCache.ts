import {
  fetchPublicGitHubPreviewSnapshot,
  parsePublicGitHubHandle,
  type GitHubPublicPreviewResult,
} from './githubPublicService'

const DEFAULT_SUCCESS_TTL_MS = 120_000
const DEFAULT_MAX_ENTRIES = 32
const DEFAULT_MAX_IN_FLIGHT = 8

type PreviewLoader = (handle: string) => Promise<GitHubPublicPreviewResult>

interface CachedPreview {
  expiresAt: number
  result: GitHubPublicPreviewResult
}

export interface GitHubPublicPreviewCacheOptions {
  /** Successful previews stay reusable for this long. Failures are never cached. */
  successTtlMs?: number
  /** Hard upper bound for process-local preview entries. */
  maxEntries?: number
  /** Hard upper bound for distinct outbound previews in one server process. */
  maxInFlight?: number
  /** Injectable clock for deterministic tests. */
  now?: () => number
  /** Injectable transport boundary for deterministic tests. */
  load?: PreviewLoader
}

export interface GitHubPublicPreviewCache {
  get(handle: string): Promise<GitHubPublicPreviewResult>
  clear(): void
  size(): number
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return fallback
  return Math.max(1, Math.floor(value))
}

/**
 * Process-local, bounded cache for the public GitHub preview.
 *
 * Only complete `ready` snapshots are retained. Transient network, rate-limit,
 * validation, and not-found responses always receive a fresh request. Concurrent
 * requests for the same valid handle share one in-flight promise.
 */
export function createGitHubPublicPreviewCache(
  options: GitHubPublicPreviewCacheOptions = {},
): GitHubPublicPreviewCache {
  const successTtlMs = positiveInteger(options.successTtlMs, DEFAULT_SUCCESS_TTL_MS)
  const maxEntries = positiveInteger(options.maxEntries, DEFAULT_MAX_ENTRIES)
  const maxInFlight = positiveInteger(options.maxInFlight, DEFAULT_MAX_IN_FLIGHT)
  const now = options.now ?? Date.now
  const load = options.load ?? fetchPublicGitHubPreviewSnapshot
  const cache = new Map<string, CachedPreview>()
  const inFlight = new Map<string, Promise<GitHubPublicPreviewResult>>()
  let generation = 0

  const pruneExpired = (currentTime: number) => {
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= currentTime) cache.delete(key)
    }
  }

  const retain = (key: string, result: GitHubPublicPreviewResult, currentTime: number) => {
    cache.delete(key)
    while (cache.size >= maxEntries) {
      const oldestKey = cache.keys().next().value
      if (oldestKey === undefined) break
      cache.delete(oldestKey)
    }
    cache.set(key, { expiresAt: currentTime + successTtlMs, result })
  }

  return {
    async get(handle) {
      const parsedHandle = parsePublicGitHubHandle(handle)
      if (!parsedHandle.valid) return load(handle)

      const key = parsedHandle.handle.toLowerCase()
      const currentTime = now()
      pruneExpired(currentTime)

      const cached = cache.get(key)
      if (cached) {
        cache.delete(key)
        cache.set(key, cached)
        return cached.result
      }

      const activeRequest = inFlight.get(key)
      if (activeRequest) return activeRequest
      if (inFlight.size >= maxInFlight) {
        return {
          status: 'network_error',
          handle: parsedHandle.handle,
          message: 'GitHub preview capacity is busy. Try again shortly.',
        }
      }

      const requestGeneration = generation
      let request: Promise<GitHubPublicPreviewResult>
      request = load(parsedHandle.handle)
        .then((result) => {
          if (requestGeneration === generation && result.status === 'ready' && result.snapshot) {
            retain(key, result, now())
          }
          return result
        })
        .finally(() => {
          if (inFlight.get(key) === request) inFlight.delete(key)
        })

      inFlight.set(key, request)
      return request
    },
    clear() {
      generation += 1
      cache.clear()
      inFlight.clear()
    },
    size() {
      pruneExpired(now())
      return cache.size
    },
  }
}

const publicPreviewCache = createGitHubPublicPreviewCache()

export function fetchCachedPublicGitHubPreviewSnapshot(
  handle: string,
): Promise<GitHubPublicPreviewResult> {
  return publicPreviewCache.get(handle)
}

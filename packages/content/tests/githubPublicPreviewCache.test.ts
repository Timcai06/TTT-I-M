import test from 'node:test'
import assert from 'node:assert/strict'

import { BUILDER_GRAPH_SCHEMA_VERSION, type BuilderGraphSnapshot } from '../src/builderGraph.ts'
import {
  createGitHubPublicPreviewCache,
} from '../src/githubPublicPreviewCache.ts'
import type { GitHubPublicPreviewResult } from '../src/githubPublicService.ts'

function readyResult(handle: string): GitHubPublicPreviewResult {
  const snapshot: BuilderGraphSnapshot = {
    schemaVersion: BUILDER_GRAPH_SCHEMA_VERSION,
    owner: {
      id: `owner_${handle.toLowerCase()}`,
      handle,
      displayName: handle,
      visibility: 'private',
    },
    accounts: [],
    repositories: [],
    projects: [],
    contributions: [],
    skillSignals: [],
    growthEvents: [],
    evidence: [],
    generatedAt: '2026-09-03T00:00:00.000Z',
    visibility: 'private',
  }

  return { status: 'ready', handle, snapshot }
}

void test('caches only complete ready previews and normalizes handle casing', async () => {
  let calls = 0
  const cache = createGitHubPublicPreviewCache({
    load: async (handle) => {
      calls += 1
      return readyResult(handle)
    },
  })

  const first = await cache.get('Octo-Builder')
  const second = await cache.get('octo-builder')

  assert.equal(first.status, 'ready')
  assert.equal(second, first)
  assert.equal(calls, 1)
  assert.equal(cache.size(), 1)
})

void test('never makes a transient failure sticky', async () => {
  let calls = 0
  const cache = createGitHubPublicPreviewCache({
    load: async (handle) => {
      calls += 1
      if (calls === 1) {
        return { status: 'network_error', handle, message: 'temporary failure' }
      }
      return readyResult(handle)
    },
  })

  const first = await cache.get('octo-builder')
  const second = await cache.get('octo-builder')

  assert.equal(first.status, 'network_error')
  assert.equal(second.status, 'ready')
  assert.equal(calls, 2)
  assert.equal(cache.size(), 1)
})

void test('deduplicates concurrent requests for the same valid handle', async () => {
  let calls = 0
  let release: ((result: GitHubPublicPreviewResult) => void) | undefined
  const cache = createGitHubPublicPreviewCache({
    load: (handle) => {
      calls += 1
      return new Promise((resolve) => {
        release = resolve
      }).then((result) => ({ ...result, handle }))
    },
  })

  const first = cache.get('octo-builder')
  const second = cache.get('Octo-Builder')
  assert.equal(calls, 1)

  release?.(readyResult('octo-builder'))
  const [firstResult, secondResult] = await Promise.all([first, second])

  assert.equal(firstResult.status, 'ready')
  assert.equal(secondResult.status, 'ready')
  assert.equal(calls, 1)
})

void test('expires entries and enforces a least-recently-used size bound', async () => {
  let currentTime = 10_000
  const calls = new Map<string, number>()
  const cache = createGitHubPublicPreviewCache({
    successTtlMs: 100,
    maxEntries: 2,
    now: () => currentTime,
    load: async (handle) => {
      calls.set(handle.toLowerCase(), (calls.get(handle.toLowerCase()) ?? 0) + 1)
      return readyResult(handle)
    },
  })

  await cache.get('alpha')
  await cache.get('beta')
  await cache.get('alpha')
  await cache.get('gamma')
  assert.equal(cache.size(), 2)

  await cache.get('beta')
  assert.equal(calls.get('beta'), 2)

  currentTime += 101
  assert.equal(cache.size(), 0)
  await cache.get('alpha')
  assert.equal(calls.get('alpha'), 2)
})

void test('clear prevents an older in-flight request from repopulating the cache', async () => {
  let release: ((result: GitHubPublicPreviewResult) => void) | undefined
  let calls = 0
  const cache = createGitHubPublicPreviewCache({
    load: () => {
      calls += 1
      return new Promise((resolve) => {
        release = resolve
      })
    },
  })

  const pending = cache.get('octo-builder')
  cache.clear()
  release?.(readyResult('octo-builder'))
  await pending

  assert.equal(cache.size(), 0)
  assert.equal(calls, 1)
})

void test('bounds distinct outbound previews without building an unbounded queue', async () => {
  let releaseFirst: ((result: GitHubPublicPreviewResult) => void) | undefined
  let calls = 0
  const first = new Promise<GitHubPublicPreviewResult>((resolve) => {
    releaseFirst = resolve
  })
  const cache = createGitHubPublicPreviewCache({
    maxInFlight: 1,
    load: async (handle) => {
      calls += 1
      return handle === 'first-builder' ? first : readyResult(handle)
    },
  })

  const pending = cache.get('first-builder')
  const rejected = await cache.get('second-builder')

  assert.equal(rejected.status, 'network_error')
  assert.match(rejected.message ?? '', /capacity is busy/)
  assert.equal(calls, 1)

  releaseFirst?.(readyResult('first-builder'))
  await pending
  assert.equal((await cache.get('second-builder')).status, 'ready')
  assert.equal(calls, 2)
})

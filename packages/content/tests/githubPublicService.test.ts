import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchPublicGitHubPreviewSnapshot } from '../src/githubPublicService.ts'
import { createPublicPreviewDraft } from '../src/publicPreview.ts'

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const originalFetch = globalThis.fetch

function fixtureJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T
}

function fixtureText(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8')
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  })
}

function textResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain', ...(init.headers ?? {}) },
    ...init,
  })
}

function installFetchMock(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' || input instanceof URL ? input.toString() : input.url
    calls.push(rawUrl)
    return handler(new URL(rawUrl), init)
  }) as typeof fetch
  return calls
}

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

void test('builds a ready preview snapshot from public GitHub fixtures without Authorization', async () => {
  const calls = installFetchMock((url, init) => {
    const headers = new Headers(init?.headers)
    assert.equal(headers.has('Authorization'), false)

    if (url.pathname === '/users/octo-builder') return jsonResponse(fixtureJson('github-public-user.json'))
    if (url.pathname === '/users/octo-builder/repos') return jsonResponse(fixtureJson('github-public-repos.json'))
    if (url.pathname === '/repos/octo-builder/graph-lab/readme') return textResponse(fixtureText('github-public-readme.md'))
    if (url.pathname === '/repos/octo-builder/older-fork/readme') return textResponse('# Forked dependency')
    if (url.pathname === '/repos/octo-builder/archived-prototype/readme') return textResponse('# Archived prototype')
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('octo-builder')

  assert.equal(result.status, 'ready')
  assert.equal(result.handle, 'octo-builder')
  assert.ok(result.snapshot)
  assert.equal(result.snapshot.repositories.length, 3)
  assert.equal(result.snapshot.repositories[0]?.fullName, 'octo-builder/graph-lab')
  assert.equal(result.snapshot.repositories[0]?.stars, 3)
  assert.equal(result.snapshot.repositories[0]?.forks, 1)
  assert.equal(result.snapshot.repositories[0]?.openIssues, 2)
  assert.match(result.snapshot.repositories[0]?.readmeExcerpt ?? '', /Turns repository history/)
  assert.doesNotMatch(result.snapshot.repositories[0]?.readmeExcerpt ?? '', /console\.log/)
  assert.ok(calls.some((call) => call.includes('/readme')))

  const draft = createPublicPreviewDraft(result.snapshot, { handle: result.handle })
  assert.equal(draft.stage, 'draft_ready')
  assert.equal(draft.repositoryChoices[0]?.group, 'recommended')
  assert.equal(draft.repositoryChoices.find((repo) => repo.fullName.endsWith('/older-fork'))?.group, 'forked')
  assert.equal(draft.repositoryChoices.find((repo) => repo.fullName.endsWith('/archived-prototype'))?.group, 'archived')
  assert.match(draft.projectDrafts[0]?.summary ?? '', /Turns repository history/)
})

void test('returns not_found without fetching repositories when GitHub user does not exist', async () => {
  let cancelled = false
  const calls = installFetchMock((url) => {
    if (url.pathname === '/users/missing-builder') {
      return new Response(new ReadableStream<Uint8Array>({
        cancel() { cancelled = true },
      }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('missing-builder')

  assert.equal(result.status, 'not_found')
  assert.equal(result.snapshot, undefined)
  assert.equal(calls.length, 1)
  assert.equal(cancelled, true)
})

void test('cancels non-success README bodies without delaying a ready snapshot', async () => {
  let cancelled = false
  installFetchMock((url) => {
    if (url.pathname === '/users/octo-builder') return jsonResponse(fixtureJson('github-public-user.json'))
    if (url.pathname === '/users/octo-builder/repos') return jsonResponse(fixtureJson('github-public-repos.json'))
    if (url.pathname.endsWith('/readme')) {
      return new Response(new ReadableStream<Uint8Array>({
        cancel() { cancelled = true },
      }), {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('octo-builder')

  assert.equal(result.status, 'ready')
  assert.equal(cancelled, true)
  assert.ok(result.snapshot?.repositories.every((repository) => repository.readmeExcerpt === undefined))
})

void test('reports rate limit reset without exposing raw GitHub response body', async () => {
  installFetchMock((url) => {
    if (url.pathname === '/users/rate-limited') {
      return jsonResponse({ message: 'API rate limit exceeded' }, {
        status: 403,
        headers: { 'x-ratelimit-reset': '1780000000' },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('rate-limited')

  assert.equal(result.status, 'rate_limited')
  assert.ok(result.rateLimitResetAt)
  assert.equal(result.message?.includes('API rate limit exceeded'), false)
})

void test('empty public repository lists become repo-selection drafts, not crashes', async () => {
  installFetchMock((url) => {
    if (url.pathname === '/users/empty-builder') {
      return jsonResponse({
        ...fixtureJson<Record<string, unknown>>('github-public-user.json'),
        login: 'empty-builder',
        html_url: 'https://github.com/empty-builder',
      })
    }
    if (url.pathname === '/users/empty-builder/repos') return jsonResponse(fixtureJson('github-empty-repos.json'))
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('empty-builder')

  assert.equal(result.status, 'ready')
  assert.ok(result.snapshot)
  assert.equal(result.snapshot.repositories.length, 0)

  const draft = createPublicPreviewDraft(result.snapshot, { handle: result.handle })
  assert.equal(draft.stage, 'repo_selection')
  assert.deepEqual(draft.repositoryChoices, [])
  assert.deepEqual(draft.projectDrafts, [])
})

void test('invalid handles fail before any outbound GitHub request', async () => {
  const calls = installFetchMock(() => {
    throw new Error('fetch must not run for invalid input')
  })

  const result = await fetchPublicGitHubPreviewSnapshot('../not-a-handle')

  assert.equal(result.status, 'invalid_input')
  assert.equal(calls.length, 0)
})

void test('repository limits are clamped before entering the GitHub URL', async () => {
  const calls = installFetchMock((url) => {
    if (url.pathname === '/users/limit-builder') {
      return jsonResponse({
        ...fixtureJson<Record<string, unknown>>('github-public-user.json'),
        login: 'limit-builder',
        html_url: 'https://github.com/limit-builder',
      })
    }
    if (url.pathname === '/users/limit-builder/repos') return jsonResponse([])
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('limit-builder', 10_000)

  assert.equal(result.status, 'ready')
  assert.ok(calls.some((call) => call.includes('per_page=30')))
})

void test('a stalled GitHub request is bounded by a real abort deadline', async () => {
  let aborted = false
  const hangingFetch = ((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => {
      aborted = true
      reject(init.signal?.reason)
    }, { once: true })
  })) as typeof fetch

  const result = await fetchPublicGitHubPreviewSnapshot('timeout-builder', 12, {
    fetchImpl: hangingFetch,
    timeoutMs: 10,
  })

  assert.equal(result.status, 'network_error')
  assert.equal(aborted, true)
})

void test('the deadline resolves safely even when an injected fetch ignores AbortSignal', async () => {
  let observedAbort = false
  const nonCooperativeFetch = ((_input: string | URL | Request, init?: RequestInit) => {
    init?.signal?.addEventListener('abort', () => { observedAbort = true }, { once: true })
    return new Promise<Response>(() => {})
  }) as typeof fetch

  const startedAt = performance.now()
  const result = await fetchPublicGitHubPreviewSnapshot('non-cooperative-builder', 12, {
    fetchImpl: nonCooperativeFetch,
    timeoutMs: 10,
  })

  assert.equal(result.status, 'network_error')
  assert.equal(observedAbort, true)
  assert.ok(performance.now() - startedAt < 250)
})

void test('the GitHub deadline remains active while a response body is streaming', async () => {
  let aborted = false
  const bodyStallingFetch = ((_input: string | URL | Request, init?: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          controller.error(init.signal?.reason)
        }, { once: true })
      },
    })
    return Promise.resolve(new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
  }) as typeof fetch

  const result = await fetchPublicGitHubPreviewSnapshot('streaming-builder', 12, {
    fetchImpl: bodyStallingFetch,
    timeoutMs: 10,
  })

  assert.equal(result.status, 'network_error')
  assert.equal(aborted, true)
})

void test('the deadline cancels a locked response reader even when its stream ignores AbortSignal', async () => {
  let readerCancelled = false
  const nonCooperativeBodyFetch = (() => {
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        readerCancelled = true
      },
    })
    return Promise.resolve(new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
  }) as typeof fetch

  const result = await fetchPublicGitHubPreviewSnapshot('locked-stream-builder', 12, {
    fetchImpl: nonCooperativeBodyFetch,
    timeoutMs: 10,
  })

  assert.equal(result.status, 'network_error')
  assert.equal(readerCancelled, true)
})

void test('the whole preview operation shares one total time budget', async () => {
  let calls = 0
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls += 1
    const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url)
    if (url.pathname === '/users/budget-builder') {
      return jsonResponse({
        id: 91,
        login: 'budget-builder',
        name: 'Budget Builder',
        avatar_url: 'https://avatars.githubusercontent.com/u/91?v=4',
        html_url: 'https://github.com/budget-builder',
      })
    }

    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })
  }) as typeof fetch

  const result = await fetchPublicGitHubPreviewSnapshot('budget-builder', 12, {
    fetchImpl,
    timeoutMs: 100,
    totalTimeoutMs: 24,
  })

  assert.equal(result.status, 'network_error')
  assert.equal(calls, 2)
})

void test('rejects a structurally valid user payload that points outside trusted GitHub origins', async () => {
  const calls = installFetchMock((url) => {
    if (url.pathname === '/users/untrusted-builder') {
      return jsonResponse({
        ...fixtureJson<Record<string, unknown>>('github-public-user.json'),
        login: 'untrusted-builder',
        html_url: 'https://example.com/untrusted-builder',
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('untrusted-builder')

  assert.equal(result.status, 'invalid_response')
  assert.equal(result.snapshot, undefined)
  assert.equal(calls.length, 1)
})

void test('rejects malformed repository fields before they enter the graph snapshot', async () => {
  installFetchMock((url) => {
    if (url.pathname === '/users/octo-builder') return jsonResponse(fixtureJson('github-public-user.json'))
    if (url.pathname === '/users/octo-builder/repos') {
      const repositories = fixtureJson<Array<Record<string, unknown>>>('github-public-repos.json')
      return jsonResponse([{ ...repositories[0], stargazers_count: Number.NaN }])
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('octo-builder')

  assert.equal(result.status, 'invalid_response')
  assert.equal(result.snapshot, undefined)
})

void test('rejects oversized public response bodies before parsing them', async () => {
  let cancelled = false
  installFetchMock((url) => {
    if (url.pathname === '/users/oversized-builder') {
      const body = new ReadableStream<Uint8Array>({
        cancel() { cancelled = true },
      })
      return new Response(body, {
        status: 200,
        headers: {
          'content-length': '2000000',
          'content-type': 'application/json',
        },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('oversized-builder')

  assert.equal(result.status, 'invalid_response')
  assert.equal(result.snapshot, undefined)
  assert.equal(cancelled, true)
})

void test('rejects a non-JSON success body and cancels it without reading the payload', async () => {
  let cancelled = false
  installFetchMock((url) => {
    if (url.pathname === '/users/html-builder') {
      const body = new ReadableStream<Uint8Array>({
        cancel() { cancelled = true },
      })
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('html-builder')

  assert.equal(result.status, 'invalid_response')
  assert.equal(cancelled, true)
})

void test('an out-of-range rate-limit timestamp cannot crash error normalization', async () => {
  installFetchMock((url) => {
    if (url.pathname === '/users/rate-range-builder') {
      return jsonResponse({ message: 'rate limited' }, {
        status: 403,
        headers: { 'x-ratelimit-reset': '9999999999999999' },
      })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('rate-range-builder')

  assert.equal(result.status, 'rate_limited')
  assert.equal(result.rateLimitResetAt, undefined)
})

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
  const calls = installFetchMock((url) => {
    if (url.pathname === '/users/missing-builder') {
      return jsonResponse({ message: 'Not Found' }, { status: 404 })
    }
    throw new Error(`Unexpected fetch ${url}`)
  })

  const result = await fetchPublicGitHubPreviewSnapshot('missing-builder')

  assert.equal(result.status, 'not_found')
  assert.equal(result.snapshot, undefined)
  assert.equal(calls.length, 1)
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
      return jsonResponse({ ...fixtureJson<Record<string, unknown>>('github-public-user.json'), login: 'empty-builder' })
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

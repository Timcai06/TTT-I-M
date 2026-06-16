import type { BuilderGraphSnapshot } from './builderGraph'
import {
  createGitHubGraphAdapter,
  type GitHubContributionSummary,
  type GitHubGraphAdapterInput,
  type GitHubProfileSummary,
  type GitHubRepositorySummary,
} from './githubGraphAdapter'
import type { GitHubSyncManifest } from './githubConnector'

export type GitHubPublicPreviewStatus = 'ready' | 'not_found' | 'rate_limited' | 'network_error' | 'invalid_response'

export interface GitHubPublicPreviewResult {
  /** 当前 public service 状态。 */
  status: GitHubPublicPreviewStatus
  /** 用户输入或规范化后的 GitHub handle。 */
  handle: string
  /** 成功时返回可直接喂给 public preview draft 的 graph snapshot。 */
  snapshot?: BuilderGraphSnapshot
  /** 失败时展示给用户的安全错误信息，不包含 GitHub response body。 */
  message?: string
  /** GitHub rate limit reset 时间，ISO-8601。 */
  rateLimitResetAt?: string
}

interface GitHubPublicUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

interface GitHubPublicRepositoryResponse {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  topics?: string[]
  fork: boolean
  archived: boolean
  pushed_at: string | null
  created_at: string
  updated_at: string
}

const GITHUB_API_ORIGIN = 'https://api.github.com'
const GITHUB_API_VERSION = '2026-03-10'
const DEFAULT_REPOSITORY_LIMIT = 12

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '') || 'Timcai06'
}

function ownerIdFromHandle(handle: string): string {
  return `github_public_${handle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
}

function publicGitHubHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'ttt-i-m-builder-graph-public-preview',
  }
}

function rateLimitResetAt(response: Response): string | undefined {
  const reset = response.headers.get('x-ratelimit-reset')
  if (!reset) return undefined
  const resetMs = Number(reset) * 1000
  return Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : undefined
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return await response.json() as T
  } catch {
    return undefined
  }
}

function profileFromGitHub(user: GitHubPublicUserResponse): GitHubProfileSummary {
  return {
    githubUserId: String(user.id),
    login: user.login,
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
  }
}

function repositoryFromGitHub(repository: GitHubPublicRepositoryResponse): GitHubRepositorySummary {
  return {
    fullName: repository.full_name,
    url: repository.html_url,
    description: repository.description ?? undefined,
    primaryLanguage: repository.language ?? undefined,
    topics: repository.topics ?? [],
    isFork: repository.fork,
    isArchived: repository.archived,
    pushedAt: repository.pushed_at ?? repository.updated_at ?? repository.created_at,
  }
}

function contributionFromRepository(repository: GitHubPublicRepositoryResponse): GitHubContributionSummary {
  return {
    kind: 'commit',
    title: `${repository.name} public activity`,
    repositoryFullName: repository.full_name,
    externalId: String(repository.id),
    sourceUrl: repository.html_url,
    occurredAt: repository.pushed_at ?? repository.updated_at ?? repository.created_at,
  }
}

function manifestForPublicPreview(
  ownerId: string,
  repositories: GitHubRepositorySummary[],
  generatedAt: string,
): GitHubSyncManifest {
  return {
    id: `manifest_${ownerId}_public_preview`,
    ownerId,
    accountLinkId: `${ownerId}_public_profile`,
    permissionProfile: {
      tier: 'public',
      mode: 'public_only',
      oauthScopes: [],
      repositoryPermissions: ['metadata:read'],
      allowPrivateRepositories: false,
      defaultVisibility: 'private',
    },
    repositories: repositories.map((repository) => ({
      fullName: repository.fullName,
      selected: true,
      private: false,
      visibility: 'private',
    })),
    evidenceKinds: ['repository', 'commit'],
    trigger: 'manual',
    createdAt: generatedAt,
  }
}

/**
 * @description 读取 GitHub 公开 profile/repos，并生成 Builder Graph public preview snapshot。
 * @dependencies GitHub REST API `GET /users/{username}`、`GET /users/{username}/repos`、createGitHubGraphAdapter
 * @performance 只读取一页 public repos，默认最多 12 个，避免未授权 API rate limit 和页面等待过长。
 * @caveats 不接收 token，不读取 private repo，不保留 GitHub 原始 response body；失败时只返回安全状态。
 * @steps
 * step1: 规范化 handle，请求公开用户资料
 * step2: 请求公开 owner repositories，并过滤 private 数据
 * step3: 将 GitHub 响应清洗成 Summary，再交给 graph adapter
 */
export async function fetchPublicGitHubPreviewSnapshot(
  handle: string,
  repositoryLimit = DEFAULT_REPOSITORY_LIMIT,
): Promise<GitHubPublicPreviewResult> {
  const safeHandle = normalizeHandle(handle)
  const encodedHandle = encodeURIComponent(safeHandle)

  try {
    const userResponse = await fetch(`${GITHUB_API_ORIGIN}/users/${encodedHandle}`, {
      headers: publicGitHubHeaders(),
    })

    if (userResponse.status === 404) {
      return { status: 'not_found', handle: safeHandle, message: `GitHub user @${safeHandle} was not found.` }
    }
    if (userResponse.status === 403 || userResponse.status === 429) {
      return {
        status: 'rate_limited',
        handle: safeHandle,
        message: 'GitHub public API is currently rate limited. Try again later.',
        rateLimitResetAt: rateLimitResetAt(userResponse),
      }
    }
    if (!userResponse.ok) {
      return { status: 'network_error', handle: safeHandle, message: `GitHub user lookup failed with ${userResponse.status}.` }
    }

    const user = await readJson<GitHubPublicUserResponse>(userResponse)
    if (!user?.login || !user.id) {
      return { status: 'invalid_response', handle: safeHandle, message: 'GitHub user response was missing required public fields.' }
    }

    const reposResponse = await fetch(
      `${GITHUB_API_ORIGIN}/users/${encodedHandle}/repos?type=owner&sort=pushed&direction=desc&per_page=${repositoryLimit}`,
      { headers: publicGitHubHeaders() },
    )

    if (reposResponse.status === 403 || reposResponse.status === 429) {
      return {
        status: 'rate_limited',
        handle: safeHandle,
        message: 'GitHub public repository API is currently rate limited. Try again later.',
        rateLimitResetAt: rateLimitResetAt(reposResponse),
      }
    }
    if (!reposResponse.ok) {
      return { status: 'network_error', handle: safeHandle, message: `GitHub repository lookup failed with ${reposResponse.status}.` }
    }

    const repositoriesResponse = await readJson<GitHubPublicRepositoryResponse[]>(reposResponse)
    if (!Array.isArray(repositoriesResponse)) {
      return { status: 'invalid_response', handle: safeHandle, message: 'GitHub repositories response was not a list.' }
    }

    const publicRepositories = repositoriesResponse.filter((repository) => !('private' in repository && repository.private))
    const repositories = publicRepositories.map(repositoryFromGitHub)
    const generatedAt = new Date().toISOString()
    const ownerId = ownerIdFromHandle(user.login)
    const input: GitHubGraphAdapterInput = {
      ownerId,
      profile: profileFromGitHub(user),
      manifest: manifestForPublicPreview(ownerId, repositories, generatedAt),
      repositories,
      contributions: publicRepositories.map(contributionFromRepository),
      generatedAt,
    }

    return {
      status: 'ready',
      handle: user.login,
      snapshot: createGitHubGraphAdapter().buildSnapshot(input),
    }
  } catch {
    return {
      status: 'network_error',
      handle: safeHandle,
      message: 'GitHub public API could not be reached from the server.',
    }
  }
}

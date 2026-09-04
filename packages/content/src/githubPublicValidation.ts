export interface GitHubPublicUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export interface GitHubPublicRepositoryResponse {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  topics?: string[]
  private?: boolean
  fork: boolean
  archived: boolean
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string | null
  created_at: string
  updated_at: string
}

export const DEFAULT_REPOSITORY_LIMIT = 12
const MAX_REPOSITORY_LIMIT = 30
const GITHUB_HANDLE_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i
const GITHUB_REPOSITORY_NAME_PATTERN = /^[a-z\d._-]{1,100}$/i

export function parsePublicGitHubHandle(handle: string): { handle: string; valid: boolean } {
  const normalized = handle.trim().replace(/^@/, '') || 'Timcai06'
  return {
    handle: normalized,
    valid: normalized.length <= 39 && GITHUB_HANDLE_PATTERN.test(normalized),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.length > 0)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isTimestamp(value: unknown): value is string {
  return isBoundedString(value, 64) && Number.isFinite(Date.parse(value))
}

function isTrustedHttpsUrl(value: unknown, hostname: string): value is string {
  if (!isBoundedString(value, 2_048)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === hostname
      && url.port === ''
      && url.username === ''
      && url.password === ''
  } catch {
    return false
  }
}

export function parseGitHubUser(value: unknown): GitHubPublicUserResponse | null {
  if (!isRecord(value)) return null
  const { id, login, name, avatar_url: avatarUrl, html_url: profileUrl } = value
  if (!isNonNegativeInteger(id) || id === 0) return null
  if (!isBoundedString(login, 39) || !GITHUB_HANDLE_PATTERN.test(login)) return null
  if (name !== null && !isBoundedString(name, 256, true)) return null
  if (!isTrustedHttpsUrl(avatarUrl, 'avatars.githubusercontent.com')) return null
  if (!isTrustedHttpsUrl(profileUrl, 'github.com')) return null

  const parsedProfileUrl = new URL(profileUrl)
  if (parsedProfileUrl.pathname.replace(/\/$/, '').toLowerCase() !== `/${login.toLowerCase()}`) return null
  return { id, login, name, avatar_url: avatarUrl, html_url: profileUrl }
}

function parseGitHubRepository(
  value: unknown,
  expectedOwner: string,
): GitHubPublicRepositoryResponse | null {
  if (!isRecord(value)) return null
  const {
    id,
    name,
    full_name: fullName,
    html_url: repositoryUrl,
    description,
    language,
    topics,
    fork,
    archived,
    private: isPrivate,
    stargazers_count: stars,
    forks_count: forks,
    open_issues_count: openIssues,
    pushed_at: pushedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  } = value

  if (!isNonNegativeInteger(id) || id === 0) return null
  if (!isBoundedString(name, 100) || !GITHUB_REPOSITORY_NAME_PATTERN.test(name)) return null
  if (!isBoundedString(fullName, 140)) return null
  const [owner, repositoryName, ...extraSegments] = fullName.split('/')
  if (extraSegments.length > 0 || !owner || !repositoryName) return null
  if (!GITHUB_HANDLE_PATTERN.test(owner) || owner.toLowerCase() !== expectedOwner.toLowerCase()) return null
  if (repositoryName !== name) return null
  if (!isTrustedHttpsUrl(repositoryUrl, 'github.com')) return null
  const parsedRepositoryUrl = new URL(repositoryUrl)
  if (parsedRepositoryUrl.pathname.replace(/\/$/, '').toLowerCase() !== `/${fullName.toLowerCase()}`) return null
  if (description !== null && !isBoundedString(description, 4_096, true)) return null
  if (language !== null && !isBoundedString(language, 128, true)) return null
  if (topics !== undefined && (
    !Array.isArray(topics)
    || topics.length > 20
    || topics.some((topic) => !isBoundedString(topic, 50))
  )) return null
  if (typeof fork !== 'boolean' || typeof archived !== 'boolean') return null
  if (isPrivate !== undefined && typeof isPrivate !== 'boolean') return null
  if (!isNonNegativeInteger(stars) || !isNonNegativeInteger(forks) || !isNonNegativeInteger(openIssues)) return null
  if (pushedAt !== null && !isTimestamp(pushedAt)) return null
  if (!isTimestamp(createdAt) || !isTimestamp(updatedAt)) return null

  return {
    id,
    name,
    full_name: fullName,
    html_url: repositoryUrl,
    description,
    language,
    topics: topics as string[] | undefined,
    fork,
    archived,
    private: isPrivate as boolean | undefined,
    stargazers_count: stars,
    forks_count: forks,
    open_issues_count: openIssues,
    pushed_at: pushedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function parseGitHubRepositories(
  value: unknown,
  expectedOwner: string,
): GitHubPublicRepositoryResponse[] | null {
  if (!Array.isArray(value)) return null
  const parsed = value.map((repository) => parseGitHubRepository(repository, expectedOwner))
  return parsed.some((repository) => repository === null)
    ? null
    : parsed as GitHubPublicRepositoryResponse[]
}

export function normalizeRepositoryLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REPOSITORY_LIMIT
  return Math.min(MAX_REPOSITORY_LIMIT, Math.max(1, Math.trunc(value)))
}

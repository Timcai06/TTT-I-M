import {
  BUILDER_GRAPH_SCHEMA_VERSION,
  type BuilderGraphRepository,
  type BuilderGraphSnapshot,
  type BuilderGraphVisibility,
  type ContributionNode,
  type EvidenceKind,
  type EvidencePointer,
  type GitHubAccountLink,
  type GrowthEvent,
  type ProjectLifecycle,
  type ProjectNode,
  type RepositoryNode,
  type SkillSignal,
  type SkillSignalCategory,
} from './builderGraph'
import type { GitHubSyncManifest } from './githubConnector'
import type { PortfolioProject } from './projects'
import { portfolioProjects } from './projects'

/** GitHub mock/source adapter 看到的最小 profile 投影，不包含 token。 */
export interface GitHubProfileSummary {
  /** GitHub 用户数字 id；mock 可以使用稳定字符串，真实 adapter 必须用 GitHub 返回的 id。 */
  githubUserId: string
  /** GitHub login，用于展示和 repository full name fallback。 */
  login: string
  /** 站内展示名称。 */
  displayName: string
  /** GitHub 或用户上传头像 URL。 */
  avatarUrl?: string
  /** GitHub profile URL。 */
  profileUrl?: string
}

/** GitHub 仓库的安全投影，只保留 Builder Graph 首屏和 Studio 预览需要的字段。 */
export interface GitHubRepositorySummary {
  /** GitHub owner/name。 */
  fullName: string
  /** 仓库 HTML URL。 */
  url: string
  /** 仓库描述。 */
  description?: string
  /** 主语言。 */
  primaryLanguage?: string
  /** topics 已经是公开标签，不包含源码内容。 */
  topics: string[]
  /** 是否 fork。 */
  isFork: boolean
  /** 是否 archived。 */
  isArchived: boolean
  /** 最近 push 时间，ISO-8601。 */
  pushedAt?: string
  /** 公开 star 数，仅用于 public preview 的推荐排序。 */
  stars?: number
  /** 公开 fork 数，仅用于 public preview 的活跃度提示。 */
  forks?: number
  /** 公开 issue 数，仅用于 public preview 的维护状态提示。 */
  openIssues?: number
  /** README 中提取的短摘要；必须是公开内容且已做长度限制。 */
  readmeExcerpt?: string
}

/** GitHub 贡献事件的安全投影，避免把完整 commit diff / patch 放进 graph。 */
export interface GitHubContributionSummary {
  /** 贡献类型，和 Builder Graph ContributionKind 对齐。 */
  kind: ContributionNode['kind']
  /** 贡献标题，例如 PR title、commit subject、workflow 名称。 */
  title: string
  /** 关联仓库 full name。 */
  repositoryFullName: string
  /** 外部 id，例如 commit sha、PR node id、workflow run id。 */
  externalId?: string
  /** 原始链接。 */
  sourceUrl?: string
  /** 发生时间，ISO-8601。 */
  occurredAt: string
  /** 变更文件数量。 */
  changedFiles?: number
  /** 新增行数。 */
  additions?: number
  /** 删除行数。 */
  deletions?: number
}

/** GitHub graph adapter 的输入。真实 adapter 和 mock adapter 都必须先生成这个安全投影。 */
export interface GitHubGraphAdapterInput {
  /** BuilderIdentity.id。 */
  ownerId: string
  /** 用户 profile 安全投影。 */
  profile: GitHubProfileSummary
  /** GitHub 同步 manifest；作为用户选择和权限快照。 */
  manifest: GitHubSyncManifest
  /** 仓库安全投影。 */
  repositories: GitHubRepositorySummary[]
  /** 贡献事件安全投影。 */
  contributions: GitHubContributionSummary[]
  /** 快照生成时间，ISO-8601。 */
  generatedAt: string
}

/**
 * @description GitHub → Builder Graph 的 adapter 契约。它负责把 GitHub 安全投影转成 graph read model。
 * @dependencies BuilderGraphSnapshot、GitHubSyncManifest、未来 GitHub REST/GraphQL service
 * @performance adapter 只做确定性映射，不在这里请求 GitHub；真实网络同步应在服务端 worker/route handler。
 * @caveats 该接口不能接收 token、raw diff、raw webhook payload；敏感数据必须先在服务端清洗成 Summary。
 */
export interface GitHubGraphAdapter {
  /** 从安全投影生成 Builder Graph 快照。 */
  buildSnapshot(input: GitHubGraphAdapterInput): BuilderGraphSnapshot
}

const languageCategory: Record<string, SkillSignalCategory> = {
  TypeScript: 'frontend',
  JavaScript: 'frontend',
  Python: 'ai',
  R: 'data',
  CSS: 'design',
  HTML: 'frontend',
  Dockerfile: 'infra',
}

function toRepositoryId(fullName: string): string {
  return `repo_${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
}

function toProjectSlug(fullName: string): string {
  return fullName.split('/').at(-1)?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'
}

function splitRepositoryFullName(fullName: string): { owner: string; name: string } {
  const [owner = 'unknown', name = fullName] = fullName.split('/')
  return { owner, name }
}

function evidenceKindFromContribution(kind: ContributionNode['kind']): EvidenceKind {
  if (kind === 'pull_request') return 'pull_request'
  if (kind === 'workflow_run') return 'workflow_run'
  return kind
}

function lifecycleFromRepository(repository: GitHubRepositorySummary): ProjectLifecycle {
  if (repository.isArchived) return 'archived'
  if (!repository.pushedAt) return 'seed'
  return 'active'
}

function skillCategoryForLanguage(language?: string): SkillSignalCategory {
  if (!language) return 'documentation'
  return languageCategory[language] ?? 'documentation'
}

/**
 * @description 创建 GitHub Graph adapter。当前是确定性纯映射，给 A3 mock graph 和未来真实 service 共用。
 * @steps
 * step1: 把 repository summary 映射成 RepositoryNode 与 repository evidence
 * step2: 把 contribution summary 映射成 ContributionNode 与 contribution evidence
 * step3: 按 repo 折叠 ProjectNode、SkillSignal、GrowthEvent
 */
export function createGitHubGraphAdapter(): GitHubGraphAdapter {
  return {
    buildSnapshot(input) {
      const visibility = input.manifest.permissionProfile.defaultVisibility
      const fetchedAt = input.generatedAt

      const account: GitHubAccountLink = {
        id: input.manifest.accountLinkId,
        provider: 'github',
        connectionKind: input.manifest.permissionProfile.mode === 'github_app_installation' ? 'github_app' : 'oauth',
        githubUserId: input.profile.githubUserId,
        login: input.profile.login,
        permissions: [
          ...input.manifest.permissionProfile.oauthScopes,
          ...input.manifest.permissionProfile.repositoryPermissions,
        ],
        connectedAt: input.manifest.createdAt,
        lastSyncedAt: input.generatedAt,
        visibility: 'private',
      }

      const evidence: EvidencePointer[] = []
      const repositories: RepositoryNode[] = input.repositories.map((repository) => {
        const repositoryId = toRepositoryId(repository.fullName)
        const repositoryEvidenceId = `evidence_${repositoryId}_metadata`
        const { owner, name } = splitRepositoryFullName(repository.fullName)

        evidence.push({
          id: repositoryEvidenceId,
          provider: 'github',
          kind: 'repository',
          externalId: repository.fullName,
          repositoryFullName: repository.fullName,
          sourceUrl: repository.url,
          title: repository.fullName,
          occurredAt: repository.pushedAt,
          fetchedAt,
          visibility,
        })

        return {
          id: repositoryId,
          owner,
          name,
          fullName: repository.fullName,
          url: repository.url,
          description: repository.description,
          primaryLanguage: repository.primaryLanguage,
          topics: repository.topics,
          isFork: repository.isFork,
          isArchived: repository.isArchived,
          pushedAt: repository.pushedAt,
          stars: repository.stars,
          forks: repository.forks,
          openIssues: repository.openIssues,
          readmeExcerpt: repository.readmeExcerpt,
          evidenceIds: [repositoryEvidenceId],
          visibility,
        }
      })

      const repositoryIdsByFullName = new Map(repositories.map((repository) => [repository.fullName, repository.id]))

      const contributions: ContributionNode[] = input.contributions.flatMap((contribution) => {
        const repositoryId = repositoryIdsByFullName.get(contribution.repositoryFullName)
        if (!repositoryId) return []

        const safeExternalId = contribution.externalId ?? contribution.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        const evidenceId = `evidence_${repositoryId}_${contribution.kind}_${safeExternalId}`

        evidence.push({
          id: evidenceId,
          provider: 'github',
          kind: evidenceKindFromContribution(contribution.kind),
          externalId: contribution.externalId,
          repositoryFullName: contribution.repositoryFullName,
          sourceUrl: contribution.sourceUrl,
          title: contribution.title,
          occurredAt: contribution.occurredAt,
          fetchedAt,
          visibility,
        })

        return [{
          id: `contribution_${repositoryId}_${contribution.kind}_${safeExternalId}`,
          kind: contribution.kind,
          title: contribution.title,
          repositoryId,
          evidenceId,
          occurredAt: contribution.occurredAt,
          changedFiles: contribution.changedFiles,
          additions: contribution.additions,
          deletions: contribution.deletions,
        }]
      })

      const projects: ProjectNode[] = repositories.map((repository) => {
        const repositoryEvidenceIds = evidence
          .filter((item) => item.repositoryFullName === repository.fullName)
          .map((item) => item.id)
        const skillSignalId = `skill_${repository.id}_${repository.primaryLanguage?.toLowerCase() ?? 'documentation'}`

        return {
          id: `project_${repository.id}`,
          slug: toProjectSlug(repository.fullName),
          title: repository.name,
          summary: repository.description,
          lifecycle: lifecycleFromRepository(repository),
          repositoryIds: [repository.id],
          evidenceIds: repositoryEvidenceIds,
          skillSignalIds: [skillSignalId],
          updatedAt: repository.pushedAt,
          visibility,
        }
      })

      const skillSignals: SkillSignal[] = repositories.map((repository) => {
        const skillName = repository.primaryLanguage ?? 'Documentation'
        const relatedProjectId = `project_${repository.id}`
        const relatedEvidenceIds = evidence
          .filter((item) => item.repositoryFullName === repository.fullName)
          .map((item) => item.id)

        return {
          id: `skill_${repository.id}_${skillName.toLowerCase()}`,
          name: skillName,
          category: skillCategoryForLanguage(repository.primaryLanguage),
          weight: Math.min(1, 0.45 + relatedEvidenceIds.length * 0.12),
          projectIds: [relatedProjectId],
          evidenceIds: relatedEvidenceIds,
        }
      })

      const growthEvents: GrowthEvent[] = projects.map((project) => ({
        id: `growth_${project.id}_imported`,
        kind: project.lifecycle === 'archived' ? 'documented' : 'started',
        title: `Imported ${project.title}`,
        summary: `${project.title} entered the Builder Graph from selected GitHub evidence.`,
        occurredAt: project.updatedAt ?? input.generatedAt,
        projectIds: [project.id],
        evidenceIds: project.evidenceIds,
        visibility,
      }))

      return {
        schemaVersion: BUILDER_GRAPH_SCHEMA_VERSION,
        owner: {
          id: input.ownerId,
          handle: input.profile.login,
          displayName: input.profile.displayName,
          avatarUrl: input.profile.avatarUrl,
          profileUrl: input.profile.profileUrl,
          visibility: 'private',
        },
        accounts: [account],
        repositories,
        projects,
        contributions,
        skillSignals,
        growthEvents,
        evidence,
        generatedAt: input.generatedAt,
        visibility,
      }
    },
  }
}

function projectToRepositorySummary(project: PortfolioProject): GitHubRepositorySummary {
  const repositoryUrl = new URL(project.repository)
  const fullName = repositoryUrl.pathname.replace(/^\/|\/$/g, '')

  return {
    fullName,
    url: project.repository,
    description: project.summary,
    primaryLanguage: project.stack[0]?.replace(/\s.+$/, ''),
    topics: project.tags,
    isFork: false,
    isArchived: project.status === 'In the lab',
    pushedAt: project.meta.publishedAt,
  }
}

function projectToContributionSummary(project: PortfolioProject): GitHubContributionSummary {
  return {
    kind: project.status === 'In the lab' ? 'commit' : 'pull_request',
    title: project.status === 'In the lab' ? `${project.title} early prototype` : `${project.title} shipped system`,
    repositoryFullName: projectToRepositorySummary(project).fullName,
    externalId: project.slug,
    sourceUrl: project.repository,
    occurredAt: project.meta.publishedAt,
    changedFiles: project.notes.length,
    additions: project.stack.length * 120,
    deletions: Math.max(0, project.stack.length - 1) * 18,
  }
}

/**
 * @description 生成 Tim 当前公开作品的 demo Builder Graph。它用于 A3 产品验证，不代表真实 GitHub 同步。
 * @dependencies portfolioProjects、GitHubSyncManifest、createGitHubGraphAdapter
 * @performance 完全同步、无网络请求；适合构建期和测试守卫。
 * @caveats 该函数只生成 demo read model，不能被当成用户授权后的真实数据源。
 */
export function createTimPublicDemoBuilderGraph(generatedAt = '2026-06-16T00:00:00.000Z'): BuilderGraphSnapshot {
  const repositories = portfolioProjects.map(projectToRepositorySummary)
  const manifest: GitHubSyncManifest = {
    id: 'manifest_tim_public_demo',
    ownerId: 'user_tim',
    accountLinkId: 'github_tim_public_demo',
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
      visibility: 'private' satisfies BuilderGraphVisibility,
    })),
    evidenceKinds: ['repository', 'pull_request', 'commit'],
    trigger: 'initial_import',
    createdAt: generatedAt,
  }

  return createGitHubGraphAdapter().buildSnapshot({
    ownerId: 'user_tim',
    profile: {
      githubUserId: 'tim-public-demo',
      login: 'Timcai06',
      displayName: 'Tim Cai',
      profileUrl: 'https://github.com/Timcai06',
    },
    manifest,
    repositories,
    contributions: portfolioProjects.map(projectToContributionSummary),
    generatedAt,
  })
}

/** A3 默认 demo graph，供 Studio/guard 读取，不发起任何 GitHub 请求。 */
export const timPublicDemoBuilderGraph = createTimPublicDemoBuilderGraph()

/** BuilderGraphRepository 形态的 demo repository，验证 UI 可以先吃 read model。 */
export const timPublicDemoBuilderGraphRepository: BuilderGraphRepository = {
  getSnapshot: async (ownerId) => (ownerId === 'user_tim' ? timPublicDemoBuilderGraph : undefined),
  listEvidence: async (ownerId) => (ownerId === 'user_tim' ? timPublicDemoBuilderGraph.evidence : []),
}

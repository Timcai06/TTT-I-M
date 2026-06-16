export const BUILDER_GRAPH_SCHEMA_VERSION = '2026-06-a1' as const

/**
 * 用户可见性边界。所有 Graph 节点都必须先声明可见性，再允许进入公开叙事。
 */
export type BuilderGraphVisibility = 'private' | 'unlisted' | 'public'

/** 外部证据来源。AI 不能作为 provider；AI 只能解释这些 provider 产生的证据。 */
export type EvidenceProvider = 'github' | 'vercel' | 'manual' | 'content'

/** Builder Graph 可追溯的最小证据类型。 */
export type EvidenceKind =
  | 'repository'
  | 'commit'
  | 'pull_request'
  | 'issue'
  | 'release'
  | 'deployment'
  | 'workflow_run'
  | 'readme'
  | 'manual_note'

/** GitHub 授权方式。OAuth 适合个人读取，GitHub App 适合安装级 repo 同步。 */
export type GitHubConnectionKind = 'oauth' | 'github_app'

/** 贡献节点的事件类型，保持贴近 GitHub 原始对象而不是过早产品化。 */
export type ContributionKind =
  | 'commit'
  | 'pull_request'
  | 'issue'
  | 'release'
  | 'deployment'
  | 'workflow_run'

/** 项目在用户成长叙事里的生命周期，不等同于内容发布状态。 */
export type ProjectLifecycle = 'seed' | 'active' | 'shipped' | 'paused' | 'archived'

/** 能力信号分类。先保守分类，避免一开始就制造过细的技能标签噪声。 */
export type SkillSignalCategory =
  | 'frontend'
  | 'backend'
  | 'ai'
  | 'data'
  | 'infra'
  | 'design'
  | 'documentation'
  | 'modeling'

/** 成长时间线事件类型，用于把证据转成可复盘的人类叙事。 */
export type GrowthEventKind = 'started' | 'shipped' | 'debugged' | 'refactored' | 'documented' | 'learned'

/**
 * @description 用户身份节点。当前可以是 Tim，也可以是未来登录用户。
 * @dependencies GitHub 账号绑定、未来数据库 user 表、公开 profile route
 * @caveats `id` 是站内稳定 id，不要直接使用 GitHub login；用户改名时 graph 不能断。
 */
export interface BuilderIdentity {
  /** 站内稳定用户 id，例如 `user_tim` 或数据库 UUID。 */
  id: string
  /** 展示用 handle，可来自 GitHub login，也可由用户自定义。 */
  handle: string
  /** 公开显示名称。 */
  displayName: string
  /** 头像 URL；公开页使用前必须确认可见性。 */
  avatarUrl?: string
  /** 用户公开主页路径或外部链接。 */
  profileUrl?: string
  /** 用户整体 graph 的默认可见性。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description GitHub 账号绑定记录，只保存同步和权限判断需要的最小元数据。
 * @dependencies GitHub OAuth / GitHub App
 * @performance scopes/permissions 用字符串数组保存，便于静态 guard 和 UI 展示，不在前端解析 token。
 * @caveats access token / refresh token 不能进入该类型；密钥只能存在服务端安全存储。
 */
export interface GitHubAccountLink {
  /** 站内绑定 id。 */
  id: string
  /** 固定为 github。 */
  provider: 'github'
  /** OAuth 或 GitHub App。 */
  connectionKind: GitHubConnectionKind
  /** GitHub 用户数字 id，适合做稳定外部 id。 */
  githubUserId: string
  /** GitHub login，展示用，可能变化。 */
  login: string
  /** GitHub App installation id；OAuth-only 绑定可以为空。 */
  installationId?: string
  /** 授权范围或 app permissions 的可读列表。 */
  permissions: string[]
  /** 绑定创建时间，ISO-8601。 */
  connectedAt: string
  /** 最近一次同步完成时间，ISO-8601。 */
  lastSyncedAt?: string
  /** 账号绑定本身的可见性；默认应为 private。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description 所有 AI 叙事必须能回溯到 EvidencePointer；这是 Builder Graph OS 的事实锚点。
 * @dependencies GitHub REST/GraphQL、Vercel deployment API、用户手动补充说明、现有 content adapter
 * @caveats 不把 AI 总结写成 evidence；AI 输出只能引用 evidenceIds。
 */
export interface EvidencePointer {
  /** 站内证据 id，供 graph 节点引用。 */
  id: string
  /** 原始证据来源。 */
  provider: EvidenceProvider
  /** 原始证据类型。 */
  kind: EvidenceKind
  /** 外部系统 id，例如 commit sha、PR node id、deployment id。 */
  externalId?: string
  /** 证据所属 GitHub 仓库 full name，例如 `Timcai06/BDI`。 */
  repositoryFullName?: string
  /** 文件路径；适用于 README、代码文件、文档证据。 */
  path?: string
  /** Git sha 或 ref；适用于 commit、文件快照和 workflow。 */
  sha?: string
  /** 可打开的源链接；公开展示前需检查 visibility。 */
  sourceUrl?: string
  /** 证据短标题，用于 UI 列表和 AI 引用。 */
  title?: string
  /** 证据发生时间，ISO-8601。 */
  occurredAt?: string
  /** 证据抓取时间，ISO-8601。 */
  fetchedAt: string
  /** 该证据是否允许公开展示。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description 仓库节点。它是 Project Graph 的基础，但不等同于项目：一个项目可连接多个 repo。
 */
export interface RepositoryNode {
  /** 站内 repo 节点 id。 */
  id: string
  /** GitHub owner。 */
  owner: string
  /** GitHub repo name。 */
  name: string
  /** GitHub full name，例如 `Timcai06/Earnlytics`。 */
  fullName: string
  /** 仓库 URL。 */
  url: string
  /** 仓库描述。 */
  description?: string
  /** 主语言。 */
  primaryLanguage?: string
  /** GitHub topics。 */
  topics: string[]
  /** 是否 fork。 */
  isFork: boolean
  /** 是否 archived。 */
  isArchived: boolean
  /** 最近 push 时间，ISO-8601。 */
  pushedAt?: string
  /** 该仓库关联的证据 id。 */
  evidenceIds: string[]
  /** 仓库在 Builder Graph 中的可见性。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description 项目节点。它是用户理解自己作品的核心单位，由 repo、证据和用户编辑共同组成。
 */
export interface ProjectNode {
  /** 站内项目 id。 */
  id: string
  /** URL slug。 */
  slug: string
  /** 用户确认后的项目标题。 */
  title: string
  /** AI 可生成草稿，但公开前必须允许用户编辑确认。 */
  summary?: string
  /** 项目生命周期。 */
  lifecycle: ProjectLifecycle
  /** 连接到该项目的仓库 ids。 */
  repositoryIds: string[]
  /** 支撑该项目叙事的证据 ids。 */
  evidenceIds: string[]
  /** 该项目体现的能力信号 ids。 */
  skillSignalIds: string[]
  /** 项目开始时间，ISO-8601。 */
  startedAt?: string
  /** 项目发布/完成时间，ISO-8601。 */
  shippedAt?: string
  /** 项目最近更新时间，ISO-8601。 */
  updatedAt?: string
  /** 项目可见性。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description 贡献节点，保留接近 GitHub 的原子事件，供增长时间线和技能推断使用。
 */
export interface ContributionNode {
  /** 站内贡献 id。 */
  id: string
  /** 贡献类型。 */
  kind: ContributionKind
  /** 贡献标题，例如 PR title、commit subject、issue title。 */
  title: string
  /** 关联仓库 id。 */
  repositoryId: string
  /** 关联证据 id。 */
  evidenceId: string
  /** 发生时间，ISO-8601。 */
  occurredAt: string
  /** 变更文件数量；不是所有事件都有。 */
  changedFiles?: number
  /** 新增行数；不是所有事件都有。 */
  additions?: number
  /** 删除行数；不是所有事件都有。 */
  deletions?: number
}

/**
 * @description 能力信号，不直接等于“用户掌握技能”，而是由证据支持的倾向。
 */
export interface SkillSignal {
  /** 站内能力信号 id。 */
  id: string
  /** 能力名称，例如 React、FastAPI、RAG、CI。 */
  name: string
  /** 能力分类。 */
  category: SkillSignalCategory
  /** 0–1 权重，表示证据强度；展示层必须避免把它包装成考试分数。 */
  weight: number
  /** 支撑该能力的项目 ids。 */
  projectIds: string[]
  /** 支撑该能力的证据 ids。 */
  evidenceIds: string[]
}

/**
 * @description 成长事件，把多个证据折叠成一条用户能读懂的时间线。
 */
export interface GrowthEvent {
  /** 站内事件 id。 */
  id: string
  /** 事件类型。 */
  kind: GrowthEventKind
  /** 用户可读标题。 */
  title: string
  /** 用户可读摘要；AI 可生成草稿，但公开前应可编辑。 */
  summary: string
  /** 发生时间，ISO-8601。 */
  occurredAt: string
  /** 该事件引用的项目 ids。 */
  projectIds: string[]
  /** 该事件引用的证据 ids。 */
  evidenceIds: string[]
  /** 事件可见性。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description 某个用户在某个时间点的 Project Graph 快照。
 * @dependencies 未来 DB adapter、GitHub sync job、AI narrative pipeline、Studio dashboard/public profile
 * @performance 快照是读模型，不要求每次请求实时同步 GitHub；同步任务可以异步刷新。
 * @caveats `generatedAt` 只表示图谱生成时间，不代表所有 evidence 都是最新。
 */
export interface BuilderGraphSnapshot {
  /** schema 版本，用于未来迁移和 guard。 */
  schemaVersion: typeof BUILDER_GRAPH_SCHEMA_VERSION
  /** graph 所属用户。 */
  owner: BuilderIdentity
  /** 已连接账号。 */
  accounts: GitHubAccountLink[]
  /** 仓库节点。 */
  repositories: RepositoryNode[]
  /** 项目节点。 */
  projects: ProjectNode[]
  /** 原子贡献节点。 */
  contributions: ContributionNode[]
  /** 能力信号节点。 */
  skillSignals: SkillSignal[]
  /** 成长时间线节点。 */
  growthEvents: GrowthEvent[]
  /** 可追溯证据池。 */
  evidence: EvidencePointer[]
  /** 快照生成时间，ISO-8601。 */
  generatedAt: string
  /** 整体默认可见性。 */
  visibility: BuilderGraphVisibility
}

/**
 * @description Builder Graph 读取仓储接口。先定义 read model，后续 GitHub/DB adapter 按这个契约实现。
 */
export interface BuilderGraphRepository {
  /** 获取某个用户的最新 graph 快照。 */
  getSnapshot(ownerId: string): Promise<BuilderGraphSnapshot | undefined>
  /** 列出某个用户的证据池，用于审计 AI 输出是否可追溯。 */
  listEvidence(ownerId: string): Promise<EvidencePointer[]>
}

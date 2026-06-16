import type { BuilderGraphVisibility, EvidenceKind } from './builderGraph'

/**
 * GitHub 连接模式。
 * - `public_only`: 不需要用户授权，只读取公开 API 能看到的信息。
 * - `oauth_identity`: 只用于登录和身份识别，不要求 repo scope。
 * - `github_app_installation`: 用 GitHub App installation 做 repo 级只读同步。
 */
export type GitHubConnectionMode = 'public_only' | 'oauth_identity' | 'github_app_installation'

/** GitHub App repository permission 的最小读权限集合。 */
export type GitHubRepositoryPermission =
  | 'metadata:read'
  | 'contents:read'
  | 'pull_requests:read'
  | 'issues:read'
  | 'actions:read'
  | 'deployments:read'

/** OAuth 仅用于身份层时允许的最小 scope。 */
export type GitHubOAuthScope = 'read:user' | 'user:email'

/** Builder Graph OS 对 GitHub 权限的产品分层。 */
export type GitHubPermissionTier = 'public' | 'identity' | 'repository_read'

/** 同步触发方式。 */
export type GitHubSyncTrigger = 'manual' | 'scheduled' | 'webhook' | 'initial_import'

/** 同步任务状态。 */
export type GitHubSyncStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

/** 断开 GitHub 连接后的数据处理策略。 */
export type GitHubDisconnectMode = 'pause_sync' | 'delete_private_evidence' | 'delete_all_imported_evidence'

/**
 * @description GitHub Connector 的权限配置。它描述产品想要什么权限，不保存任何 token。
 * @dependencies GitHub OAuth scopes / GitHub App repository permissions
 * @caveats OAuth 仓库级宽权限不在白名单内；需要仓库证据时优先 GitHub App 只读 installation。
 */
export interface GitHubPermissionProfile {
  /** 权限层级。 */
  tier: GitHubPermissionTier
  /** 连接模式。 */
  mode: GitHubConnectionMode
  /** OAuth scope 白名单；identity 层最多只应出现 read:user / user:email。 */
  oauthScopes: GitHubOAuthScope[]
  /** GitHub App repository permissions 白名单。 */
  repositoryPermissions: GitHubRepositoryPermission[]
  /** 是否允许同步 private repo；默认 false，必须用户单独确认。 */
  allowPrivateRepositories: boolean
  /** 该权限配置默认导入后的可见性。 */
  defaultVisibility: BuilderGraphVisibility
}

/**
 * @description 用户选择同步哪些仓库。默认 selected，避免“全账号一次性吸入”造成隐私惊吓。
 */
export interface GitHubRepositorySelection {
  /** GitHub owner/name。 */
  fullName: string
  /** GitHub repository id，可为空直到首次同步。 */
  githubRepositoryId?: string
  /** 用户是否选择导入该仓库。 */
  selected: boolean
  /** 是否 private。 */
  private: boolean
  /** 用户为该仓库指定的可见性。 */
  visibility: BuilderGraphVisibility
  /** 用户排除同步的证据类型。 */
  excludedEvidenceKinds?: EvidenceKind[]
}

/**
 * @description 一次 GitHub 同步的输入清单。同步 worker 只能处理 manifest 中明确列出的仓库和证据类型。
 * @dependencies GitHubAccountLink、GitHubPermissionProfile、未来 sync worker
 * @performance manifest 是小对象，可进入队列；大体积 GitHub payload 不应塞进这里。
 * @caveats manifest 不是权限本身；实际请求仍必须由服务端根据 installation token / OAuth token 校验。
 */
export interface GitHubSyncManifest {
  /** 站内 manifest id。 */
  id: string
  /** BuilderIdentity.id。 */
  ownerId: string
  /** GitHubAccountLink.id。 */
  accountLinkId: string
  /** 权限配置快照。 */
  permissionProfile: GitHubPermissionProfile
  /** 用户选择同步的仓库。 */
  repositories: GitHubRepositorySelection[]
  /** 本次同步允许采集的证据类型。 */
  evidenceKinds: EvidenceKind[]
  /** 同步触发方式。 */
  trigger: GitHubSyncTrigger
  /** manifest 创建时间，ISO-8601。 */
  createdAt: string
}

/**
 * @description GitHub 同步任务状态。它记录同步结果，不承载同步出的 evidence payload。
 */
export interface GitHubSyncJob {
  /** 站内 job id。 */
  id: string
  /** 对应 manifest id。 */
  manifestId: string
  /** 当前任务状态。 */
  status: GitHubSyncStatus
  /** 任务开始时间，ISO-8601。 */
  startedAt?: string
  /** 任务结束时间，ISO-8601。 */
  finishedAt?: string
  /** 成功写入的 evidence 数量。 */
  evidenceWritten?: number
  /** 失败原因，给 dashboard 展示和调试，不应包含 token。 */
  errorMessage?: string
}

/**
 * @description 断开 GitHub 连接时的清理策略。它优先保护用户隐私，而不是保留产品数据。
 */
export interface GitHubDisconnectPolicy {
  /** 处理模式。 */
  mode: GitHubDisconnectMode
  /** 需要断开的 account link id。 */
  accountLinkId: string
  /** 是否撤销远端 GitHub App installation 或 OAuth grant。 */
  revokeRemoteGrant: boolean
  /** 是否删除本地 AI 草稿。 */
  deleteAiDrafts: boolean
  /** 策略创建时间，ISO-8601。 */
  requestedAt: string
}

/** 不登录时的公开采集配置：只可读 public evidence，默认 private 存储。 */
export const publicOnlyPermissionProfile: GitHubPermissionProfile = {
  tier: 'public',
  mode: 'public_only',
  oauthScopes: [],
  repositoryPermissions: ['metadata:read'],
  allowPrivateRepositories: false,
  defaultVisibility: 'private',
}

/** 身份登录配置：只识别用户，不采集 repo 代码。 */
export const oauthIdentityPermissionProfile: GitHubPermissionProfile = {
  tier: 'identity',
  mode: 'oauth_identity',
  oauthScopes: ['read:user'],
  repositoryPermissions: [],
  allowPrivateRepositories: false,
  defaultVisibility: 'private',
}

/** 仓库只读同步配置：用 GitHub App installation 采集 evidence。 */
export const repositoryReadPermissionProfile: GitHubPermissionProfile = {
  tier: 'repository_read',
  mode: 'github_app_installation',
  oauthScopes: [],
  repositoryPermissions: [
    'metadata:read',
    'contents:read',
    'pull_requests:read',
    'issues:read',
    'actions:read',
    'deployments:read',
  ],
  allowPrivateRepositories: false,
  defaultVisibility: 'private',
}

import type { BuilderGraphSnapshot, RepositoryNode, SkillSignal } from './builderGraph'

/** Public preview 当前的步骤，先让用户看到成就感，再进入真实授权。 */
export type PublicPreviewStage = 'handle_lookup' | 'repo_selection' | 'draft_ready'

/** Public preview 中一条可选择仓库。 */
export interface PublicPreviewRepositoryChoice {
  /** Builder Graph repository id。 */
  id: string
  /** GitHub owner/name。 */
  fullName: string
  /** 展示标题。 */
  title: string
  /** 仓库描述。 */
  description?: string
  /** 主语言。 */
  primaryLanguage?: string
  /** 支撑该仓库的证据数量。 */
  evidenceCount: number
  /** 是否默认进入 draft。 */
  selected: boolean
}

/** Public preview 草稿中的项目叙事卡。 */
export interface PublicPreviewProjectDraft {
  /** ProjectNode.id。 */
  id: string
  /** 草稿标题，后续允许用户编辑。 */
  title: string
  /** 草稿摘要，来自仓库 evidence，不是 AI 最终稿。 */
  summary: string
  /** 关联仓库 full names。 */
  repositories: string[]
  /** 关联能力信号名称。 */
  signals: string[]
  /** 证据数量。 */
  evidenceCount: number
}

/** Public preview 页面读取的完整草稿。 */
export interface PublicPreviewDraft {
  /** 当前阶段。 */
  stage: PublicPreviewStage
  /** 用户输入的 GitHub handle。 */
  handle: string
  /** 来源说明，避免用户误以为已授权。 */
  sourceLabel: string
  /** 可选择仓库。 */
  repositoryChoices: PublicPreviewRepositoryChoice[]
  /** 已选择仓库 ids。 */
  selectedRepositoryIds: string[]
  /** 由已选仓库折叠出的项目草稿。 */
  projectDrafts: PublicPreviewProjectDraft[]
  /** 当前最强能力信号。 */
  topSignals: SkillSignal[]
  /** 下一步行动文案。 */
  nextActions: string[]
}

export interface CreatePublicPreviewDraftOptions {
  /** 用户输入的 GitHub handle。 */
  handle: string
  /** 用户勾选的 repository ids；为空时用默认推荐。 */
  selectedRepositoryIds?: string[]
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim().replace(/^@/, '')
  return trimmed || 'Timcai06'
}

function repositoryEvidenceCount(snapshot: BuilderGraphSnapshot, repository: RepositoryNode): number {
  return snapshot.evidence.filter((evidence) => evidence.repositoryFullName === repository.fullName).length
}

function defaultSelectedRepositoryIds(repositories: RepositoryNode[]): string[] {
  return repositories
    .filter((repository) => !repository.isArchived)
    .slice(0, 4)
    .map((repository) => repository.id)
}

/**
 * @description 从 Builder Graph snapshot 生成 public preview 草稿，支撑 “输入 handle → 选择 repo → 预览成长地图”。
 * @dependencies BuilderGraphSnapshot、RepositoryNode、SkillSignal
 * @performance 只在已有 read model 上做数组过滤和映射，不发起 GitHub 请求，适合 Studio server component 构建/渲染。
 * @caveats 这是 public preview 草稿，不代表用户已授权；真实 private repo / AI 生成必须另走 GitHub App 和用户确认。
 * @steps
 * step1: 规范化 handle，并生成仓库选择列表
 * step2: 根据用户选择或默认推荐筛选 repository
 * step3: 将 ProjectNode 折叠成可编辑的项目叙事草稿
 */
export function createPublicPreviewDraft(
  snapshot: BuilderGraphSnapshot,
  options: CreatePublicPreviewDraftOptions,
): PublicPreviewDraft {
  const handle = normalizeHandle(options.handle)
  const fallbackSelection = defaultSelectedRepositoryIds(snapshot.repositories)
  const selectedRepositoryIds = options.selectedRepositoryIds?.length
    ? options.selectedRepositoryIds
    : fallbackSelection

  const selectedRepositoryIdSet = new Set(selectedRepositoryIds)
  const repositoryChoices = snapshot.repositories.map((repository) => ({
    id: repository.id,
    fullName: repository.fullName,
    title: repository.name,
    description: repository.description,
    primaryLanguage: repository.primaryLanguage,
    evidenceCount: repositoryEvidenceCount(snapshot, repository),
    selected: selectedRepositoryIdSet.has(repository.id),
  }))

  const projectDrafts = snapshot.projects
    .filter((project) => project.repositoryIds.some((repositoryId) => selectedRepositoryIdSet.has(repositoryId)))
    .map((project) => {
      const repositories = project.repositoryIds
        .map((repositoryId) => snapshot.repositories.find((repository) => repository.id === repositoryId))
        .filter((repository): repository is RepositoryNode => Boolean(repository))
      const signals = project.skillSignalIds
        .map((signalId) => snapshot.skillSignals.find((signal) => signal.id === signalId))
        .filter((signal): signal is SkillSignal => Boolean(signal))

      return {
        id: project.id,
        title: project.title,
        summary: project.summary ?? 'Repository evidence is ready; add your own project story before publishing.',
        repositories: repositories.map((repository) => repository.fullName),
        signals: signals.map((signal) => signal.name),
        evidenceCount: project.evidenceIds.length,
      }
    })

  const selectedProjectIds = new Set(projectDrafts.map((project) => project.id))
  const topSignals = snapshot.skillSignals
    .filter((signal) => signal.projectIds.some((projectId) => selectedProjectIds.has(projectId)))
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)

  return {
    stage: projectDrafts.length > 0 ? 'draft_ready' : 'repo_selection',
    handle,
    sourceLabel: 'Public preview · no OAuth · no private repositories',
    repositoryChoices,
    selectedRepositoryIds,
    projectDrafts,
    topSignals,
    nextActions: [
      'Edit project titles and summaries before publishing.',
      'Choose which repositories and evidence types stay private.',
      'Connect GitHub App only when you want automatic refresh.',
    ],
  }
}

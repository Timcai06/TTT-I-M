/** 内容生命周期状态，Studio 审核流和前台展示策略都以它为准。 */
export type PublishState = 'draft' | 'submitted' | 'in-review' | 'approved' | 'published' | 'rejected'

/**
 * @description 跨 landing/studio 共享的内容元数据，描述作者、发布时间和发布状态
 */
export interface ContentMeta {
  /** 作者标识；当前默认是 tim，未来可扩展为用户 id */
  author: string
  /** 发布状态；前台通常只展示 published/approved 内容 */
  publishState: PublishState
  /** 创建时间，建议使用 ISO-8601 字符串 */
  createdAt?: string
  /** 发布时间，建议使用 ISO-8601 字符串 */
  publishedAt?: string
  /** 最近更新时间，建议使用 ISO-8601 字符串 */
  updatedAt?: string
}

/** 将 ContentMeta 附加到任意条目类型上，作为带元数据的完整内容条目。 */
export type WithMeta<T> = T & ContentMeta

/**
 * @description Studio 博文内容结构，当前由 apps/studio/content/posts/*.mdx 解析生成
 */
export interface Post {
  /** MDX 正文内容，渲染层负责转换成 React 内容 */
  body: string
  /** 列表页摘要，来自 frontmatter.excerpt */
  excerpt: string
  /** 内容元数据，包含发布状态和时间 */
  meta: ContentMeta
  /** 估算阅读分钟数，按正文词数计算 */
  readingMinutes?: number
  /** URL slug，与 mdx 文件名对应 */
  slug: string
  /** 源文件路径，用于调试和内容管理回溯 */
  sourcePath?: string
  /** 文章标题，来自 frontmatter.title */
  title: string
}

/**
 * @description Studio 作品条目结构，用于 /work 列表和详情页
 */
export interface WorkEntry {
  /** 作品详情描述 */
  description: string
  /** 作品详情或外部链接 */
  href: string
  /** 可访问的在线演示地址 */
  liveUrl?: string
  /** 内容元数据，包含发布状态和时间 */
  meta: ContentMeta
  /** 作品补充说明或过程记录 */
  notes?: string[]
  /** GitHub 或其他代码仓库地址 */
  repository?: string
  /** URL slug */
  slug: string
  /** 技术栈标签 */
  stack?: string[]
  /** 当前作品状态，如 shipped / in progress */
  status?: string
  /** 列表页短摘要 */
  summary?: string
  /** 分类标签，用于筛选或聚合 */
  tags: string[]
  /** 作品标题 */
  title: string
  /** 作品年份 */
  year?: string
}

/**
 * @description 内容集合仓储接口，隔离静态数组、MDX 文件和未来数据库来源
 */
export interface CollectionRepository<T extends { slug: string }> {
  /** 同步返回所有条目；适合当前静态内容和构建时读取 */
  all(): T[]
  /** 按 slug 同步查找单条目 */
  get(slug: string): T | undefined
  /** 异步列表接口；给未来远程/数据库适配器保留一致调用形态 */
  list(): Promise<T[]>
}

/**
 * @description 从静态数组创建只读 repository，供 Studio 当前内容面使用
 * @dependencies JavaScript Map
 * @performance 构造时建立 slug Map，详情页查找为 O(1)
 * @caveats 返回原始数组引用，不做深拷贝；调用方不要在运行时修改内容对象
 */
export function createStaticRepository<T extends { slug: string }>(items: T[]): CollectionRepository<T> {
  const bySlug = new Map(items.map((item) => [item.slug, item]))

  return {
    all: () => items,
    get: (slug) => bySlug.get(slug),
    list: async () => items,
  }
}

/**
 * @description 按自定义 id 取键的内容仓储契约 —— landing 的集合（photos 用 src、
 *   facts 用 label 等）没有统一的 slug 字段，因此与上面 slug 取键的
 *   CollectionRepository 并列。`all()` 同步返回打包数据（landing 首帧无 loading 态）；
 *   `list()` / `get()` 为异步契约，未来 MDX/DB 适配器按此实现并附带 ContentMeta。
 * @caveats 同步 `all()` 仅静态适配器可用 —— 迁移到异步数据源时 landing 需引入
 *   Suspense 或预取策略以避免首帧空白
 */
export interface KeyedCollectionRepository<T> {
  /** 同步获取全量集合（原始数据，不附带 ContentMeta）。 */
  all(): T[]
  /** 异步获取全量集合，每项附带 ContentMeta。 */
  list(): Promise<WithMeta<T>[]>
  /** 按 id 获取单条目（id 由工厂函数的 getId 提取）。 */
  get(id: string): Promise<WithMeta<T> | undefined>
}

/**
 * @description 把手写静态数组包装成 KeyedCollectionRepository（landing 当前的唯一适配器）
 * @performance all() 零拷贝返回原数组；list/get 仅为未来适配器保持异步形态
 * @caveats 返回原始数组引用，调用方不要修改条目对象
 */
export function createKeyedStaticRepository<T>(
  items: T[],
  getId: (item: T) => string,
): KeyedCollectionRepository<T> {
  const withMeta = (item: T): WithMeta<T> => ({ ...item, ...defaultMeta })

  return {
    all: () => items,
    list: () => Promise.resolve(items.map(withMeta)),
    get: (id) => {
      const found = items.find((item) => getId(item) === id)
      return Promise.resolve(found ? withMeta(found) : undefined)
    },
  }
}

/** 默认内容元数据，供静态内容未显式声明时兜底。 */
export const defaultMeta: ContentMeta = {
  author: 'tim',
  publishState: 'published',
}

export { landingPortfolioProjects, portfolioProjects } from './projects'
export type { MediaKind, PortfolioProject, Project, ProjectShot } from './projects'

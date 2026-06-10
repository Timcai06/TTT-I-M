import type { WithMeta } from './schema'

/**
 * @description 内容集合的仓储契约 (Repository Pattern) —— 解耦数据源与 UI 渲染。
 *   `all()` 为同步打包数据 —— landing 页用同步渲染避免 GSAP/ScrollTrigger 初始测量时的空帧闪烁。
 *   `list()` / `get()` 为异步契约 —— 未来 MDX 博客适配器、DB/UGC 适配器均按此接口实现，
 *   返回附带 ContentMeta 的条目，确保 Studio 侧始终可获取 author/publishState。
 * @dependencies 类型层面依赖 `schema.ts` 的 `WithMeta<T>`；无运行时依赖
 * @caveats 同步 `all()` 仅在静态适配器中可用 —— 若未来迁移到异步数据源，
 *   需在 landing 侧引入 Suspense 或预取策略以避免首帧空白
 */
export interface CollectionRepository<T> {
  /**
   * 同步获取全量集合。仅静态数据可用；调用方（landing 组件）不处理 loading 态。
   * @returns 原始数据数组，不附带 ContentMeta
   */
  all(): T[]

  /**
   * 异步获取全量集合，每项附带 ContentMeta。
   * @returns 带发布状态/作者等元字段的 Promise 数组
   */
  list(): Promise<WithMeta<T>[]>

  /**
   * 按 id 获取单条目。
   * @param id 条目标识字段（由工厂函数的 `getId` 提取）
   * @returns 找到时返回带 ContentMeta 的条目，否则返回 undefined
   */
  get(id: string): Promise<WithMeta<T> | undefined>
}

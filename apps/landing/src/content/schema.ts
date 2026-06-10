/**
 * @description 内容层单一类型入口 —— UI 组件从此处消费所有类型，不直接触及 `src/data/*.ts`。
 *   当前所有数据为手写 TypeScript 静态数组；未来博客 MDX 与 UGC 数据库接入时，只需替换适配器实现，
 *   组件层无需任何改动。这是 `plan/04-content-layer.md` 的运行时落地锚点。
 * @dependencies 仅依赖 `../data/*` 的类型重导出；不引入运行时库
 * @caveats PublishState 枚举在两个 schema 文件中各自定义（此处 vs packages/content）—— 合并时需保持语义一致
 */
export type * from '../data/projects'
export type * from '../data/frames'
export type * from '../data/life'
export type * from '../data/about'
export type * from '../data/skills'

/**
 * 内容条目的生命周期发布状态。
 * 当前所有静态数据均标记为 `published`；未来的 Studio (plan/03) 将引入审核流水线，
 * 使条目可从 draft → submitted → in-review → published / rejected 流转。
 */
export type PublishState = 'draft' | 'submitted' | 'in-review' | 'published' | 'rejected'

/**
 * 内容元数据 —— 每个内容条目（项目、博客、相片等）在异步断言中携带的基础字段。
 * 静态适配器 (`adapters/static.ts`) 将 `DEFAULT_META` 注入每一条静态数据，
 * 使 UI 层始终有 `author` / `publishState` 可用，避免适配器切换时造成 NPE。
 */
export interface ContentMeta {
  /** 内容作者标识。默认值 `'tim'`，UGC 场景下扩展为外部用户 id。 */
  author: string
  /** 发布状态。Studio 侧读取此字段决定是否在索引页展示。 */
  publishState: PublishState
  /** ISO-8601 创建时间戳，可选。静态数据暂不填充。 */
  createdAt?: string
  /** ISO-8601 最近更新时间戳，可选。 */
  updatedAt?: string
}

/** 将 ContentMeta 附加到任意类型 T 上，作为内容条目的完整类型。 */
export type WithMeta<T> = T & ContentMeta

/** 默认元数据常量 —— 静态适配器的注入基础值。UGC 适配器将覆盖 author/publishState。 */
export const DEFAULT_META: ContentMeta = {
  author: 'tim',
  publishState: 'published',
}

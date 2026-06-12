/**
 * @description 内容层单一类型入口 —— UI 组件从此处消费所有类型，不直接触及 `src/data/*.ts`。
 *   landing 专属的数据类型仍从 `../data/*` 重导出；跨 landing/studio 的共享契约
 *   （PublishState / ContentMeta / WithMeta / DEFAULT_META，即每条内容携带的
 *   author / publishState 元字段）的唯一定义在 @timcai/content ——
 *   此处只 re-export，不得本地重新定义（2026-06-11 之前这里有一份已分叉的本地副本：
 *   缺 'approved' 态、字段也不一致）。
 * @dependencies `../data/*` 的类型重导出 + @timcai/content（workspace 包）
 */
export type * from '../data/projects'
export type * from '../data/frames'
export type * from '../data/life'
export type * from '../data/about'
export type * from '../data/skills'

export type { ContentMeta, PublishState, WithMeta } from '@timcai/content'
export { defaultMeta as DEFAULT_META } from '@timcai/content'

/**
 * @description 内容集合的仓储契约 (Repository Pattern) —— 解耦数据源与 UI 渲染。
 *   实际定义已下沉到 @timcai/content 的 KeyedCollectionRepository（landing/studio 共享）：
 *   `all()` 为同步打包数据 —— landing 用同步渲染避免 GSAP/ScrollTrigger 初始测量时的空帧闪烁；
 *   `list()` / `get()` 为异步契约 —— 未来 MDX/DB/UGC 适配器按此接口实现，
 *   返回附带 ContentMeta 的条目。此文件仅 re-export，保持 landing 内部 import 路径稳定。
 * @dependencies @timcai/content（workspace 包）
 */
export type { KeyedCollectionRepository as CollectionRepository } from '@timcai/content'

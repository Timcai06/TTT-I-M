/**
 * @description 静态内容适配器 —— 实现已下沉到 @timcai/content 的
 *   createKeyedStaticRepository（landing/studio 共用一份工厂逻辑），
 *   此文件仅保持 landing 内部的适配器 import 路径稳定。
 * @dependencies @timcai/content（workspace 包）
 */
export { createKeyedStaticRepository as createStaticRepository } from '@timcai/content'

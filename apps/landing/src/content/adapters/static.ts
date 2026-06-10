import { DEFAULT_META, type WithMeta } from '../schema'
import type { CollectionRepository } from '../repositories'

/**
 * @description 静态内容适配器，把仓库内手写数组包装成 landing 统一 CollectionRepository
 * @dependencies DEFAULT_META、CollectionRepository 契约和调用方传入的 getId
 * @performance all() 同步零拷贝返回原数组，避免 landing 首帧内容等待异步数据；list/get 仅为未来适配器保持异步形态
 * @caveats all() 返回原始数组引用，组件层不要修改；未来接 MDX/API/DB 时保持同一 repository 接口即可
 */
export function createStaticRepository<T>(
  items: T[],
  getId: (item: T) => string,
): CollectionRepository<T> {
  const withMeta = (item: T): WithMeta<T> => ({ ...item, ...DEFAULT_META })

  return {
    all: () => items,
    list: () => Promise.resolve(items.map(withMeta)),
    get: (id) => {
      const found = items.find((item) => getId(item) === id)
      return Promise.resolve(found ? withMeta(found) : undefined)
    },
  }
}

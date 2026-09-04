interface ChapterTransitionOptions {
  updateHash?: boolean
}

/** 章节转场请求载荷。由 Nav/Footer 等发出，由 ChapterTransition 统一消费。 */
export interface ChapterTransitionRequest {
  /** 目标章节 id，必须对应 DOM 中的 section id。 */
  id: string
  /** 是否同步更新 URL hash；内部滚动可关闭，用户主动导航应开启。 */
  updateHash: boolean
}

// Typed in-module emitter — the same pattern as lib/stage.ts. Previously this
// rode two stringly-named window events ('portfolio:chapter-*') with detail
// casts at every listener; the typed listener sets remove that global channel
// while keeping the exact same public API for every caller. The chapter-state
// build guard pins this transport choice.
const transitionListeners = new Set<(request: ChapterTransitionRequest) => void>()
const arrivedListeners = new Set<(id: string) => void>()
let pendingTransition: ChapterTransitionRequest | null = null

/**
 * @description 发起一次章节跳转请求。
 *   这里只通知订阅者，不直接滚动；真正的快门动画、Lenis 冻结和 scrollToChapter 由 `ChapterTransition` 组件协调。
 * @dependencies `onChapterTransitionRequest` 注册的 listener 集合
 * @performance / @caveats 保持事件总线薄层，避免 Nav/Footer 等入口各自复制转场逻辑。
 */
export function transitionToChapter(id: string, options: ChapterTransitionOptions = {}) {
  const request: ChapterTransitionRequest = {
    id,
    updateHash: options.updateHash ?? false,
  }
  if (transitionListeners.size === 0) {
    // The transition renderer is an eagerly-requested lazy chunk. Retain the
    // latest user intent until its subscription is live so a slow first chunk
    // fetch can never swallow navigation.
    pendingTransition = request
    return
  }
  transitionListeners.forEach((listener) => listener(request))
}

/**
 * @description 订阅章节转场请求。
 * @dependencies `transitionToChapter`
 * @performance / @caveats 返回 unsubscribe，React effect cleanup 必须调用，避免热更新/重挂载重复触发转场。
 */
export function onChapterTransitionRequest(
  callback: (request: ChapterTransitionRequest) => void
) {
  transitionListeners.add(callback)
  const pending = pendingTransition
  pendingTransition = null
  if (pending) {
    queueMicrotask(() => {
      if (transitionListeners.has(callback)) {
        callback(pending)
      } else if (!pendingTransition) {
        pendingTransition = pending
      }
    })
  }
  return () => {
    transitionListeners.delete(callback)
  }
}

/**
 * @description 通知某章节已经完成滚动落点。
 *   Hero、pretext、右侧进度等需要在“已经到达”之后重置局部状态。
 * @dependencies `ChapterTransition` 的 onLand 回调
 */
export function dispatchChapterArrived(id: string) {
  arrivedListeners.forEach((listener) => listener(id))
}

/**
 * @description 订阅章节到达通知。
 * @dependencies `dispatchChapterArrived`
 * @performance / @caveats 通知只表达“到达”，不表达动画进行中状态；进行中状态请读取 `stage`。
 */
export function onChapterArrived(callback: (id: string) => void) {
  arrivedListeners.add(callback)
  return () => {
    arrivedListeners.delete(callback)
  }
}

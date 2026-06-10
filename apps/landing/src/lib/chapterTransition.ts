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

const CHAPTER_TRANSITION_EVENT = 'portfolio:chapter-transition'
export const CHAPTER_ARRIVED_EVENT = 'portfolio:chapter-arrived'

/**
 * @description 发起一次章节跳转请求。
 *   这里只派发事件，不直接滚动；真正的快门动画、Lenis 冻结和 scrollToChapter 由 `ChapterTransition` 组件协调。
 * @dependencies 浏览器 CustomEvent、`ChapterTransition` 组件中的事件监听器
 * @performance / @caveats 保持事件总线薄层，避免 Nav/Footer 等入口各自复制转场逻辑。
 */
export function transitionToChapter(id: string, options: ChapterTransitionOptions = {}) {
  window.dispatchEvent(new CustomEvent<ChapterTransitionRequest>(CHAPTER_TRANSITION_EVENT, {
    detail: {
      id,
      updateHash: options.updateHash ?? false,
    },
  }))
}

/**
 * @description 订阅章节转场请求事件。
 * @dependencies `transitionToChapter`
 * @performance / @caveats 返回 unsubscribe，React effect cleanup 必须调用，避免热更新/重挂载重复触发转场。
 */
export function onChapterTransitionRequest(
  callback: (request: ChapterTransitionRequest) => void
) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<ChapterTransitionRequest>).detail)
  }

  window.addEventListener(CHAPTER_TRANSITION_EVENT, listener)
  return () => window.removeEventListener(CHAPTER_TRANSITION_EVENT, listener)
}

/**
 * @description 通知某章节已经完成滚动落点。
 *   Hero、pretext、右侧进度等需要在“已经到达”之后重置局部状态。
 * @dependencies `ChapterTransition` 的 onLand 回调
 */
export function dispatchChapterArrived(id: string) {
  window.dispatchEvent(new CustomEvent<string>(CHAPTER_ARRIVED_EVENT, { detail: id }))
}

/**
 * @description 订阅章节到达事件。
 * @dependencies `dispatchChapterArrived`
 * @performance / @caveats 事件只表达“到达”，不表达动画进行中状态；进行中状态请读取 `stage`。
 */
export function onChapterArrived(callback: (id: string) => void) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<string>).detail)
  }

  window.addEventListener(CHAPTER_ARRIVED_EVENT, listener)
  return () => window.removeEventListener(CHAPTER_ARRIVED_EVENT, listener)
}

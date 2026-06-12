import { Component, type ErrorInfo, type ReactNode } from 'react'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'

/**
 * @description 章节级错误边界 —— 任何一章的渲染错误或懒加载 chunk 拉取失败
 *   (弱网下最常见) 只塌掉该章节，而不是卸载整棵 React 树造成全页白屏。
 *   与 ParticlePortrait 内部的 CanvasErrorBoundary 同哲学：静默降级，不打断其余体验。
 * @dependencies requestScrollRefresh —— 章节塌掉会改变文档高度，
 *   所有 pinned/scrubbed ScrollTrigger 的 start/end 需要重新测量
 * @caveats 错误只 console.warn 不上报；fallback 为 null（章节消失），
 *   因为任何占位 UI 都会破坏滚动叙事的视觉连续性
 */
export default class ChapterBoundary extends Component<
  { chapterId: string; children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false }

  static getDerivedStateFromError() {
    return { errored: true }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn(`[chapter:${this.props.chapterId}] collapsed after render error`, err, info.componentStack)
    // The collapsed chapter changes document height — re-measure every
    // ScrollTrigger so the remaining chapters keep correct pin ranges.
    requestScrollRefresh(true)
  }

  render() {
    return this.state.errored ? null : this.props.children
  }
}

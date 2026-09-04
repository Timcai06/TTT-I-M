import { Component, createRef, type ErrorInfo, type ReactNode } from 'react'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'

interface ChapterBoundaryProps {
  chapterId: string
  children: ReactNode
  fallbackMinHeight: string
}

interface ChapterBoundaryState {
  errored: boolean
}

/**
 * Chapter errors stay local, visible, measurable and recoverable. The boundary
 * continuously records the chapter's last real height so a late runtime error
 * cannot collapse every downstream ScrollTrigger range.
 */
export default class ChapterBoundary extends Component<
  ChapterBoundaryProps,
  ChapterBoundaryState
> {
  state: ChapterBoundaryState = { errored: false }
  private readonly rootRef = createRef<HTMLDivElement>()
  private mutationObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private observedChapter: Element | null = null
  private lastKnownHeight = 0

  static getDerivedStateFromError(): ChapterBoundaryState {
    return { errored: true }
  }

  componentDidMount() {
    const root = this.rootRef.current
    if (root && typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => this.observeChapter())
      this.mutationObserver.observe(root, { childList: true, subtree: false })
    }
    this.observeChapter()
  }

  componentDidUpdate() {
    this.observeChapter()
  }

  componentWillUnmount() {
    this.mutationObserver?.disconnect()
    this.resizeObserver?.disconnect()
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.resizeObserver?.disconnect()
    this.observedChapter = null
    // Error telemetry is never part of the critical app chunk. Loading it only
    // on an actual chapter failure also guarantees that analytics failure can
    // neither delay nor replace this boundary's recoverable DOM fallback.
    void import('@vercel/analytics/react')
      .then(({ track }) => track('Chapter Render Error', {
        chapter: this.props.chapterId,
        errorName: error.name,
      }))
      .catch(() => undefined)
    try {
      globalThis.reportError?.(error)
    } catch {
      // Browser error reporting is best-effort and may be policy-blocked.
    }
    if (import.meta.env.DEV) {
      console.error(`[chapter:${this.props.chapterId}] render failed`, error, info.componentStack)
    }
    try {
      requestScrollRefresh(true)
    } catch {
      // The fallback remains stable even if the scroll runtime is unavailable.
    }
  }

  private observeChapter = () => {
    if (this.state.errored) return
    const chapter = this.rootRef.current?.firstElementChild ?? null
    if (chapter === this.observedChapter) return
    this.resizeObserver?.disconnect()
    this.observedChapter = chapter
    if (!chapter) return

    const recordHeight = () => {
      const height = Math.ceil(chapter.getBoundingClientRect().height)
      if (height > 0) this.lastKnownHeight = height
    }
    recordHeight()
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(recordHeight)
      this.resizeObserver.observe(chapter)
    }
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.errored) {
      return (
        <div
          ref={this.rootRef}
          className="chapter-boundary chapter-boundary--failed"
          data-chapter-error={this.props.chapterId}
          style={{ minHeight: this.lastKnownHeight > 0 ? `${this.lastKnownHeight}px` : this.props.fallbackMinHeight }}
        >
          <section id={this.props.chapterId} className="chapter-error" role="alert">
            <p className="chapter-error__label">CHAPTER INTERRUPTED</p>
            <p className="chapter-error__message">This chapter could not be rendered safely.</p>
            <button type="button" className="chapter-error__retry" onClick={this.reload}>
              Reload experience
            </button>
          </section>
        </div>
      )
    }

    return (
      <div ref={this.rootRef} className="chapter-boundary">
        {this.props.children}
      </div>
    )
  }
}

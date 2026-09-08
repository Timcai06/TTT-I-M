import { Component, type ReactNode } from 'react'

/** A failed deferred chunk must leave an explicit path back to the project list. */
export default class CaseStudyBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <div className="project-dialog__loading" role="alert">
      <p>项目详情暂时无法加载。</p>
      <button type="button" onClick={() => window.location.reload()}>重新加载</button>{' '}
      <button type="button" onClick={this.props.onClose}>返回项目</button>
    </div>
  }
}

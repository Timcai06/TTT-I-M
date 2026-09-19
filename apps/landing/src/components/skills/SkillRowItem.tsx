import type { SkillRow } from '../../content'

/**
 * @description 单行简历技术栈 —— 序号 / 分类 / 技术标签。
 *   Frame → Stack 交接后保持稳定渲染；本组件不持有重复入场动画状态。
 * @dependencies content 层的 SkillRow 契约
 */
export default function SkillRowItem({ row, compact = false }: { row: SkillRow; compact?: boolean }) {
  if (compact) {
    const featured: Record<string, string[]> = {
      '/02': ['Git / GitHub', 'Docker', 'Linux', 'CI/CD'],
      '/05': ['GSAP', 'Three.js', 'Lenis', 'Motion', 'Typography'],
      '/06': ['PostgreSQL', 'pgvector', 'PyTorch', 'RAG'],
    }
    const visibleTags = featured[row.index] ?? row.tags.slice(0, 5)
    return (
      <details className="skill-row skill-row--compact">
        <summary>
          <span className="skill-row__index">{row.index.replace('/', '')}</span>
          <span className="skill-row__main">
            <span className="skill-row__name">{row.name}</span>
            <span className="skill-row__tags">{visibleTags.map(tag => <span key={tag}>{tag}</span>)}</span>
          </span>
          <img className="skill-row__expand" src="/design/approved-2d/chevron-right.svg" width="12" height="12" alt="" aria-hidden="true" />
        </summary>
        <div className="skill-row__detail">
          <span className="skill-row__eyebrow">{row.subtitle}</span>
          <div className="skill-row__tags">{row.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        </div>
      </details>
    )
  }
  return (
    <div className="skill-row">
      <div className="skill-row__index">{row.index}</div>
      <div className="skill-row__main">
        <div className="skill-row__eyebrow">{row.subtitle}</div>
        <h3 className="skill-row__name">{row.name}</h3>
      </div>
      <div className="skill-row__meta">
        <div className="skill-row__tags">
          {row.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

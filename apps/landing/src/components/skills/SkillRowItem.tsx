import type { SkillRow } from '../../content'

/**
 * @description 单行简历技术栈 —— 序号 / 分类 / 技术标签。
 *   `.is-visible` 入场 class 由 Skills 的 reveal effect 控制，此组件不持有动画状态。
 * @dependencies content 层的 SkillRow 契约
 */
export default function SkillRowItem({ row }: { row: SkillRow }) {
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

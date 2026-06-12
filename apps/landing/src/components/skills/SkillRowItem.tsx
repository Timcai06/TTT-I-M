import { scrollToChapter } from '../../lib/chapterScroll'
import type { SkillRow } from '../../content'

/**
 * @description 单行技能领域的纯展示组件 —— 序号 / 领域名 / 描述 / 标签 / 落地项目链接。
 *   `.is-visible` 入场 class 由 Skills 的 reveal effect 控制，此组件不持有动画状态。
 * @dependencies scrollToChapter（"shipped in" 标签跳转对应章节）、content 层的 SkillRow 契约
 */
export default function SkillRowItem({ row }: { row: SkillRow }) {
  return (
    <div className="skill-row">
      <div className="skill-row__index">{row.index}</div>
      <div className="skill-row__main">
        <div className="skill-row__eyebrow">{row.subtitle}</div>
        <h3 className="skill-row__name">{row.name}</h3>
        <p className="skill-row__desc">{row.description}</p>
      </div>
      <div className="skill-row__meta">
        <div className="skill-row__tags">
          {row.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="skill-row__used">
          <span className="skill-row__used-label">shipped in</span>
          {row.usedIn.map((item) =>
            item.to ? (
              <button
                type="button"
                key={item.label}
                className="skill-row__used-link"
                onClick={() => scrollToChapter(item.to as string, { updateHash: true })}
              >
                {item.label}
              </button>
            ) : (
              <span key={item.label} className="skill-row__used-item">
                {item.label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}

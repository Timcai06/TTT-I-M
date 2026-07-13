/** 关于页统计数据项 —— 显示在 About 章节底部的事实数字卡片。 */
export interface AboutFact {
  /** 统计数值，如 `'10+'`、`'6'`。 */
  value: string
  /** 数值说明标签，如 `'Public repos'`。 */
  label: string
}

export const facts: AboutFact[] = [
  { value: '63', label: 'Recorded ML runs' },
  { value: '159K+', label: 'Indexed papers' },
  { value: '6', label: 'Systems shipped' },
]

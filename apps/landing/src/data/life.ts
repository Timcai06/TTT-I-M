/** Life 章节照片条目。用于 bento gallery 和移动端 in-flow 图片卡片。 */
export interface LifePhoto {
  /** public 目录下的图片路径。为空时 LifeGallery 渲染 placeholder。 */
  src: string
  /** 图片语义描述；同时作为 `<img alt>`，需保留中文场景含义。 */
  alt: string
}

export const photos: LifePhoto[] = [
  { src: '/life/football-action.webp', alt: '球场 · 运球' },
  { src: '/life/night-portrait.webp', alt: '冬夜 · 街头' },
  { src: '/life/football-portrait.webp', alt: '中场 · 沉思' },
  { src: '/life/shanghai-skyline.webp', alt: '上海 · 天际线' },
  { src: '/life/team-photo.webp', alt: '球队 · 合照' },
  { src: '/life/life-scene-2.webp', alt: '夜场 · 队友' },
  { src: '/life/life-casual.webp', alt: '日常 · 随拍' },
]

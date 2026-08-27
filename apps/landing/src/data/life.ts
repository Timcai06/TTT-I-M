/** Life 章节照片条目。用于 bento gallery 和移动端 in-flow 图片卡片。 */
export type LifePhotoTone = 'warm' | 'cool' | 'neutral' | 'dark'

export interface LifePhoto {
  /** public 目录下的图片路径。为空时 LifeGallery 渲染 placeholder。 */
  src: string
  /** 图片语义描述；同时作为 `<img alt>`，需保留中文场景含义。 */
  alt: string
  /** 仅用于跨列编排色温，不对原图施加人工染色。 */
  tone: LifePhotoTone
}

export const photos: LifePhoto[] = [
  { src: '/life/football-action.webp', alt: '球场 · 运球', tone: 'dark' },
  { src: '/life/night-portrait.webp', alt: '冬夜 · 街头', tone: 'dark' },
  { src: '/life/football-portrait.webp', alt: '中场 · 沉思', tone: 'dark' },
  { src: '/life/shanghai-skyline.webp', alt: '上海 · 天际线', tone: 'cool' },
  { src: '/life/team-photo.webp', alt: '球队 · 合照', tone: 'dark' },
  { src: '/life/life-scene-2.webp', alt: '夜场 · 队友', tone: 'dark' },
  { src: '/life/life-casual.webp', alt: '日常 · 随拍', tone: 'neutral' },
  { src: '/frame/buildings/03-720.webp', alt: '庭院 · 木门', tone: 'warm' },
  { src: '/frame/buildings/14-720.webp', alt: '上海 · 夜色', tone: 'cool' },
  { src: '/frame/scenery/scenery-02-720.webp', alt: '窗景 · 绿意', tone: 'neutral' },
  { src: '/frame/scenery/scenery-05-720.webp', alt: '校园 · 深秋', tone: 'warm' },
  { src: '/frame/scenery/scenery-09-720.webp', alt: '远行 · 天光', tone: 'cool' },
  { src: '/frame/cuisine/cuisine-04-720.webp', alt: '餐桌 · 汉堡', tone: 'warm' },
  { src: '/frame/cuisine/cuisine-12-720.webp', alt: '餐桌 · 热食', tone: 'warm' },
]

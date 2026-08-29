import { frameImageSources } from './frameImageSources.generated'

/**
 * Frame 章节的类型体系 —— 摄影存档网格的完整数据契约。
 * 结构层级：ArchiveTheme (主题) → ArchiveCluster (集群) → ArchiveSlot (槽位) → ArchiveImage (图片)。
 * @dependencies Frame 组件 + frame/ 子组件消费此类型树；`frameImageSources.generated.ts` 提供响应式 srcSet 与真实尺寸
 * @caveats 图片尺寸由 Sharp 在资产准备阶段生成；新增照片后需运行 setup-assets，
 *   manifest 缺少对应主图时 Frame 会快速失败，避免用错误比例渲染。
 */
export type ArchiveThemeId = 'building' | 'cuisine' | 'scenery'

/** 水平滚动方向：从左往右（奇数主题）或从右往左（偶数主题），交错形成蛇形浏览节奏。 */
export type ArchiveDirection = 'left-to-right' | 'right-to-left'

/** 集群布局算法 —— 决定 slot 在视口中的空间分配模式。 */
export type ArchiveClusterLayout =
  | 'feature-left'    // 主图左，辅图右
  | 'feature-right'   // 主图右，辅图左
  | 'stack-left'       // 垂直堆叠，靠左
  | 'stack-right'      // 垂直堆叠，靠右
  | 'panorama'         // 全景横跨
  | 'mosaic-left'      // 马赛克网格，左对齐
  | 'mosaic-right'     // 马赛克网格，右对齐

/** 槽位在集群中的视觉权重角色。 */
export type ArchiveSlotRole = 'primary' | 'secondary' | 'detail' | 'support'

/** 图片宽高比分类，影响布局中的占位形状。 */
export type ArchiveOrientation = 'portrait' | 'landscape' | 'square' | 'wide' | 'tall'

/** 集群视觉节奏 —— 影响图片间距、重叠度和留白密度。 */
export type ArchiveClusterRhythm = 'architectural' | 'dense' | 'balanced' | 'open'

/** 槽位的微调偏移 —— 在布局基准之上做 px 级微调和轻微缩放，制造非对称的有机感。 */
export interface ArchiveSlotOffset {
  /** 水平偏移量 (px)，正值 = 右移。 */
  x?: number
  /** 垂直偏移量 (px)，正值 = 下移。 */
  y?: number
  /** 缩放因子，0.9 = 缩小为 90%。 */
  scale?: number
}

/**
 * 单张存档图片的完整元数据。
 * srcSet / sizes 由 `frameImageSources.generated.ts` 在构建时自动生成，提供多分辨率响应式变体。
 */
export interface ArchiveImage {
  id: number
  src: string
  /** 响应式 srcSet 属性（自动生成的多分辨率候选 URL 字符串）。 */
  srcSet: string
  /** 响应式 sizes 属性。 */
  sizes: string
  width: number
  height: number
  title: string
  location: string
  meta: string
  /** 宽高比分类。 */
  orientation: ArchiveOrientation
  /** 色调分类，用于 CSS 滤镜或叠加层配色。 */
  tone: string
}

/** 集群中的一个槽位 —— 将一张图片绑定到视觉角色 + 可选的微调偏移。 */
export interface ArchiveClusterSlot {
  role: ArchiveSlotRole
  image: ArchiveImage
  offset?: ArchiveSlotOffset
}

/**
 * 一个图片集群 —— Frame 水平滚动中的单个视觉组块。
 * 每个集群独立选择布局算法和节奏，彼此之间通过滚动自然分隔。
 */
export interface ArchiveCluster {
  id: string
  title: string
  body?: string
  layout: ArchiveClusterLayout
  rhythm: ArchiveClusterRhythm
  slots: ArchiveClusterSlot[]
}

/** 一个摄影主题 —— Frame 章节的最大粒度分组，包含开头文本 + 滚动方向 + 所有集群。 */
export interface ArchiveTheme {
  id: ArchiveThemeId
  /** 分类 eyebrow（如 `01 / Buildings`）。 */
  eyebrow: string
  title: string
  body: string
  /** 水平滚动方向。 */
  direction: ArchiveDirection
  clusters: ArchiveCluster[]
}

/** 纯文本面板 —— Frame 章节开头 (intro) 与结尾 (outro) 各一个。 */
export interface ArchiveTextPanel {
  eyebrow: string
  title: string
  body: string
}

const FRAME_IMAGE_SIZES = '(max-width: 768px) calc(100vw - 32px), (max-width: 1200px) 72vw, 640px'

/**
 * @description 将构建期生成的响应式图片清单转换为 `<img srcSet>` 字符串。
 *   Frame 章节运行时只消费稳定的 src/srcSet/sizes 元数据，不在组件内计算图片变体。
 * @dependencies `frameImageSources.generated.ts` 由资产脚本生成，key 必须与原始 `src` 完全一致
 * @performance / @caveats 若生成清单缺失，直接回退到原始 src；这样新增图片不会导致页面崩溃，
 *   但会失去响应式多尺寸收益，需要后续补跑资产生成脚本。
 */
function frameSrcSet(src: string): string {
  const sources = frameImageSources[src as keyof typeof frameImageSources]

  if (!sources?.length) {
    return src
  }

  return sources.map((source) => `${source.src} ${source.width}w`).join(', ')
}

/** 从生成清单读取主图真实尺寸，供布局和按需 Lightbox 共用。 */
function frameDimensions(src: string): readonly [number, number] {
  const sources = frameImageSources[src as keyof typeof frameImageSources]
  const original = sources?.find((source) => source.src === src)

  if (!original) {
    throw new Error(`Missing frame image metadata for ${src}`)
  }

  return [original.width, original.height]
}

/**
 * @description 构造单张 Frame 存档图片的标准元数据对象。
 *   该函数把人工维护的摄影语义（title/location/meta/tone）和构建生成的响应式字段合并，
 *   让 Frame 子组件只依赖 `ArchiveImage`，不关心图片资源来源。
 * @dependencies `frameSrcSet`、`frameDimensions`、`FRAME_IMAGE_SIZES`、`ArchiveOrientation`
 * @performance / @caveats width/height 来自 Sharp manifest；Frame 布局依赖它们避免裁切、漂移和 caption 错位。
 * @steps
 *   step1: 接收图片 id、路径和语义字段
 *   step2: 通过生成清单读取响应式候选集与真实尺寸
 *   step3: 返回 ArchiveImage，供 theme/cluster/slot 结构复用
 */
function frameImage({
  id,
  src,
  title,
  location,
  meta,
  orientation,
  tone,
}: {
  id: number
  src: string
  title: string
  location: string
  meta: string
  orientation: ArchiveOrientation
  tone: string
}): ArchiveImage {
  const [width, height] = frameDimensions(src)

  return {
    id,
    src,
    srcSet: frameSrcSet(src),
    sizes: FRAME_IMAGE_SIZES,
    width,
    height,
    title,
    location,
    meta,
    orientation,
    tone,
  }
}

const b = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => frameImage({
  id,
  src: `/frame/buildings/${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Shanghai / Architecture',
  meta: 'Light, structure, and urban texture',
  orientation,
  tone,
})

const c = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => frameImage({
  id,
  src: `/frame/cuisine/cuisine-${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Table / Cuisine',
  meta: 'Food, table light, and daily detail',
  orientation,
  tone,
})

const s = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => frameImage({
  id,
  src: `/frame/scenery/scenery-${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Travel / Scenery',
  meta: 'Open air, distance, and atmosphere',
  orientation,
  tone,
})

export const archiveIntro: ArchiveTextPanel = {
  eyebrow: 'Frame / Visual Archive',
  title: 'Frames of living systems.',
  body: 'Architecture, table scenes, and open landscapes collected as three separate visual movements.',
}

export const archiveThemes: ArchiveTheme[] = [
  {
    id: 'building',
    eyebrow: '01 / Building',
    title: 'Structure holds the first rhythm.',
    body: 'Facades, skylines, routes, and night edges become four composed observations of the city.',
    direction: 'right-to-left',
    clusters: [
      {
        id: 'building-surface-memory',
        title: 'Surface Memory',
        body: 'Walls, doorways, stone, and lantern edges open the city as material memory before the skyline appears.',
        layout: 'mosaic-left',
        rhythm: 'architectural',
        slots: [
          { role: 'primary', image: b(1, 'Shadow Wall', 'portrait', 'old-wall'), offset: { y: -10, scale: 0.98 } },
          { role: 'secondary', image: b(3, 'Green Doorway', 'portrait', 'heritage'), offset: { x: 10, y: 18, scale: 0.92 } },
          { role: 'detail', image: b(4, 'Raking Stone', 'portrait', 'detail'), offset: { x: -4, y: -18, scale: 0.9 } },
          { role: 'support', image: b(8, 'Lantern Facade', 'tall', 'detail'), offset: { x: 16, y: -6, scale: 0.9 } },
          { role: 'support', image: b(11, 'Weathered Geometry', 'landscape', 'detail'), offset: { x: -12, y: 12, scale: 0.94 } },
        ],
      },
      {
        id: 'building-skyline-weather',
        title: 'Skyline Weather',
        body: 'The view pulls back into block, glow, and weather, where distance turns structure into atmosphere.',
        layout: 'panorama',
        rhythm: 'open',
        slots: [
          { role: 'primary', image: b(2, 'Night Blocks', 'wide', 'night-city'), offset: { y: 14, scale: 0.96 } },
          { role: 'secondary', image: b(9, 'Framed Skyline', 'landscape', 'skyline'), offset: { x: -10, y: -30, scale: 0.9 } },
          { role: 'detail', image: b(10, 'Afterglow Blocks', 'landscape', 'sunset'), offset: { x: 14, y: 18, scale: 0.9 } },
        ],
      },
      {
        id: 'building-interior-routes',
        title: 'Interior Routes',
        body: 'Stairs, alleys, arches, and concrete passages make the archive move through the inside of the city.',
        layout: 'mosaic-right',
        rhythm: 'dense',
        slots: [
          { role: 'primary', image: b(13, 'Arches At Night', 'landscape', 'night-city'), offset: { y: 18, scale: 0.97 } },
          { role: 'secondary', image: b(5, 'Brick Stair', 'landscape', 'interior'), offset: { x: -16, y: -16, scale: 0.9 } },
          { role: 'detail', image: b(6, 'Narrow Alley', 'landscape', 'alley'), offset: { x: 10, y: 18, scale: 0.9 } },
          { role: 'support', image: b(12, 'Lit Descent', 'landscape', 'stair'), offset: { x: -8, y: 4, scale: 0.94 } },
          { role: 'support', image: b(16, 'Concrete Quiet', 'landscape', 'minimal'), offset: { x: 12, y: -16, scale: 0.92 } },
        ],
      },
      {
        id: 'building-night-current',
        title: 'Night Current',
        body: 'At night the city becomes a current of glass, neon, crossings, and mechanical light.',
        layout: 'mosaic-left',
        rhythm: 'balanced',
        slots: [
          { role: 'primary', image: b(7, 'Gold Riverfront', 'wide', 'skyline'), offset: { y: -18, scale: 0.96 } },
          { role: 'secondary', image: b(14, 'Rooftop Neon', 'landscape', 'night-city'), offset: { x: 14, y: 8, scale: 0.9 } },
          { role: 'detail', image: b(15, 'Table Light', 'portrait', 'interior'), offset: { x: -10, y: -20, scale: 0.9 } },
          { role: 'support', image: b(17, 'Urban Machinery', 'landscape', 'industrial'), offset: { x: 10, y: -2, scale: 0.92 } },
          { role: 'support', image: b(18, 'Night Crossing', 'portrait', 'street'), offset: { x: -18, y: 20, scale: 0.9 } },
        ],
      },
    ],
  },
  {
    id: 'cuisine',
    eyebrow: '02 / Cuisine',
    title: 'The table enters from the left.',
    body: 'Food, plates, cups, and warm fragments form a closer daily register.',
    direction: 'left-to-right',
    clusters: [
      { id: 'cuisine-table', title: 'Table Opening', layout: 'feature-left', rhythm: 'dense', slots: [
        { role: 'primary', image: c(1, 'Table Opening', 'portrait', 'table'), offset: { y: 16, scale: 0.96 } },
        { role: 'secondary', image: c(2, 'Small Plate', 'landscape', 'plate'), offset: { x: 10, y: -16, scale: 0.9 } },
        { role: 'detail', image: c(3, 'Glass Detail', 'portrait', 'glass'), offset: { x: -10, y: 22, scale: 0.9 } },
      ] },
      { id: 'cuisine-stack', title: 'Warm Stack', layout: 'stack-left', rhythm: 'dense', slots: [
        { role: 'primary', image: c(6, 'Warm Dish', 'portrait', 'dish'), offset: { y: -12, scale: 0.94 } },
        { role: 'secondary', image: c(4, 'Shared Bite', 'tall', 'detail'), offset: { x: -12, y: 16, scale: 0.92 } },
        { role: 'detail', image: c(5, 'Table Corner', 'portrait', 'table'), offset: { x: 12, y: -18, scale: 0.92 } },
      ] },
      { id: 'cuisine-menu', title: 'Dinner Menu', layout: 'feature-right', rhythm: 'balanced', slots: [
        { role: 'primary', image: c(9, 'Dinner Light', 'landscape', 'dinner'), offset: { y: 18, scale: 0.96 } },
        { role: 'secondary', image: c(7, 'Plate Study', 'portrait', 'plate'), offset: { x: -10, y: -18, scale: 0.9 } },
        { role: 'detail', image: c(8, 'Cup Shadow', 'portrait', 'glass'), offset: { x: 16, y: 14, scale: 0.9 } },
      ] },
      { id: 'cuisine-close', title: 'Close Table', layout: 'stack-right', rhythm: 'dense', slots: [
        { role: 'primary', image: c(12, 'Aftertaste', 'portrait', 'table'), offset: { y: -10, scale: 0.95 } },
        { role: 'secondary', image: c(10, 'Dish Detail', 'landscape', 'dish'), offset: { x: 12, y: 18, scale: 0.92 } },
        { role: 'detail', image: c(11, 'Soft Table Light', 'portrait', 'detail'), offset: { x: -12, y: -20, scale: 0.9 } },
      ] },
      { id: 'cuisine-service', title: 'Shared Service', layout: 'feature-left', rhythm: 'balanced', slots: [
        { role: 'primary', image: c(13, 'Shared Service', 'landscape', 'table'), offset: { y: 14, scale: 0.96 } },
        { role: 'secondary', image: c(14, 'Sauce Detail', 'portrait', 'detail'), offset: { x: 14, y: -14, scale: 0.9 } },
        { role: 'detail', image: c(15, 'Quiet Cup', 'portrait', 'glass'), offset: { x: -10, y: 20, scale: 0.9 } },
      ] },
      { id: 'cuisine-night', title: 'Late Table', layout: 'feature-right', rhythm: 'open', slots: [
        { role: 'primary', image: c(18, 'Late Table', 'portrait', 'dinner'), offset: { y: -18, scale: 0.94 } },
        { role: 'secondary', image: c(16, 'Small Dish', 'portrait', 'dish'), offset: { x: -12, y: 16, scale: 0.9 } },
        { role: 'detail', image: c(17, 'Table Texture', 'portrait', 'detail'), offset: { x: 14, y: -12, scale: 0.9 } },
      ] },
      { id: 'cuisine-tail', title: 'Last Bite', layout: 'stack-left', rhythm: 'balanced', slots: [
        { role: 'primary', image: c(21, 'Last Bite', 'landscape', 'table'), offset: { y: 12, scale: 0.95 } },
        { role: 'secondary', image: c(19, 'Plate Ending', 'portrait', 'plate'), offset: { x: -10, y: -16, scale: 0.9 } },
        { role: 'detail', image: c(20, 'Warm Fragment', 'portrait', 'detail'), offset: { x: 18, y: 20, scale: 0.9 } },
      ] },
    ],
  },
  {
    id: 'scenery',
    eyebrow: '03 / Scenery',
    title: 'Open air slows the archive down.',
    body: 'Landscapes and travel fragments give the section its final breath.',
    direction: 'right-to-left',
    clusters: [
      { id: 'scenery-panorama', title: 'Open Distance', layout: 'panorama', rhythm: 'open', slots: [
        { role: 'primary', image: s(1, 'Open Distance', 'landscape', 'open-air'), offset: { y: -10, scale: 1.0 } },
        { role: 'secondary', image: s(2, 'Window Green', 'portrait', 'detail'), offset: { x: 12, y: 18, scale: 0.98 } },
      ] },
      { id: 'scenery-memory', title: 'Travel Memory', layout: 'feature-left', rhythm: 'open', slots: [
        { role: 'primary', image: s(3, 'Travel Light', 'square', 'travel'), offset: { y: 18, scale: 1.0 } },
        { role: 'secondary', image: s(4, 'Quiet Field', 'landscape', 'field'), offset: { x: 10, y: -20, scale: 0.98 } },
        { role: 'detail', image: s(5, 'Autumn Passage', 'square', 'horizon'), offset: { x: -14, y: 12, scale: 0.98 } },
      ] },
      { id: 'scenery-release', title: 'Wide Release', layout: 'feature-right', rhythm: 'open', slots: [
        { role: 'primary', image: s(8, 'Wide Release', 'landscape', 'release'), offset: { y: -16, scale: 1.0 } },
        { role: 'secondary', image: s(6, 'Slow Road', 'square', 'path'), offset: { x: -14, y: 16, scale: 0.98 } },
        { role: 'detail', image: s(7, 'Air Detail', 'landscape', 'air'), offset: { x: 12, y: -14, scale: 0.98 } },
      ] },
      { id: 'scenery-close', title: 'Final Horizon', layout: 'panorama', rhythm: 'open', slots: [
        { role: 'primary', image: s(11, 'Final Horizon', 'landscape', 'horizon'), offset: { y: 12, scale: 1.0 } },
        { role: 'secondary', image: s(9, 'Soft Distance', 'landscape', 'distance'), offset: { x: 14, y: -18, scale: 0.98 } },
        { role: 'detail', image: s(10, 'Quiet Detail', 'landscape', 'detail'), offset: { x: -12, y: 18, scale: 0.98 } },
      ] },
    ],
  },
]

export const archiveOutro: ArchiveTextPanel = {
  eyebrow: 'Next',
  title: 'Back to building systems.',
  body: 'After the archive, the page returns to stack, tools, and shipped projects.',
}

export const archiveClusters = archiveThemes.flatMap((theme) => theme.clusters)
export const archiveImages = archiveClusters.flatMap((cluster) => cluster.slots.map((slot) => slot.image))

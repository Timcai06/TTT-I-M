import { archiveImages, photos, projects } from '../../content'
import {
  loadFonts,
  loadHeroTexture,
  loadImage,
  loadLiquidMetalSource,
  loadResponsiveImage,
  loadPretext,
  loadSparkBadgeSource,
  preloadLazyChapters,
} from './loaders'

// SCOPE = LANDING. This manifest covers only the bounded, curated landing asset
// set. The future blog / work / UGC zones grow without bound and must NOT be
// added here — they load lazily / via SSR. (See plan/00-principles.md.)

/** 资源加载阶段：critical 准备运行时，visual 准备当前设备会展示的视觉资源。 */
export type ResourceTier = 'critical' | 'visual'
/** 资源成本分类，用于调试 preload 进度和定位卡顿来源。 */
export type ResourceType = 'image' | 'font' | 'texture' | 'chunk' | 'particles'

/**
 * @description landing preloadController 可执行的资源任务，区分开屏 gate 和后台预热两类加载
 */
export interface ResourceTask {
  /** 稳定唯一 id，用于进度统计、错误定位和 build guard 检查 */
  id: string
  /** 面向 loading UI / 调试日志的资源名称 */
  label: string
  /** critical 先执行；visual 下载并解码完成后共同构成 render-ready */
  tier: ResourceTier
  /** 资源类型，用于理解成本来源：image/font/texture/chunk/particles */
  type: ResourceType
  /** 实际加载函数；必须响应 signal，确保超时或卸载不会留下孤儿下载/解码任务 */
  load: (signal: AbortSignal) => Promise<void>
}

/**
 * @description 对资源 URL 去重并过滤空值，保证 manifest 进度不会被重复图片虚高
 */
function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

/**
 * @description 从 responsive srcSet 中提取实际候选 URL，让 loader 能覆盖不同 DPR/viewport 的图片变体
 * @dependencies 依赖标准 srcSet 逗号分隔格式，如 "/a.webp 640w, /a@2x.webp 1280w"
 * @caveats 这里只提取 URL，不解析宽度描述符；浏览器最终选择仍由 img.sizes/srcset 自己决定
 */
/**
 * @description 收集 landing 有边界的静态图片集合，供 render-ready 队列下载并解码
 * @dependencies 依赖 frame archiveImages、life photos、project shots、Hero texture 和 About portrait
 * @caveats 只收 landing curated assets；blog/work/studio 的无界内容不能加入这里，避免 loader 变成 CMS 全站爬虫
 */
function collectImageUrls() {
  const projectUrls = projects.flatMap((project) =>
    project.media?.shots.flatMap((shot) => [shot.src]) ?? []
  )

  return unique([
    '/portrait/about_me.jpg',
    '/noise/grain-128.png',
    '/projects/sciscope/sciscope-film-poster.jpg',
    ...photos.map((photo) => photo.src),
    ...projectUrls,
  ])
}

/**
 * The whole-site preload manifest, in load order.
 *
 * `critical` runs first (hero texture, fonts, Pretext, lazy chapter chunks).
 * `visual` is the bounded visual set. Loader waits for the complete manifest.
 * Static images and exactly one
 * browser-selected responsive candidate per Frame image are downloaded and
 * decoded before hand-off. The SciScope film itself remains click-to-play; only
 * its poster participates in render-ready so the original audio/video rhythm is
 * not turned into a boot-time tax.
 */
export function buildResourceManifest(): ResourceTask[] {
  const critical: ResourceTask[] = [
    { id: 'chunks:pretext', label: 'Pretext', tier: 'critical', type: 'chunk', load: loadPretext },
    { id: 'texture:hero', label: 'hero texture', tier: 'critical', type: 'texture', load: loadHeroTexture },
    { id: 'fonts:document', label: 'fonts', tier: 'critical', type: 'font', load: loadFonts },
    { id: 'chunks:chapters', label: 'chapters', tier: 'critical', type: 'chunk', load: preloadLazyChapters },
  ]

  const staticImages: ResourceTask[] = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    label: src,
    tier: 'visual',
    type: 'image',
    load: (signal) => loadImage(src, { decode: 'eager', fetchPriority: 'auto', loading: 'eager' }, signal),
  }))

  const interactiveVisuals: ResourceTask[] = [
    {
      id: 'shader:liquid-metal',
      label: 'Liquid Metal control',
      tier: 'visual',
      type: 'chunk',
      load: loadLiquidMetalSource,
    },
    {
      id: 'renderer:spark-badge',
      label: 'Stack to Work renderer',
      tier: 'visual',
      type: 'particles',
      load: loadSparkBadgeSource,
    },
  ]

  const responsiveImages: ResourceTask[] = archiveImages.map((image) => ({
    id: `responsive-image:${image.src}`,
    label: image.src,
    tier: 'visual',
    type: 'image',
    load: (signal) => loadResponsiveImage(image, {
      decode: 'eager',
      fetchPriority: 'auto',
      loading: 'eager',
    }, signal),
  }))

  return [...critical, ...interactiveVisuals, ...staticImages, ...responsiveImages]
}

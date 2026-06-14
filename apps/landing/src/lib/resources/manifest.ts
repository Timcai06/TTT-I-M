import { archiveImages } from '../../data/frames'
import { photos } from '../../data/life'
import { projects } from '../../data/projects'
import {
  HERO_TEXTURE,
  loadFonts,
  loadHeroTexture,
  loadImage,
  loadPretext,
  preloadLazyChapters,
} from './loaders'

// SCOPE = LANDING. This manifest covers only the bounded, curated landing asset
// set. The future blog / work / UGC zones grow without bound and must NOT be
// added here — they load lazily / via SSR. (See plan/00-principles.md.)

/** 资源加载层级：critical 阻塞 Loader 退场，deferred 只做后台预热。 */
export type ResourceTier = 'critical' | 'deferred'
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
  /** critical 会阻塞 loader 退出；deferred 在面板退出后继续后台加载 */
  tier: ResourceTier
  /** 资源类型，用于理解成本来源：image/font/texture/chunk/particles */
  type: ResourceType
  /** 实际加载函数；成功 resolve，失败由 preloadController 记录但不应让页面永久卡死 */
  load: () => Promise<void>
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
function srcSetUrls(srcSet: string) {
  return srcSet
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
}

/**
 * @description 收集 landing 有边界的静态图片集合，供 deferred preload 队列后台预热
 * @dependencies 依赖 frame archiveImages、life photos、project shots、Hero texture 和 About portrait
 * @caveats 只收 landing curated assets；blog/work/studio 的无界内容不能加入这里，避免 loader 变成 CMS 全站爬虫
 */
function collectImageUrls() {
  const frameUrls = archiveImages.flatMap((image) => [
    image.src,
    ...srcSetUrls(image.srcSet),
  ])

  const projectUrls = projects.flatMap((project) =>
    project.media?.shots.flatMap((shot) => [shot.src]) ?? []
  )

  return unique([
    HERO_TEXTURE,
    '/portrait/about_me.jpg',
    ...photos.map((photo) => photo.src),
    ...projectUrls,
    ...frameUrls,
  ])
}

/**
 * The whole-site preload manifest, in load order.
 *
 * `critical` runs first (hero texture, fonts, Pretext, lazy chapter chunks)
 * and is the intro-exit gate: 100% on the loader bar = runtime ready.
 * `deferred` is every curated image; it keeps
 * eager-fetching through the concurrency queue *after* the panel exits
 * (00-principles whole-site-preheat fix ②: same total download, smaller
 * black-screen gate). Frame DOM images stay eager-fetch as the second line of
 * defense against pop-in on a fast scroll into Frame.
 */
export function buildResourceManifest(): ResourceTask[] {
  const critical: ResourceTask[] = [
    { id: 'chunks:pretext', label: 'Pretext', tier: 'critical', type: 'chunk', load: loadPretext },
    { id: 'texture:hero', label: 'hero texture', tier: 'critical', type: 'texture', load: loadHeroTexture },
    { id: 'fonts:document', label: 'fonts', tier: 'critical', type: 'font', load: loadFonts },
    { id: 'chunks:chapters', label: 'chapters', tier: 'critical', type: 'chunk', load: preloadLazyChapters },
  ]

  const deferred: ResourceTask[] = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    label: src,
    tier: 'deferred',
    type: 'image',
    load: () => loadImage(src, { decode: 'idle', fetchPriority: 'low', loading: 'eager' }),
  }))

  return [...critical, ...deferred]
}

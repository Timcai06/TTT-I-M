import { archiveImages, photos, projects } from '../../content'
import { archiveDownloadFraction } from './downloadProgress'
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

/**
 * Ceiling for the heavy prewarms (room, chapter pages, film/sound).
 *
 * This is a hang-breaker, not a quality gate. A shorter value turns "slow" into
 * "failed" and silently costs the visitor the room: personal-space.glb is 22.9 MB,
 * which is 96s on a 237 KB/s path, so any deadline near that drops the 3D archive
 * on exactly the connections that were going to get there eventually. Waiting is
 * the intended trade — the room is the product, not an optional flourish.
 *
 * It stays finite only so a genuinely stalled socket cannot strand the intro the
 * way it used to. A real network error still rejects immediately and is handled
 * by the reading-fallback classification, without waiting for this at all.
 */
const PREWARM_DEADLINE_MS = 600_000

/**
 * Image prewarm deadline. The generic 12s network default was set for a fast
 * path; sharing bandwidth with the room means individual images legitimately
 * take longer, and dropping them there is what left photographs popping in
 * after the intro had already promised they were ready.
 */
const IMAGE_DEADLINE_MS = 90_000

/** 资源加载阶段：critical 准备运行时，visual 准备当前设备会展示的视觉资源。 */
export type ResourceTier = 'critical' | 'visual'
/** 资源成本分类，用于调试 preload 进度和定位卡顿来源。 */
export type ResourceType = 'image' | 'font' | 'texture' | 'chunk' | 'particles'

/**
 * @description landing preloadController 可执行的资源任务，区分开屏 gate 和后台预热两类加载
 */
export interface ResourceTask {
  timeoutMs?: number
  /**
   * An enhancement rather than something the reader needs. The six semantic
   * chapters are complete DOM without any of these, so their failure must drop
   * to reading mode instead of stranding the intro behind a retry panel.
   */
  optional?: boolean
  /** 稳定唯一 id，用于进度统计、错误定位和 build guard 检查 */
  id: string
  /** 面向 loading UI / 调试日志的资源名称 */
  label: string
  /** critical 先执行；visual 下载并解码完成后共同构成 render-ready */
  tier: ResourceTier
  /** 资源类型，用于理解成本来源：image/font/texture/chunk/particles */
  type: ResourceType
  /**
   * Share of the intro this task represents. The bar used to divide by task
   * count, so ~55 quick image fetches carried it into the nineties while the
   * 22.9 MB room — one task — held it there for the rest of the wait. Weights
   * are in units of one average preloaded image (~0.23 MB).
   */
  weight?: number
  /** 0-1 while running, for tasks large enough that finishing is too coarse. */
  progress?: () => number
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
    ...(!matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches ? archiveImages.map((image) => image.src) : []),
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
 * decoded before hand-off. Desktop also prepares full-size photography, the
 * finite film/sound assets and the retained room GPU runtime before revealing.
 * Playback still requires a visitor gesture.
 */
export function buildResourceManifest(): ResourceTask[] {
  const critical: ResourceTask[] = [
    { id: 'chunks:pretext', weight: 3, label: 'Pretext', tier: 'critical', type: 'chunk', load: loadPretext },
    { id: 'texture:hero', weight: 4, label: 'hero texture', tier: 'critical', type: 'texture', load: loadHeroTexture },
    { id: 'fonts:document', weight: 6, label: 'fonts', tier: 'critical', type: 'font', load: loadFonts },
    { id: 'chunks:chapters', weight: 8, label: 'chapters', tier: 'critical', type: 'chunk', load: preloadLazyChapters },
  ]

  // Prewarm, not the only load path: every one of these is an <img> the browser
  // will fetch on its own when the chapter renders. Losing the prewarm costs
  // pop-in on a fast scroll; it must never hold the door shut.
  const staticImages: ResourceTask[] = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    optional: true,
    label: src,
    tier: 'visual',
    type: 'image',
    timeoutMs: IMAGE_DEADLINE_MS,
    load: (signal) => loadImage(src, { decode: 'eager', fetchPriority: 'auto', loading: 'eager' }, signal),
  }))

  const interactiveVisuals: ResourceTask[] = [
    ...(!matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches ? [{
      id: 'renderer:personal-archive', optional: true, weight: 98, progress: archiveDownloadFraction, label: 'Preparing your room', tier: 'visual' as const, type: 'texture' as const,
      timeoutMs: PREWARM_DEADLINE_MS,
      load: async (signal: AbortSignal) => {
        const { prepareArchiveRuntime } = await import('../../components/personal-archive/archiveRuntime')
        await prepareArchiveRuntime(signal)
        await import('../../components/personal-archive/PersonalArchiveSurface')
      },
    }, {
      id: 'layout:chapter-pages', optional: true, weight: 8, label: 'Preparing chapters', tier: 'visual' as const, type: 'chunk' as const,
      // The room runtime and this task both wait for the five real chapter
      // previews. On a cold cache their image decode can legitimately outlive
      // the generic 12 s network deadline while the 19 MB room is compiling.
      timeoutMs: PREWARM_DEADLINE_MS,
      load: async (signal: AbortSignal) => { const { prepareChapterPages } = await import('./prepareChapterPages'); await prepareChapterPages(signal) },
    }, {
      id: 'media:site', optional: true, weight: 28, label: 'Preparing films and sound', tier: 'visual' as const, type: 'texture' as const,
      timeoutMs: PREWARM_DEADLINE_MS,
      load: async (signal: AbortSignal) => { const { prepareSiteMedia } = await import('./mediaCache'); await prepareSiteMedia(signal) },
    }, {
      id: 'chunks:interactions', optional: true, weight: 3, label: 'Preparing project details', tier: 'visual' as const, type: 'chunk' as const,
      load: async () => { await Promise.all([
        import('../../chapters/projects/ProjectCaseDialog'), import('../../chapters/projects/ProjectCaseContent'),
        import('../../chapters/projects/ProjectMetrics'), import('../../shared/media/openImageLightbox'),
        import('photoswipe/lightbox'), import('photoswipe'),
      ]) },
    }] : []),
    {
      id: 'shader:liquid-metal',
      optional: true,
      label: 'Liquid Metal control',
      tier: 'visual',
      type: 'chunk',
      load: loadLiquidMetalSource,
    },
    {
      id: 'renderer:spark-badge',
      optional: true,
      label: 'Stack to Work renderer',
      tier: 'visual',
      type: 'particles',
      load: loadSparkBadgeSource,
    },
  ]

  const responsiveImages: ResourceTask[] = archiveImages.map((image) => ({
    id: `responsive-image:${image.src}`,
    optional: true,
    label: image.src,
    tier: 'visual',
    type: 'image',
    timeoutMs: IMAGE_DEADLINE_MS,
    load: (signal) => loadResponsiveImage(image, {
      decode: 'eager',
      fetchPriority: 'auto',
      loading: 'eager',
    }, signal),
  }))

  return [...critical, ...interactiveVisuals, ...staticImages, ...responsiveImages]
}

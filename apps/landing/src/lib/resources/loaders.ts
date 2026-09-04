import { preloadLazyChapters } from '../../chapters/registry'
import { preloadLiquidMetalButtonSource } from '../../shaders/liquid-metal-button/liquidMetalSource'
import {
  portfolioSparkBadgeUrl,
  resolveSparkBadgeSource,
} from '../../shaders/spark-badge/sparkBadgeSource'
import { enqueueImageDecode } from './imageDecodeQueue'

// 资源类型加载器集中在这里；未来 KTX2、Draco、Meshopt GLTF 只需新增 loader 和 manifest entry。
/** Hero 粒子肖像使用的源照片路径，同时用于 preload manifest 和 texture cache 预热。 */
export const HERO_TEXTURE = '/portrait/tim.jpg'
const FONT_READY_DEV_TIMEOUT_MS = 6000
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
type ImageDecodeMode = 'eager' | 'idle' | 'none'

/**
 * 单张图片预加载选项。
 * 这里同时控制网络优先级、浏览器 loading hint 和 decode 策略。
 */
interface LoadImageOptions {
  /** 解码策略：render-ready 用 eager，滚动邻近预热用 idle，纯预取可用 none。 */
  decode?: ImageDecodeMode
  /** 浏览器 fetch priority hint；critical hero/frame 资源可设 high。 */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** 原生 loading hint；预加载 Image 对象仍显式设置，便于浏览器调度。 */
  loading?: 'eager' | 'lazy'
}

function signalError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason
  return new Error(signal.reason ? String(signal.reason) : 'Resource load aborted')
}

function awaitWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signalError(signal))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signalError(signal))
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

async function decodeLoadedImage(
  image: HTMLImageElement,
  label: string,
  decode: ImageDecodeMode,
  signal?: AbortSignal,
): Promise<void> {
  if (decode === 'eager' && typeof image.decode === 'function') {
    try {
      await image.decode()
    } catch (error) {
      if (import.meta.env.DEV && !signal?.aborted) {
        console.warn(`[resources] eager image decode rejected for ${label}`, error)
      }
    }
  } else if (decode === 'idle') {
    await enqueueImageDecode(image, signal).catch((error: unknown) => {
      if (signal?.aborted) throw error
    })
  }
}

function loadConfiguredImage(
  label: string,
  options: Required<Pick<LoadImageOptions, 'decode' | 'fetchPriority' | 'loading'>>,
  startRequest: (image: HTMLImageElement) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    let completing = false
    let settled = false

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', onAbort)
    }
    const succeed = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const onAbort = () => {
      if (settled) return
      cleanup()
      image.srcset = ''
      image.src = EMPTY_IMAGE
      fail(signal ? signalError(signal) : new Error('Resource load aborted'))
    }
    const complete = async () => {
      if (settled || completing) return
      completing = true
      try {
        await decodeLoadedImage(image, image.currentSrc || label, options.decode, signal)
      } catch (error) {
        completing = false
        fail(error instanceof Error ? error : new Error(String(error)))
        return
      }
      completing = false
      if (signal?.aborted) onAbort()
      else succeed()
    }

    if (signal?.aborted) {
      fail(signalError(signal))
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    image.decoding = 'async'
    image.loading = options.loading
    image.fetchPriority = options.fetchPriority
    image.onload = () => { void complete() }
    image.onerror = () => fail(new Error(`Failed to preload image: ${label}`))
    try {
      startRequest(image)
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)))
      return
    }

    if (image.complete) {
      if (image.naturalWidth <= 0) fail(new Error(`Failed to preload image: ${label}`))
      else void complete()
    }
  })
}

/** 浏览器响应式图片选择所需的最小属性集合。 */
export interface ResponsiveImageSource {
  sizes: string
  src: string
  srcSet: string
}

/**
 * @description 预加载单张图片，并按策略执行 eager / idle / none 解码。
 *   Loader manifest 通过该函数统一处理静态视觉图片，避免各组件各自抢网络/解码资源。
 * @dependencies
 *   - 浏览器 `Image` 构造器、`image.decode`
 *   - `enqueueImageDecode` 空闲解码队列
 *   - `import.meta.env.DEV` 控制开发期 decode warning
 * @performance / @caveats
 *   - eager decode 只应给 critical 图使用；大量 eager decode 会形成 B2 “decode 风暴”。
 *   - idle decode 会等待一次空闲解码尝试后再 resolve，但 decode reject 仍非致命，因为 onload 已证明图片可绘制。
 *   - `image.complete` 分支处理内存/HTTP cache 命中，避免已完成图片永远等待 onload。
 * @steps
 *   step1: 创建 Image 并设置 decoding/loading/fetchPriority
 *   step2: onload 后根据 decode 策略执行 eager 或 idle decode
 *   step3: decode 失败仅 DEV warning 或静默跳过，最终 resolve
 *   step4: onerror 或 complete 但 naturalWidth<=0 时 reject
 */
export function loadImage(src: string, {
  decode = 'none',
  fetchPriority = 'low',
  loading = 'lazy',
}: LoadImageOptions = {}, signal?: AbortSignal): Promise<void> {
  return loadConfiguredImage(
    src,
    { decode, fetchPriority, loading },
    (image) => { image.src = src },
    signal,
  )
}

/**
 * @description 让浏览器依据当前 viewport、DPR 与 sizes 从 srcSet 中只选择一个真实候选，
 *   并在任务完成前下载、解码该候选。这样 Loader 预热的 URL 与页面 `<img>` 最终使用的
 *   `currentSrc` 一致，不会再把 720/1080/原图三个版本全部下载。
 * @dependencies 原生 responsive image selection (`srcset` + `sizes`) 与 `loadImage` 相同的解码策略
 * @performance / @caveats 属性顺序很重要：必须先写 sizes/srcset，最后写 src，避免浏览器先请求 fallback。
 */
export function loadResponsiveImage({ sizes, src, srcSet }: ResponsiveImageSource, {
  decode = 'eager',
  fetchPriority = 'auto',
  loading = 'eager',
}: LoadImageOptions = {}, signal?: AbortSignal): Promise<void> {
  return loadConfiguredImage(
    src,
    { decode, fetchPriority, loading },
    (image) => {
      image.sizes = sizes
      image.srcset = srcSet
      image.src = src
    },
    signal,
  )
}

/**
 * @description 等待字体系统就绪。生产环境直接等待 `document.fonts.ready`；
 *   开发环境增加 6000ms 安全超时，避免本地字体加载异常导致 Loader 永久停住。
 * @dependencies CSS Font Loading API (`document.fonts.ready`)
 * @performance / @caveats DEV 超时只 warning 并继续；生产不设置额外 timer，保持浏览器原生字体门控语义。
 */
export function loadFonts(signal: AbortSignal): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (signal.aborted) return Promise.reject(signalError(signal))
  if (import.meta.env.DEV) {
    // Race fonts.ready against a dev safety timeout, but clear the timer when
    // fonts win so the warning only fires when fonts genuinely stall (the old
    // version left the timer running and logged a false warning every load).
    return new Promise<void>((resolve, reject) => {
      let settled = false
      const cleanup = () => signal.removeEventListener('abort', onAbort)
      const finish = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        cleanup()
        resolve()
      }
      const onAbort = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        cleanup()
        reject(signalError(signal))
      }
      const timer = window.setTimeout(() => {
        if (settled) return
        console.warn(`[resources] document.fonts.ready exceeded ${FONT_READY_DEV_TIMEOUT_MS}ms in dev; continuing with current font fallback.`)
        finish()
      }, FONT_READY_DEV_TIMEOUT_MS)
      signal.addEventListener('abort', onAbort, { once: true })
      void document.fonts.ready.then(finish)
    })
  }
  return awaitWithSignal(document.fonts.ready.then(() => undefined), signal)
}

/**
 * @description 预热 Hero 粒子肖像使用的原始照片资源。
 *   这里只做网络/解码缓存预热，不持有 GPU texture；真正的 GPU 上传由 `ParticlePortrait` 的 textureCache 管理。
 * @dependencies Three.js `TextureLoader`
 * @performance / @caveats loadAsync 成功后立即 dispose，是为了保持 WebGL “卸载释放显存”的设计边界。
 */
export function loadHeroTexture(signal: AbortSignal): Promise<void> {
  return loadImage(HERO_TEXTURE, {
    decode: 'eager',
    fetchPriority: 'high',
    loading: 'eager',
  }, signal)
}

/**
 * @description 预加载 pretext 文字互动库 chunk，减少 intro / chapter transition 首次启用时的延迟。
 * @dependencies `@chenglou/pretext`
 * @performance / @caveats 只加载模块，不初始化 glyph；真实 DOM 测量仍由对应 hook 在可见时执行。
 */
export function loadPretext(signal: AbortSignal): Promise<void> {
  return awaitWithSignal(import('@chenglou/pretext').then(() => undefined), signal)
}

/** Preload the source-authored Work CTA document and its self-hosted font. */
export function loadLiquidMetalSource(signal: AbortSignal): Promise<void> {
  return preloadLiquidMetalButtonSource(signal).then(() => undefined)
}

/** Preload the source-authored Stack → Work renderer into the HTTP cache. */
export async function loadSparkBadgeSource(signal: AbortSignal): Promise<void> {
  const browserSceneUrl = resolveSparkBadgeSource(portfolioSparkBadgeUrl, 'browser')
  const response = await fetch(browserSceneUrl, { cache: 'force-cache', signal })
  if (!response.ok) throw new Error(`Spark Badge source failed: ${response.status}`)
  await response.text()
}

export { preloadLazyChapters }

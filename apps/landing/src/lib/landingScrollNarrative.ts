import { pickActiveChapterId, type ChapterRectSnapshot } from './activeChapter.ts'
import { computeChapterProgressFills, getChapterProgressSegmentEnd } from './chapterProgress.ts'
import { getChapterTheme, type ChapterTheme } from './chapterThemeTokens.ts'

export interface LandingScrollNarrative {
  activeId: string
  fromId: string
  toId: string
  blend: number
  progressFills: number[]
  theme: ChapterTheme
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function parseHexChannel(hex: string, start: number) {
  return Number.parseInt(hex.slice(start, start + 2), 16)
}

function mixHexColor(from: string, to: string, blend: number) {
  const amount = clamp01(blend)
  const red = Math.round(parseHexChannel(from, 1) + (parseHexChannel(to, 1) - parseHexChannel(from, 1)) * amount)
  const green = Math.round(parseHexChannel(from, 3) + (parseHexChannel(to, 3) - parseHexChannel(from, 3)) * amount)
  const blue = Math.round(parseHexChannel(from, 5) + (parseHexChannel(to, 5) - parseHexChannel(from, 5)) * amount)

  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function mixTheme(fromId: string, toId: string, blend: number): ChapterTheme {
  const from = getChapterTheme(fromId)
  const to = getChapterTheme(toId)

  if (fromId === toId) return from

  return {
    bg: mixHexColor(from.bg, to.bg, blend),
    cover: mixHexColor(from.cover, to.cover, blend),
  }
}

function resolveSegmentBlend(rects: ChapterRectSnapshot[], viewportHeight: number) {
  if (rects.length === 0) {
    return { fromId: 'hero', toId: 'hero', blend: 0 }
  }

  const scrollLine = 0

  for (const [index, rect] of rects.entries()) {
    const next = rects[index + 1]
    const segmentEnd = getChapterProgressSegmentEnd(rect, next, viewportHeight)

    if (rect.top <= scrollLine && segmentEnd > scrollLine) {
      const distance = Math.max(1, segmentEnd - rect.top)
      return {
        fromId: rect.id,
        toId: next?.id ?? rect.id,
        blend: clamp01((scrollLine - rect.top) / distance),
      }
    }
  }

  const first = rects[0]
  const last = rects.at(-1)
  if (first && first.top > scrollLine) {
    return { fromId: first.id, toId: first.id, blend: 0 }
  }

  return {
    fromId: last?.id ?? 'hero',
    toId: last?.id ?? 'hero',
    blend: 1,
  }
}

/**
 * @description 从同一批章节 rect 快照派生全页滚动叙事状态。
 *   这是 landing 的全局滚动坐标层：右侧进度条、背景色温、Continuum 星团和 nav
 *   都应消费这里的结果，而不是各自重新判断章节。
 * @dependencies `activeChapter`、`chapterProgress`、`chapterThemeTokens`
 * @performance / @caveats 纯函数，不读取 DOM；所有布局成本必须留在 `chapterScrollMetrics` 的单 ScrollTrigger 源。
 * @steps
 * step1: 用中心线规则得到离散 activeId，保证 nav 的章节语义稳定
 * step2: 用顶部像素线计算当前段 from/to/blend，保证视觉状态随滚轮 scrub
 * step3: 复用同一段坐标计算右侧进度 fills
 * step4: 根据 from/to/blend 混合章节主题色，供背景和粒子统一消费
 */
export function resolveLandingScrollNarrative(
  rects: ChapterRectSnapshot[],
  viewportHeight: number,
  fallbackId: string
): LandingScrollNarrative {
  const safeViewportHeight = Math.max(0, viewportHeight)
  const activeId = rects.length === 0 || safeViewportHeight <= 0
    ? fallbackId
    : pickActiveChapterId(rects, safeViewportHeight, fallbackId)
  const segment = safeViewportHeight <= 0
    ? { fromId: activeId, toId: activeId, blend: 0 }
    : resolveSegmentBlend(rects, safeViewportHeight)

  return {
    activeId,
    fromId: segment.fromId,
    toId: segment.toId,
    blend: segment.blend,
    progressFills: safeViewportHeight <= 0 ? rects.map(() => 0) : computeChapterProgressFills(rects, safeViewportHeight),
    theme: mixTheme(segment.fromId, segment.toId, segment.blend),
  }
}

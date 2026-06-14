import type { SimBehavior } from './simulation.ts'
import { getContinuumForm, type ContinuumFormId } from './forms/registry.ts'
import { getChapterTheme } from '../chapterThemeTokens.ts'
import type { LandingScrollNarrative } from '../landingScrollNarrative.ts'

export interface ContinuumScrollState {
  formId: ContinuumFormId
  morph: number
  opacity: number
  tint: string
  behavior: SimBehavior
  xOffsetRatio: number
  yOffset: number
}

const ambientOpacity: Record<string, number> = {
  about: 0.08,
  frame: 0.1,
  skills: 0.05,
  projects: 0.065,
  contact: 0.08,
}

const ambientBehavior: SimBehavior = {
  stiffness: 1.15,
  turbulence: 0.32,
  damping: 0.935,
  noiseScale: 0.88,
}

function getAmbientOpacity(id: string) {
  return ambientOpacity[id] ?? 0.06
}

function resolveNarrativeOpacity(narrative: LandingScrollNarrative) {
  const fromOpacity = narrative.fromId === 'hero' ? 0 : getAmbientOpacity(narrative.fromId)
  const toOpacity = narrative.toId === 'hero' ? 0 : getAmbientOpacity(narrative.toId)
  return fromOpacity + (toOpacity - fromOpacity) * narrative.blend
}

/**
 * @description M0 连续体滚动状态解析器。当前保留 Hero 原 `ParticlePortrait` 为主视觉，
 *   因此 Continuum 在 hero 阶段 opacity=0；后续章节只作为低亮红/暖色氛围层。
 * @dependencies 读取 `forms/registry.ts` 的 portrait 参数；章节主题来自 landing narrative。
 * @performance / @caveats 这里不新增布局读取，不调用 getBoundingClientRect；
 *   只消费共享滚动叙事状态，避免干扰右侧进度条和章节判定。
 * @steps
 * step1: 固定 portrait 单形态，M0 morph 恒为 0
 * step2: hero 关闭 Continuum，保留原肖像粒子主体
 * step3: 非 hero 章节按当前滚动段混合透明度和主题 tint
 */
export function resolveContinuumScrollState(activeIdOrNarrative: string | LandingScrollNarrative): ContinuumScrollState {
  const portrait = getContinuumForm('portrait')
  const activeId = typeof activeIdOrNarrative === 'string'
    ? activeIdOrNarrative
    : activeIdOrNarrative.activeId

  if (typeof activeIdOrNarrative !== 'string') {
    const opacity = resolveNarrativeOpacity(activeIdOrNarrative)
    return {
      formId: 'portrait',
      morph: 0,
      opacity,
      tint: opacity <= 0 ? portrait.tint : activeIdOrNarrative.theme.cover,
      behavior: opacity <= 0 ? portrait.behavior : ambientBehavior,
      xOffsetRatio: opacity <= 0 ? 0.22 : 0.28,
      yOffset: opacity <= 0 ? 0.02 : 0.04,
    }
  }

  if (activeId === 'hero') {
    return {
      formId: 'portrait',
      morph: 0,
      opacity: 0,
      tint: portrait.tint,
      behavior: portrait.behavior,
      xOffsetRatio: 0.22,
      yOffset: 0.02,
    }
  }

  return {
    formId: 'portrait',
    morph: 0,
    opacity: getAmbientOpacity(activeId),
    tint: getChapterTheme(activeId).cover,
    behavior: ambientBehavior,
    xOffsetRatio: 0.28,
    yOffset: 0.04,
  }
}

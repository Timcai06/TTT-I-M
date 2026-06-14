import type { SimBehavior } from './simulation.ts'
import { getContinuumForm, type ContinuumFormId } from './forms/registry.ts'
import { getChapterTheme } from '../chapterThemeTokens.ts'
import type { LandingScrollNarrative } from '../landingScrollNarrative.ts'

export interface ContinuumScrollState {
  formId: ContinuumFormId
  morph: number
  opacity: number
  pointScale: number
  tint: string
  behavior: SimBehavior
  xOffsetRatio: number
  yOffset: number
}

const ambientOpacity: Record<string, number> = {
  about: 0.16,
  life: 0.16,
  frame: 0.17,
  skills: 0.07,
  projects: 0.085,
  contact: 0.09,
}

const pointScaleByForm: Record<ContinuumFormId, number> = {
  portrait: 1,
  disintegrate: 1.36,
  stardust: 1.38,
}

const formByChapter: Record<string, ContinuumFormId> = {
  about: 'disintegrate',
  life: 'stardust',
  frame: 'stardust',
  skills: 'stardust',
  projects: 'stardust',
  contact: 'portrait',
}

function getAmbientOpacity(id: string) {
  return ambientOpacity[id] ?? 0.06
}

function resolveNarrativeOpacity(narrative: LandingScrollNarrative) {
  const fromOpacity = narrative.fromId === 'hero' ? 0 : getAmbientOpacity(narrative.fromId)
  const toOpacity = narrative.toId === 'hero' ? 0 : getAmbientOpacity(narrative.toId)
  return fromOpacity + (toOpacity - fromOpacity) * narrative.blend
}

function resolveNarrativePointScale(narrative: LandingScrollNarrative) {
  const fromScale = pointScaleByForm[getChapterFormId(narrative.fromId)]
  const toScale = pointScaleByForm[getChapterFormId(narrative.toId)]
  return fromScale + (toScale - fromScale) * narrative.blend
}

function getChapterFormId(id: string): ContinuumFormId {
  return formByChapter[id] ?? 'portrait'
}

function toHexChannel(value: number) {
  return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')
}

export function getContinuumTintForCover(cover: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(cover)
  if (!match) return cover

  const value = match[1] ?? ''
  const lift = 0.24
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  return `#${toHexChannel(r + (255 - r) * lift)}${toHexChannel(g + (255 - g) * lift)}${toHexChannel(b + (255 - b) * lift)}`
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
    const formId = activeIdOrNarrative.activeId === 'hero'
      ? 'portrait'
      : getChapterFormId(activeIdOrNarrative.activeId)
    const form = getContinuumForm(formId)
    return {
      formId,
      morph: 0,
      opacity,
      pointScale: opacity <= 0 ? pointScaleByForm.portrait : resolveNarrativePointScale(activeIdOrNarrative),
      tint: opacity <= 0 ? portrait.tint : getContinuumTintForCover(activeIdOrNarrative.theme.cover),
      behavior: opacity <= 0 ? portrait.behavior : form.behavior,
      xOffsetRatio: opacity <= 0 ? 0.22 : 0.28,
      yOffset: opacity <= 0 ? 0.02 : 0.04,
    }
  }

  if (activeId === 'hero') {
    return {
      formId: 'portrait',
      morph: 0,
      opacity: 0,
      pointScale: pointScaleByForm.portrait,
      tint: portrait.tint,
      behavior: portrait.behavior,
      xOffsetRatio: 0.22,
      yOffset: 0.02,
    }
  }

  const formId = getChapterFormId(activeId)
  const form = getContinuumForm(formId)

  return {
    formId,
    morph: 0,
    opacity: getAmbientOpacity(activeId),
    pointScale: pointScaleByForm[formId],
    tint: getContinuumTintForCover(getChapterTheme(activeId).cover),
    behavior: form.behavior,
    xOffsetRatio: 0.28,
    yOffset: 0.04,
  }
}

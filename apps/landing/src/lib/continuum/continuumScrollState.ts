import type { SimBehavior } from './simulation.ts'
import { getContinuumForm, type ContinuumFormId } from './forms/registry.ts'
import type { LandingScrollNarrative } from '../landingScrollNarrative.ts'

export interface ContinuumScrollState {
  formId: ContinuumFormId
  fromFormId: ContinuumFormId
  toFormId: ContinuumFormId
  blendMode: 'additive' | 'normal'
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
  contact: 0.055,
}

const pointScaleByForm: Record<ContinuumFormId, number> = {
  portrait: 1,
  disintegrate: 1.36,
  stardust: 1.38,
  mathSurface: 1.18,
  gerstner: 1.08,
}

const formByChapter: Record<string, ContinuumFormId> = {
  about: 'disintegrate',
  life: 'stardust',
  frame: 'stardust',
  skills: 'stardust',
  projects: 'mathSurface',
  contact: 'gerstner',
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

function mixBehavior(fromId: string, toId: string, blend: number): SimBehavior {
  const amount = Math.min(1, Math.max(0, blend))
  const from = getContinuumForm(getChapterFormId(fromId)).behavior
  const to = getContinuumForm(getChapterFormId(toId)).behavior

  return {
    stiffness: from.stiffness + (to.stiffness - from.stiffness) * amount,
    turbulence: from.turbulence + (to.turbulence - from.turbulence) * amount,
    damping: from.damping + (to.damping - from.damping) * amount,
    noiseScale: from.noiseScale + (to.noiseScale - from.noiseScale) * amount,
    anchorStrength: from.anchorStrength + (to.anchorStrength - from.anchorStrength) * amount,
  }
}

function getChapterFormId(id: string): ContinuumFormId {
  return formByChapter[id] ?? 'portrait'
}

function resolveDominantFormId(narrative: LandingScrollNarrative): ContinuumFormId {
  if (narrative.activeId === 'hero' || narrative.fromId === 'hero') return 'portrait'
  return getChapterFormId(narrative.blend > 0.82 ? narrative.toId : narrative.fromId)
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
 *   因此 Continuum 在 hero 阶段 opacity=0；后续章节按同一滚动段混合透明度、色温、
 *   点大小和仿真行为，避免星云只在 activeId 翻转时突变。
 * @dependencies 读取 `forms/registry.ts` 的 portrait 参数；章节主题来自 landing narrative。
 * @performance / @caveats 这里不新增布局读取，不调用 getBoundingClientRect；
 *   只消费共享滚动叙事状态，避免干扰右侧进度条和章节判定。
 * @steps
 * step1: hero 固定 portrait 且 opacity=0，保留首页原肖像粒子主体
 * step2: 非 hero 章节按当前滚动段混合透明度、主题 tint、点大小和仿真行为
 * step3: 目标形态在滚动段后半程预切到下一章节，减少“停一下才变形”的感觉
 */
export function resolveContinuumScrollState(activeIdOrNarrative: LandingScrollNarrative): ContinuumScrollState {
  const portrait = getContinuumForm('portrait')

  const opacity = resolveNarrativeOpacity(activeIdOrNarrative)
  const formId = opacity <= 0 ? 'portrait' : resolveDominantFormId(activeIdOrNarrative)
  const fromFormId = opacity <= 0 || activeIdOrNarrative.fromId === 'hero'
    ? 'portrait'
    : getChapterFormId(activeIdOrNarrative.fromId)
  const toFormId = opacity <= 0 || activeIdOrNarrative.fromId === 'hero'
    ? 'portrait'
    : getChapterFormId(activeIdOrNarrative.toId)
  const dominantForm = getContinuumForm(formId)
  return {
    formId,
    fromFormId,
    toFormId,
    blendMode: dominantForm.blendMode,
    morph: fromFormId === toFormId ? 0 : activeIdOrNarrative.blend,
    opacity,
    pointScale: opacity <= 0 ? pointScaleByForm.portrait : resolveNarrativePointScale(activeIdOrNarrative),
    tint: opacity <= 0 ? portrait.tint : getContinuumTintForCover(activeIdOrNarrative.theme.cover),
    behavior: opacity <= 0 ? portrait.behavior : mixBehavior(activeIdOrNarrative.fromId, activeIdOrNarrative.toId, activeIdOrNarrative.blend),
    xOffsetRatio: opacity <= 0 ? 0.22 : 0.28,
    yOffset: opacity <= 0 ? 0.02 : 0.04,
  }
}

import { DataUtils, HalfFloatType, Vector3, type Object3D, type PerspectiveCamera, type WebGLRenderer } from 'three'
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'

// Authored chapter ink (matches --archive-ink / #292720 in natural-room.css) and the
// minimum WCAG contrast the calibrated paper must sustain against it.
const CHAPTER_INK: readonly [number, number, number] = [0x29, 0x27, 0x20]
// 9, not 7: the paper must also carry the *derived* tokens. --fg-dim is a blend toward the
// background, so guaranteeing only the pure ink leaves the weakest text at 3.58:1. At 9:1
// every authored foreground clears WCAG AA body text with margin.
const MIN_PAPER_CONTRAST = 9

function srgbChannelToLinear(c: number): number {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
}

function linearChannelToSrgb(c: number): number {
  const cs = Math.min(1, Math.max(0, c))
  return cs <= 0.0031308 ? cs * 12.92 : 1.055 * cs ** (1 / 2.4) - 0.055
}

/** WCAG relative luminance of an sRGB triple (0-255 channels each). Pure; unit-testable. */
export function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbChannelToLinear)
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG contrast ratio between two relative luminances. Pure; unit-testable. */
export function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

const CHAPTER_INK_LUMINANCE = relativeLuminance(CHAPTER_INK)

/**
 * The measured paper only validates that pixels were *readable*, not that the resulting
 * colour can carry the authored ink. If `rgb` can't sustain `minContrast` against the ink,
 * lighten it by lerping toward white in linear light -- an affine mix with a neutral colour,
 * which holds hue exactly and only desaturates -- until the contrast target is met.
 * Returns the input untouched (and `clamped: false`) when it already clears the bar.
 */
export function clampPaperForContrast(
  rgb: readonly [number, number, number],
  inkLuminance = CHAPTER_INK_LUMINANCE,
  minContrast = MIN_PAPER_CONTRAST,
): { rgb: [number, number, number]; clamped: boolean } {
  const linear = rgb.map(srgbChannelToLinear) as [number, number, number]
  const l0 = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  if (contrastRatio(l0, inkLuminance) >= minContrast) return { rgb: [rgb[0], rgb[1], rgb[2]], clamped: false }
  // Luminance is itself linear in the lerp-toward-white parameter t (both are affine
  // combinations with a neutral colour), so the target t solves in closed form. A small
  // margin absorbs the rounding when the result is re-quantised to integer 0-255 channels.
  const targetLuminance = Math.min(1, minContrast * (inkLuminance + 0.05) - 0.05 + 0.002)
  const t = Math.min(1, Math.max(0, (targetLuminance - l0) / (1 - l0)))
  const lightened = linear.map(c => c + t * (1 - c)) as [number, number, number]
  const out = lightened.map(c => Math.round(linearChannelToSrgb(c) * 255)) as [number, number, number]
  return { rgb: out, clamped: true }
}

/** Once per prepared room, use the displayed paper under the actual window light.
 * Read the output pass, never linear albedo or a repeatedly changing screen average.
 */
export function calibrateRoomPaper(renderer: WebGLRenderer, composer: EffectComposer, model: Object3D, camera: PerspectiveCamera) {
  const corners = ['TL', 'TR', 'BL'].map(s => model.getObjectByName(`AboutReading_${s}`)?.getWorldPosition(new Vector3()))
  const [tl, tr, bl] = corners
  if (!tl || !tr || !bl) throw new Error('Cannot calibrate missing book paper')
  const wasScreen = composer.renderToScreen
  try {
    composer.renderToScreen = false
    composer.render()
    const target = composer.readBuffer
    const samples: number[][] = []
    // Blank outer paper margin; avoid the portrait and printed text in the model.
    for (const u of [.035, .06, .085]) for (const v of [.16, .28, .4, .64, .78]) {
      const p = tl.clone().lerp(tr, u).add(bl.clone().sub(tl).multiplyScalar(v)).project(camera)
      const x = Math.round((p.x + 1) * .5 * (target.width - 1))
      const y = Math.round((p.y + 1) * .5 * (target.height - 1))
      if (x < 0 || y < 0 || x >= target.width || y >= target.height) continue
      const half = target.texture.type === HalfFloatType
      const pixel = half ? new Uint16Array(4) : new Uint8Array(4)
      renderer.readRenderTargetPixels(target, x, y, 1, 1, pixel)
      const rgb = [0, 1, 2].map(i => half ? DataUtils.fromHalfFloat(pixel[i]!) : pixel[i]! / 255)
      if (rgb.every(c => Number.isFinite(c) && c > .03 && c <= 1)) samples.push(rgb)
    }
    if (samples.length < 3) throw new Error('Room paper output was not readable')
    const median = [0, 1, 2].map(i => {
      const values = samples.map(s => s[i]!).sort((a, b) => a - b)
      return Math.round(values[Math.floor(values.length / 2)]! * 255)
    }) as [number, number, number]
    const { rgb, clamped } = clampPaperForContrast(median)
    const color = `rgb(${rgb.join(' ')})`
    const root = document.documentElement
    root.style.setProperty('--room-paper', color)
    root.dataset.roomPaper = color
    root.dataset.roomPaperSource = clamped ? 'lit-book-output-clamped' : 'lit-book-output'
  } finally {
    composer.renderToScreen = wasScreen
    renderer.setRenderTarget(null)
  }
}

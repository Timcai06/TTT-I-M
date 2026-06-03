/**
 * Turn a line (or two) of text into a cloud of particle target points, with no
 * DOM-per-glyph and no layout thrash: the text is laid out and rasterised once
 * on an offscreen 2D canvas, then the filled pixels are sampled on a grid. The
 * renderer (TextParticles) tweens particles between a scatter origin and these
 * targets. At the portfolio's text scale native `measureText` is instant, so
 * no pretext dependency is needed.
 */

export interface ParticleTarget {
  x: number
  y: number
}

export interface TextParticleField {
  width: number
  height: number
  targets: ParticleTarget[]
}

export interface TextParticleOptions {
  text: string
  /** Wrap width in CSS px. */
  maxWidth: number
  fontSize: number
  fontFamily: string
  fontWeight?: number | string
  /** Multiplier on fontSize for line spacing. */
  lineHeightRatio?: number
  /** Grid spacing (px) between samples — smaller = denser cloud. */
  sampleGap?: number
  /** Hard cap on particle count (random subsample beyond it). */
  maxTargets?: number
  /** Alpha (0–255) above which a pixel counts as "ink". */
  alphaThreshold?: number
}

/**
 * Split into wrap tokens: whitespace runs, single CJK glyphs (which wrap
 * per-character), and contiguous latin/number runs (which wrap per-word).
 */
function tokenize(text: string): string[] {
  // CJK ranges: U+3000-303F punctuation, U+3400-4DBF Ext-A, U+4E00-9FFF
  // unified, U+FF00-FFEF fullwidth. Escaped (not literal) so U+3000 (the
  // ideographic space) doesn't trip no-irregular-whitespace.
  const cjk = '\\u3000-\\u303f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef'
  const re = new RegExp(`(\\s+)|([${cjk}])|([^\\s${cjk}]+)`, 'g')
  const tokens: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) tokens.push(m[0])
  return tokens
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const tok of tokenize(text)) {
    const trial = line + tok
    if (line.trim() !== '' && ctx.measureText(trial.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd())
      line = /^\s+$/.test(tok) ? '' : tok
    } else {
      line = trial
    }
  }
  if (line.trim() !== '') lines.push(line.trim())
  return lines.length > 0 ? lines : ['']
}

export function buildTextParticleField(opts: TextParticleOptions): TextParticleField {
  const {
    text,
    maxWidth,
    fontSize,
    fontFamily,
    fontWeight = 500,
    lineHeightRatio = 1.15,
    sampleGap = 4,
    maxTargets = 5200,
    alphaThreshold = 90,
  } = opts

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const width = Math.max(1, Math.ceil(maxWidth))

  const measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return { width, height: 0, targets: [] }
  measureCtx.font = font

  const lines = wrap(measureCtx, text, maxWidth)
  const lineHeight = fontSize * lineHeightRatio
  const height = Math.max(1, Math.ceil(lines.length * lineHeight))

  const cv = document.createElement('canvas')
  cv.width = width
  cv.height = height
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { width, height, targets: [] }

  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  lines.forEach((ln, i) => ctx.fillText(ln, width / 2, (i + 0.5) * lineHeight))

  const data = ctx.getImageData(0, 0, width, height).data
  const targets: ParticleTarget[] = []
  for (let y = 0; y < height; y += sampleGap) {
    for (let x = 0; x < width; x += sampleGap) {
      if (data[(y * width + x) * 4 + 3]! > alphaThreshold) {
        targets.push({
          x: x + (Math.random() - 0.5) * sampleGap,
          y: y + (Math.random() - 0.5) * sampleGap,
        })
      }
    }
  }

  // Fisher–Yates partial shuffle, then truncate, so the cap keeps an even cloud.
  if (targets.length > maxTargets) {
    for (let i = targets.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      const tmp = targets[i]!
      targets[i] = targets[j]!
      targets[j] = tmp
    }
    targets.length = maxTargets
  }

  return { width, height, targets }
}

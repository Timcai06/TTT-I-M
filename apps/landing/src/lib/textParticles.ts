/**
 * @description 单个文字粒子的目标点和散点随机种子，由离屏 canvas 采样阶段一次性生成
 */
export interface ParticleTarget {
  /** 目标 X 坐标，单位为 canvas px，对应文字墨迹像素 */
  x: number
  /** 目标 Y 坐标，单位为 canvas px，对应文字墨迹像素 */
  y: number
  /** 散点初始 X 随机值，范围约 [-0.5, 0.5] */
  rx: number
  /** 散点初始 Y 随机值，范围约 [-0.5, 0.5] */
  ry: number
  /** 散点初始 Z 随机值，范围约 [-0.5, 0.5] */
  rz: number
  /** 粒子成形延迟，范围 0–1 */
  delay: number
  /** 粒子颜色差异种子，范围 0–1 */
  seed: number
}

/**
 * @description 一段文字采样后的粒子场数据，供 TextParticles 映射到 R3F 世界坐标
 */
export interface TextParticleField {
  /** 离屏 canvas 宽度，单位 CSS px */
  width: number
  /** 离屏 canvas 高度，单位 CSS px */
  height: number
  /** 被采样出来的文字墨迹目标点集合 */
  targets: ParticleTarget[]
}

/**
 * @description 构建文字粒子场的输入参数，控制排版、采样密度和粒子数量上限
 */
export interface TextParticleOptions {
  /** 要被采样的真实文案 */
  text: string
  /** 文本换行宽度，单位 CSS px */
  maxWidth: number
  /** 采样时使用的字号，单位 px */
  fontSize: number
  /** 采样时使用的字体族，需和视觉层 CSS serif 尽量一致 */
  fontFamily: string
  /** 字重，默认 500 */
  fontWeight?: number | string
  /** 行高倍率，乘以 fontSize 得到每行高度 */
  lineHeightRatio?: number
  /** 采样网格间距，越小粒子越密、CPU/GPU 成本越高 */
  sampleGap?: number
  /** 粒子数量硬上限，超出后随机均匀截断 */
  maxTargets?: number
  /** alpha 阈值，超过该值的像素才被视为文字墨迹 */
  alphaThreshold?: number
}

/**
 * @description 将文本拆成换行 token：空白、单个 CJK 字符、连续拉丁/数字词
 * @dependencies Unicode CJK 范围正则
 * @caveats CJK 按字换行，英文/数字按词换行，避免中文长句被当成一个无法换行的大 token
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

/**
 * @description 使用 canvas measureText 执行轻量换行，生成采样前的行数组
 * @dependencies CanvasRenderingContext2D.measureText
 * @performance 只在 effect 中调用，不在 React render 中读 DOM；当前文本规模下成本很低
 */
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

/**
 * @description 把一段文字离屏绘制到 2D canvas，并将不透明文字像素采样为粒子目标点
 * @dependencies 浏览器 canvas 2D、measureText、getImageData
 * @performance sampleGap 和 maxTargets 是主要成本阀门；随机值只在这里生成，R3F 渲染层保持确定性映射
 * @caveats 需要在浏览器环境调用；如果 canvas context 不可用，返回空 targets 让视觉层自然降级
 * @steps
 * step1: 根据 maxWidth/fontSize/fontFamily 计算换行和 canvas 尺寸
 * step2: 在离屏 canvas 居中绘制每一行文字
 * step3: 按 sampleGap 扫描 alpha 像素，生成目标点和散点随机种子
 * step4: 超过 maxTargets 时洗牌截断，保持粒子云分布均匀
 */
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
        // All randomness lives here (called from an effect, never React
        // render) so the GL component can map it deterministically.
        targets.push({
          x: x + (Math.random() - 0.5) * sampleGap,
          y: y + (Math.random() - 0.5) * sampleGap,
          rx: Math.random() - 0.5,
          ry: Math.random() - 0.5,
          rz: Math.random() - 0.5,
          delay: Math.random(),
          seed: Math.random(),
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

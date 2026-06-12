/**
 * @description 章节转场「液体幕布」的纯几何 —— 一条波浪前缘扫过视口的采样与
 *   SVG path 序列化。timeline 只 tween 几个标量（front/back 进度、波相位），
 *   每帧用这里的纯函数重建 path d；node:test 直接覆盖（tests/waveFrontPath.test.ts）。
 *
 *   波形模型（对照参考视频逐帧标定）：
 *   front(u) = base + tilt·(u-0.5) + A·sin(2.1πu + φ) + 0.4A·curl·sin(4.6πu + 1.6φ)
 *   其中 A 与 tilt 都乘 envelope = sin(π·progress) —— 浪只在屏幕中段最大，
 *   贴近上下边缘时衰减归零，因此「满屏时刻全覆盖」是解析保证而非调参巧合。
 *
 * @dependencies 无运行时依赖；由 transitionTimeline 在 GSAP onUpdate 中调用，
 *   单测通过 tests/waveFrontPath.test.ts 锁定方向镜像、满屏覆盖和 pad 边界。
 * @performance 只做固定 27 个采样点的数值计算和字符串拼接，不读取 DOM、不触发布局；
 *   每次转场每帧调用两次，成本必须低于一帧 overlay path 更新预算。
 * @caveats AMPLITUDE/TILT 比例与转场的视觉性格强耦合；调整后需目测中段浪头的
 *   卷曲感并重跑 e2e（INP / overlay-clears 门）
 * @steps
 * step1: 将 progress 钳制到 0–1，并按视口高度计算屏外 pad 与整段行程
 * step2: 用 sin(π·progress) 作为 envelope，让波幅和倾斜只在中段出现
 * step3: 先计算 up 方向采样点，再通过垂直镜像得到 down 方向
 * step4: 用两条前缘闭合为幕布带，保证 full-cover 时刻完整遮住真实页面跳转
 */

/** 波幅占视口高度的比例。参考视频约 0.30；默认略收敛，避免高视口上浪头过凶。 */
export const WAVE_AMPLITUDE_RATIO = 0.26
/** 斜倾占视口高度的比例 —— 让浪头一侧领跑，制造对角冲势。 */
export const WAVE_TILT_RATIO = 0.2
/** 幕布带在视口外的垫高（×视口高）。保证 progress 0/1 时前缘完全在屏外。 */
export const WAVE_PAD_RATIO = 0.55
/** 前缘采样点数。26 点 × 每帧 2 条路径的字符串拼接，远低于一次 layout 的成本。 */
export const WAVE_SAMPLES = 26

export type WaveDirection = 'up' | 'down'

export interface WaveFrontFrame {
  /** 视口宽度（px）。 */
  width: number
  /** 视口高度（px）。 */
  height: number
  /** 前缘行程 0→1：0 = 完全在入场侧屏外，1 = 完全越过另一侧。 */
  progress: number
  /** 波相位（弧度），随时间推进让浪「滚动」而非平移。 */
  phase: number
  /** up = 自下而上扫（参考视频方向）；down = 反向。 */
  direction: WaveDirection
  /** 二阶谐波的卷曲极性，主/前导两层取反让边缘互相错开。 */
  curl: 1 | -1
  /** 覆写波幅比例（默认 WAVE_AMPLITUDE_RATIO）。 */
  amplitudeRatio?: number
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/** 采样一条波浪前缘。返回 [x, y][]，x 等距单调递增。 */
export function waveFrontPoints(frame: WaveFrontFrame): Array<[number, number]> {
  const { width, height, phase, direction, curl } = frame
  const progress = clamp01(frame.progress)
  const pad = height * WAVE_PAD_RATIO
  const span = height + 2 * pad

  // Always compute the 'up' waveform, then mirror for 'down' — the two
  // directions are exact reflections by construction (pinned by unit test).
  const upBase = height + pad - span * progress
  const envelope = Math.sin(Math.PI * progress)
  const amplitude = height * (frame.amplitudeRatio ?? WAVE_AMPLITUDE_RATIO) * envelope
  const tilt = -height * WAVE_TILT_RATIO * envelope

  const points: Array<[number, number]> = []
  for (let i = 0; i <= WAVE_SAMPLES; i += 1) {
    const u = i / WAVE_SAMPLES
    const yUp =
      upBase +
      tilt * (u - 0.5) +
      amplitude * Math.sin(u * Math.PI * 2.1 + phase) +
      amplitude * 0.4 * curl * Math.sin(u * Math.PI * 4.6 + phase * 1.6)
    points.push([width * u, direction === 'up' ? yUp : height - yUp])
  }
  return points
}

/** 把采样点连成平滑曲线（中点 handle 的三次贝塞尔，与 Skills 流线同手法）。 */
function curveThrough(points: Array<[number, number]>): string {
  let d = ''
  let prev: [number, number] | undefined
  for (const point of points) {
    if (prev) {
      const mx = ((prev[0] + point[0]) / 2).toFixed(1)
      d += ` C ${mx},${prev[1].toFixed(1)} ${mx},${point[1].toFixed(1)} ${point[0].toFixed(1)},${point[1].toFixed(1)}`
    }
    prev = point
  }
  return d
}

export interface WaveBandFrame {
  width: number
  height: number
  /** 领先边行程（覆盖方向上先行的那条前缘）。 */
  frontProgress: number
  /** 殿后边行程；0 表示还贴在入场侧屏外（满屏定格时保持 0）。 */
  backProgress: number
  phase: number
  direction: WaveDirection
  curl: 1 | -1
  amplitudeRatio?: number
}

/**
 * @description 把领先边和殿后边组合成一个闭合 SVG 填充路径，供转场幕布直接渲染。
 * @dependencies waveFrontPoints、curveThrough；调用方负责把返回值写入 `<path d>`
 * @performance 固定采样点数，不读取布局；可安全放在 GSAP timeline 的 onUpdate 中
 * @caveats frontProgress=1 且 backProgress=0 是满屏定格关键帧，两条边都在屏外，
 *   真实滚动跳转必须发生在这个窗口内，避免用户看到页面瞬移。
 */
export function waveBandPath(frame: WaveBandFrame): string {
  const { width, height, phase, direction, curl, amplitudeRatio } = frame
  const lead = waveFrontPoints({
    width, height, phase, direction, curl, amplitudeRatio,
    progress: frame.frontProgress,
  })
  const tail = waveFrontPoints({
    width, height, direction, curl, amplitudeRatio,
    phase: phase + 1.15,
    progress: frame.backProgress,
  })

  // up: lead 在上方（y 小），tail 在下方；down 相反。闭合方向无关紧要（nonzero fill）。
  const top = direction === 'up' ? lead : tail
  const bottom = direction === 'up' ? tail : lead
  const bottomReversed = [...bottom].reverse()

  const first = top.at(0)
  const bridge = bottomReversed.at(0)
  if (!first || !bridge) return ''
  return (
    `M ${first[0].toFixed(1)},${first[1].toFixed(1)}${curveThrough(top)}` +
    ` L ${bridge[0].toFixed(1)},${bridge[1].toFixed(1)}${curveThrough(bottomReversed)} Z`
  )
}

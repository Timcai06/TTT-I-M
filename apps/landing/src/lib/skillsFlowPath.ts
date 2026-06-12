/**
 * @description Skills 章节蛇形流动曲线的纯几何计算 —— 从 Skills.tsx 抽出。
 *   输入视口宽度与章节内的起止 Y 坐标，输出三段式三次贝塞尔的 SVG path d。
 *   DOM 测量与 ScrollTrigger 同步留在 useSkillsFlowLine hook；这里只有数学，
 *   node:test 直接覆盖（tests/skillsFlowPath.test.ts）。
 * @caveats k=0.38 是拐点处 C1 连续的垂直切线因子；P1/P2 的 72%/28% 横向占位
 *   决定蛇形幅度 —— 调整时同步目测 Skills 章节滚动
 */

/** 构建曲线所需的布局测量值（均相对 Skills 根容器坐标系）。 */
export interface SkillsFlowFrame {
  /** 当前视口宽度（px），决定蛇形左右摆幅。 */
  viewportWidth: number
  /** 曲线起点参考 Y —— 章节标题顶部。 */
  startY: number
  /** 曲线终点参考 Y —— 最后一行技能底部。 */
  endY: number
}

interface FlowPoint {
  x: number
  y: number
}

/** 单段三次贝塞尔：cp1/cp2 为控制点，to 为终点。 */
export interface FlowSegment {
  cp1: FlowPoint
  cp2: FlowPoint
  to: FlowPoint
}

/** 完整曲线骨架：起点 + 三段贝塞尔（左 → 右 → 左 → 右 蛇形）。 */
export interface SkillsFlowGeometry {
  start: FlowPoint
  segments: [FlowSegment, FlowSegment, FlowSegment]
}

/** 拐点垂直切线因子 —— 保证相邻段在 P1/P2 处一阶连续（切线均为竖直方向）。 */
const TANGENT_K = 0.38

/**
 * 计算蛇形曲线的四个锚点与六个控制点。
 * P0 屏幕左缘入场（标题上方 120px）→ P1 右弯（72% 宽）→ P2 左弯（28% 宽）
 * → P3 屏幕右缘出场（末行下方 120px）。
 */
export function buildSkillsFlowGeometry({ viewportWidth, startY, endY }: SkillsFlowFrame): SkillsFlowGeometry {
  const height = endY - startY

  const P0: FlowPoint = { x: 0, y: startY - 120 }
  const P1: FlowPoint = { x: viewportWidth * 0.72, y: startY + height * 0.3 }
  const P2: FlowPoint = { x: viewportWidth * 0.28, y: startY + height * 0.7 }
  const P3: FlowPoint = { x: viewportWidth, y: endY + 120 }

  return {
    start: P0,
    segments: [
      // P0 → P1：起点水平出发，拐点垂直切入
      {
        cp1: { x: P0.x + (P1.x - P0.x) * TANGENT_K, y: P0.y },
        cp2: { x: P1.x, y: P1.y - (P1.y - P0.y) * TANGENT_K },
        to: P1,
      },
      // P1 → P2：两端均垂直（与上一段共享 P1 的竖直切线 → C1 连续）
      {
        cp1: { x: P1.x, y: P1.y + (P2.y - P1.y) * TANGENT_K },
        cp2: { x: P2.x, y: P2.y - (P2.y - P1.y) * TANGENT_K },
        to: P2,
      },
      // P2 → P3：拐点垂直出发，终点水平切出
      {
        cp1: { x: P2.x, y: P2.y + (P3.y - P2.y) * TANGENT_K },
        cp2: { x: P3.x - (P3.x - P2.x) * TANGENT_K, y: P3.y },
        to: P3,
      },
    ],
  }
}

const fmt = (point: FlowPoint) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`

/** 把几何骨架序列化为 SVG path d 字符串。 */
export function buildSkillsFlowPathD(frame: SkillsFlowFrame): string {
  const { start, segments } = buildSkillsFlowGeometry(frame)
  return (
    `M ${fmt(start)} ` +
    segments.map(({ cp1, cp2, to }) => `C ${fmt(cp1)} ${fmt(cp2)} ${fmt(to)}`).join(' ')
  )
}

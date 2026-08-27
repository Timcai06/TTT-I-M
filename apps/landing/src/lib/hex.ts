/**
 * @description HEX 颜色工具 —— 抽取自 landingScrollNarrative 与 Projects 的重复实现，
 *   统一负责 hex 解析与颜色混合，并做**输入校验**：非法 hex 不回退到 NaN，而是优雅兜底。
 * @dependencies 无 —— 纯函数。
 * @performance / @caveats 只在每次解析章节主题时调用，不进入滚动热路径。
 */

/** 解析 `#rrggbb`（可省略 `#`）为 RGB 分量；非法输入返回 null。 */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const value = match[1]
  if (!value) return null
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * @description 在 `from` 与 `to` 两个 hex 颜色之间以 `blend` (0..1) 线性混合。
 *   任一输入非法时回退到合法的一端；两者都非法时回退纯黑，绝不产生 'NaN'。
 */
export function mixHexColor(from: string, to: string, blend: number): string {
  const amount = clamp01(blend)
  const source = parseHex(from) ?? parseHex(to) ?? { r: 0, g: 0, b: 0 }
  const target = parseHex(to) ?? source

  const mix = (start: number, end: number) => Math.round(start + (end - start) * amount)
  return `#${[mix(source.r, target.r), mix(source.g, target.g), mix(source.b, target.b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

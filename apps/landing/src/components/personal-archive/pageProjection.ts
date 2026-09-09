export type Point = { x: number; y: number }

/**
 * Contact has no exported model surface in v2. Keep it on a calm desk-aligned
 * reading plane instead of falsely reusing the Work folder anchors.
 */
export function contactReadingPoints(width: number, height: number, expand = 0): Point[] {
  const safe = Math.max(0, Math.min(1, Number.isFinite(expand) ? expand : 0))
  const scale = 1 - safe
  const x = Math.min(64, width * .05) * scale
  const top = Math.min(88, height * .12) * scale
  const bottom = Math.min(42, height * .065) * scale
  return [
    { x, y: top + 7 * scale },
    { x: width - x * .82, y: top },
    { x: width - x * .56, y: height - bottom },
    { x: x * .84, y: height - bottom + 6 * scale },
  ]
}

/** Map a CSS rectangle onto the four projected paper corners (TL, TR, BR, BL). */
export function pageMatrix(points: Point[], width: number, height: number) {
  const [a, b, c, d] = points
  if (!a || !b || !c || !d) return null
  if (![width, height, ...points.flatMap(p => [p.x, p.y])].every(Number.isFinite)) return null
  // A folded or edge-on quad has no single paintable CSS plane. Reject it
  // before its homography can flip an entire chapter across the viewport.
  const turns = [a, b, c, d].map((p, i, quad) => {
    const q = quad[(i + 1) % 4], r = quad[(i + 2) % 4]
    if (!q || !r) return 0
    return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x)
  })
  if (!turns.every(t => t > 1e-8) && !turns.every(t => t < -1e-8)) return null
  const dx = a.x - b.x + c.x - d.x
  const dy = a.y - b.y + c.y - d.y
  const u = b.x - c.x, v = d.x - c.x
  const r = b.y - c.y, s = d.y - c.y
  const det = u * s - v * r
  if (Math.abs(det) < 1e-8 || width <= 0 || height <= 0) return null
  const g = (dx * s - v * dy) / det
  const h = (u * dy - dx * r) / det
  return [
    (b.x - a.x + g * b.x) / width, (b.y - a.y + g * b.y) / width, 0, g / width,
    (d.x - a.x + h * d.x) / height, (d.y - a.y + h * d.y) / height, 0, h / height,
    0, 0, 1, 0, a.x, a.y, 0, 1,
  ]
}

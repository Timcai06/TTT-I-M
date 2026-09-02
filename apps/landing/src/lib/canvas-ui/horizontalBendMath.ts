export type HorizontalDirection = 'left-to-right' | 'right-to-left'

export interface HorizontalBendState {
  progress: number
  distance: number
  direction: HorizontalDirection
}

export interface HorizontalBendGeometry {
  zone: number
  rounding: number
  perspective: number
  pixelX: number
  pixelY: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function bendEdgeStrengths(
  progress: number,
  direction: HorizontalDirection,
  distance = 0,
  ease = 0,
) {
  const p = clamp01(progress)
  const edgeSpan = distance > 0 && ease > 0
    ? Math.min(0.35, Math.max(0.001, ease / distance))
    : 0.35
  const entering = smoothstep(0, edgeSpan, p)
  const leaving = 1 - smoothstep(1 - edgeSpan, 1, p)
  return direction === 'right-to-left'
    ? { left: entering, right: leaving }
    : { left: leaving, right: entering }
}

export function mapPointerToHorizontalBend(
  x: number,
  width: number,
  zone = 180,
  strengths = { left: 1, right: 1 },
): number {
  if (width <= 0) return 0
  const safeZone = Math.min(zone, width * 0.15)
  if (x < safeZone) {
    const t = 1 - clamp01(x / safeZone)
    return x + Math.sin(t * Math.PI * 0.255) * safeZone * 0.24 * strengths.left
  }
  if (x > width - safeZone) {
    const t = clamp01((x - (width - safeZone)) / safeZone)
    return x - Math.sin(t * Math.PI * 0.255) * safeZone * 0.24 * strengths.right
  }
  return x
}

/**
 * Canvas UI expresses Bend's physical dimensions against the viewport height.
 * Keep that reference span after exchanging the fold axis from Y to X: using
 * the width here makes a wide desktop fold much shallower than the source demo.
 */
export function calculateHorizontalBendGeometry(
  width: number,
  height: number,
  values: { zone: number; rounding: number; perspective: number },
): HorizontalBendGeometry {
  const safeWidth = Math.max(width, 1)
  const referenceSpan = Math.max(height, 1)
  const zone = Math.min(Math.max(values.zone, 8) / referenceSpan, 0.49)

  return {
    zone,
    rounding: Math.min(Math.max(values.rounding, 0) / referenceSpan, zone),
    perspective: Math.max(values.perspective, 50) / referenceSpan,
    pixelX: 1.5 / safeWidth,
    pixelY: 1.5 / referenceSpan,
  }
}

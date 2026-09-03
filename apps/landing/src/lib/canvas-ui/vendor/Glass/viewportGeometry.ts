export interface GlassRect {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export interface GlassSourceGeometry {
  originX: number
  originY: number
  width: number
  height: number
}

/** Maps a document surface into WebGL's bottom-left viewport coordinate space. */
export function resolveGlassSourceGeometry(
  output: GlassRect,
  source: GlassRect,
  dpr: number,
): GlassSourceGeometry {
  return {
    originX: (source.left - output.left) * dpr,
    originY: (output.bottom - source.bottom) * dpr,
    width: Math.max(source.width * dpr, 1),
    height: Math.max(source.height * dpr, 1),
  }
}

export function glassRectContains(
  rect: GlassRect,
  clientX: number,
  clientY: number,
  paddingX = 0,
  paddingY = paddingX,
): boolean {
  return clientX >= rect.left - paddingX
    && clientX <= rect.right + paddingX
    && clientY >= rect.top - paddingY
    && clientY <= rect.bottom + paddingY
}

interface Vec2 {
  x: number
  y: number
}

export interface ImagePlacement {
  rect: { left: number; top: number; width: number; height: number }
  uvMin: Vec2
  uvMax: Vec2
}

export interface ImagePlacementInput {
  bounds: { left: number; top: number; width: number; height: number }
  naturalWidth: number
  naturalHeight: number
  fit: string
  positionX: number
  positionY: number
}

/** Pure object-fit mapping shared by the renderer and Node regression tests. */
export function calculateImagePlacement({
  bounds,
  naturalWidth,
  naturalHeight,
  fit,
  positionX,
  positionY,
}: ImagePlacementInput): ImagePlacement | null {
  if (bounds.width <= 1 || bounds.height <= 1 || naturalWidth <= 0 || naturalHeight <= 0) return null
  if (fit === 'fill') {
    return {
      rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
      uvMin: { x: 0, y: 0 },
      uvMax: { x: 1, y: 1 },
    }
  }

  const containScale = Math.min(bounds.width / naturalWidth, bounds.height / naturalHeight)
  const coverScale = Math.max(bounds.width / naturalWidth, bounds.height / naturalHeight)
  const scale = fit === 'cover'
    ? coverScale
    : fit === 'scale-down'
      ? Math.min(containScale, 1)
      : containScale
  const renderedWidth = naturalWidth * scale
  const renderedHeight = naturalHeight * scale
  const renderedLeft = bounds.left + (bounds.width - renderedWidth) * positionX
  const renderedTop = bounds.top + (bounds.height - renderedHeight) * positionY

  if (fit !== 'cover') {
    return {
      rect: { left: renderedLeft, top: renderedTop, width: renderedWidth, height: renderedHeight },
      uvMin: { x: 0, y: 0 },
      uvMax: { x: 1, y: 1 },
    }
  }

  return {
    rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
    uvMin: {
      x: Math.max(0, (bounds.left - renderedLeft) / renderedWidth),
      y: Math.max(0, (bounds.top - renderedTop) / renderedHeight),
    },
    uvMax: {
      x: Math.min(1, (bounds.left + bounds.width - renderedLeft) / renderedWidth),
      y: Math.min(1, (bounds.top + bounds.height - renderedTop) / renderedHeight),
    },
  }
}


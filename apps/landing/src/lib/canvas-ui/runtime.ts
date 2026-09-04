import { getGLQualityProfile } from '../webgl/quality'

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  return typeof context?.drawElementImage === 'function'
    && typeof canvas.requestPaint === 'function'
}

export function markDrawableSubtree(canvas: HTMLCanvasElement, element: HTMLElement): () => void {
  canvas.setAttribute('layoutsubtree', '')
  element.setAttribute('drawable', '')
  return () => {
    canvas.removeAttribute('layoutsubtree')
    element.removeAttribute('drawable')
  }
}

export class RectCache {
  private rect: DOMRectReadOnly | null = null

  read(element: Element): DOMRectReadOnly {
    this.rect ??= element.getBoundingClientRect()
    return this.rect
  }

  invalidate(): void {
    this.rect = null
  }
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(window.devicePixelRatio || 1, getGLQualityProfile().dprMax)
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width === width && canvas.height === height) return false
  canvas.width = width
  canvas.height = height
  return true
}

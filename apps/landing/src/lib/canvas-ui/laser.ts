import {
  createLaser as createCanvasUiLaser,
  supportsHtmlInCanvas,
  type LaserInstance,
} from './vendor/Laser/LaserVanilla'

export interface LaserHandle {
  readonly mode: 'html-canvas' | 'beam-fallback'
  setScrollActivity(state: { progress: number; delta: number }): void
  invalidate(): void
  resize(): void
  destroy(): void
}

export const LASER_CONFIG = {
  speed: 0.22,
  offset: 72,
  thickness: 3,
  core: 0.8,
  radius: 14,
  glow: 1.2,
  wave: 3,
  width: 0.72,
  flicker: 0.12,
  reveal: 220,
  heat: 0.7,
  shimmer: 3.5,
  sparkle: 0.08,
  reactivity: 0.55,
  color: [0.85, 0.74, 0.53] as [number, number, number],
} as const

function cloneCapture(capture: HTMLElement): HTMLElement {
  const clone = capture.cloneNode(true) as HTMLElement
  clone.setAttribute('drawable', '')
  clone.setAttribute('aria-hidden', 'true')
  clone.setAttribute('inert', '')
  clone.setAttribute('data-project-laser-capture', '')
  clone.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))
  clone.querySelectorAll<HTMLElement>('a, button, input, select, textarea, video').forEach((element) => {
    element.setAttribute('tabindex', '-1')
  })
  return clone
}

export function createLaser(canvas: HTMLCanvasElement, capture?: HTMLElement | null): LaserHandle | null {
  const host = canvas.parentElement
  if (!host) return null

  const htmlCanvasMode = supportsHtmlInCanvas() && Boolean(capture)
  const source = document.createElement('canvas')
  source.className = 'projects__laser-capture'
  source.setAttribute('layoutsubtree', '')
  // Only create a second, paintable DOM surface when the browser can actually
  // consume it. Stable browsers render the complete beam over the real Bento
  // and keep that real content as the measurement/interaction source.
  const content = htmlCanvasMode && capture
    ? cloneCapture(capture)
    : capture ?? document.createElement('div')
  if (!capture) content.setAttribute('drawable', '')
  if (htmlCanvasMode) {
    source.append(content)
    host.append(source)
  }
  const markCaptureReady = () => { source.dataset.captureState = 'ready' }
  source.addEventListener('paint', markCaptureReady)

  let instance: LaserInstance | null = createCanvasUiLaser(
    { source, content, output: canvas },
    LASER_CONFIG,
  )
  if (!instance) {
    source.removeEventListener('paint', markCaptureReady)
    source.remove()
    return null
  }

  const mode = htmlCanvasMode ? 'html-canvas' : 'beam-fallback'
  return {
    mode,
    setScrollActivity({ delta }) {
      instance?.setScrollActivity(delta)
      source.requestPaint?.()
    },
    invalidate() {
      source.requestPaint?.()
      instance?.resize()
    },
    resize() { instance?.resize() },
    destroy() {
      instance?.destroy()
      instance = null
      source.removeEventListener('paint', markCaptureReady)
      source.remove()
    },
  }
}

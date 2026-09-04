import {
  createLaser as createCanvasUiLaser,
  supportsHtmlInCanvas,
  type LaserInstance,
} from './vendor/Laser/LaserVanilla'
import type { EffectLifecycle } from '../../shared/effects/contracts.ts'
import { LASER_CONFIG } from './laserConfig.ts'
import { forceLoseCanvasWebGLContext } from '../webgl/contextRegistry.ts'

export { LASER_CONFIG } from './laserConfig.ts'

export interface LaserHandle extends EffectLifecycle {
  readonly mode: 'html-canvas' | 'beam-fallback'
  setScrollActivity(state: { progress: number; delta: number }): void
  invalidate(): void
  resize(): void
  destroy(): void
}

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

export function createLaser(
  canvas: HTMLCanvasElement,
  capture?: HTMLElement | null,
  beamTarget?: HTMLElement | null,
): LaserHandle | null {
  const host = canvas.parentElement
  if (!host) return null

  const htmlCanvasMode = supportsHtmlInCanvas() && Boolean(capture)
  const source = document.createElement('canvas')
  source.className = 'projects__laser-capture'
  source.setAttribute('layoutsubtree', '')
  // Only create a second, paintable DOM surface when the browser can actually
  // consume it. Stable browsers render the same red seam over the real title;
  // the title animation and every interaction remain owned by the real DOM.
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

  let instance: LaserInstance | null
  try {
    instance = createCanvasUiLaser(
      { source, content, output: canvas, beamTarget: beamTarget ?? undefined },
      LASER_CONFIG,
    )
  } catch {
    source.removeEventListener('paint', markCaptureReady)
    source.remove()
    forceLoseCanvasWebGLContext(canvas)
    return null
  }
  if (!instance) {
    source.removeEventListener('paint', markCaptureReady)
    source.remove()
    forceLoseCanvasWebGLContext(canvas)
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
    pause() { instance?.pause() },
    resume() { instance?.resume() },
    resize() { instance?.resize() },
    destroy() {
      try {
        instance?.destroy()
      } finally {
        instance = null
        forceLoseCanvasWebGLContext(canvas)
        source.removeEventListener('paint', markCaptureReady)
        source.remove()
      }
    },
  }
}

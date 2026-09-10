import {
  createLaser as createCanvasUiLaser,
  supportsHtmlInCanvas,
  type LaserInstance,
} from './vendor/Laser/LaserVanilla'
import type { EffectLifecycle } from '../../shared/effects/contracts.ts'
import { LASER_CONFIG } from './laserConfig.ts'
import { forceLoseCanvasWebGLContext } from '../webgl/contextRegistry.ts'
import {
  normalizeLocalEffectState,
  type LocalEffectState,
} from './localEffectControl.ts'
import { cloneProjectLaserCapture } from './laserCapture.ts'

export { LASER_CONFIG } from './laserConfig.ts'

export interface LaserHandle extends EffectLifecycle {
  readonly mode: 'html-canvas' | 'beam-fallback'
  setScrollActivity(state: LocalEffectState): void
  invalidate(): void
  resize(): void
  destroy(): void
}

export function createLaser(
  canvas: HTMLCanvasElement,
  capture?: HTMLElement | null,
  beamTarget?: HTMLElement | null,
): LaserHandle | null {
  const host = canvas.parentElement
  if (!host) return null
  delete canvas.dataset.laserFailure

  const htmlCanvasMode = supportsHtmlInCanvas() && Boolean(capture)
  const source = document.createElement('canvas')
  source.className = 'projects__laser-capture'
  source.setAttribute('layoutsubtree', '')
  // Only create a second, paintable DOM surface when the browser can actually
  // consume it. Stable browsers render the same red seam over the real title;
  // the title animation and every interaction remain owned by the real DOM.
  const content = htmlCanvasMode && capture
    ? cloneProjectLaserCapture(capture)
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
  } catch (error) {
    canvas.dataset.laserFailure = error instanceof Error
      ? error.message.slice(0, 240)
      : 'Laser initialization threw a non-Error value.'
    source.removeEventListener('paint', markCaptureReady)
    source.remove()
    forceLoseCanvasWebGLContext(canvas)
    return null
  }
  if (!instance) {
    canvas.dataset.laserFailure = 'Laser renderer returned no WebGL2 instance.'
    source.removeEventListener('paint', markCaptureReady)
    source.remove()
    forceLoseCanvasWebGLContext(canvas)
    return null
  }

  const mode = htmlCanvasMode ? 'html-canvas' : 'beam-fallback'
  return {
    mode,
    setScrollActivity(next) {
      const { progress, delta } = normalizeLocalEffectState(next)
      instance?.setScrollActivity(progress, delta)
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

import {
  createParticleScroll as createCanvasUiParticleScroll,
  supportsHtmlInCanvas,
  type ParticleScrollInstance,
} from './vendor/ParticleScroll/ParticleScrollVanilla'
import { getGLQualityProfile } from '../webgl/quality'
import { FRAME_PARTICLE_CONFIG } from './particleScrollConfig'

export { FRAME_PARTICLE_CONFIG } from './particleScrollConfig'

export interface FrameParticleHandle {
  readonly mode: 'html-canvas'
  setScrollState(state: { progress: number; delta: number }): void
  invalidate(): void
  resize(): void
  destroy(): void
}

export function canRenderFrameParticles(): boolean {
  return supportsHtmlInCanvas()
}

export function createFrameParticles({
  source,
  content,
  output,
  onReady,
  onFailure,
}: {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
  onReady: () => void
  onFailure: () => void
}): FrameParticleHandle | null {
  if (!supportsHtmlInCanvas()) return null

  let instance: ParticleScrollInstance | null = null
  const onContextLost = (event: Event) => {
    event.preventDefault()
    onFailure()
  }
  output.addEventListener('webglcontextlost', onContextLost, { once: true })

  try {
    instance = createCanvasUiParticleScroll({
      source,
      content,
      output,
      onCaptureReady: onReady,
    }, {
      ...FRAME_PARTICLE_CONFIG,
      dprMax: getGLQualityProfile().dprMax,
    })
  } catch {
    output.removeEventListener('webglcontextlost', onContextLost)
    return null
  }

  if (!instance) {
    output.removeEventListener('webglcontextlost', onContextLost)
    return null
  }

  return {
    mode: 'html-canvas',
    setScrollState({ progress, delta }) {
      instance?.setScrollState(progress, delta)
    },
    invalidate() {
      const paintable = source as HTMLCanvasElement & { requestPaint?: () => void }
      paintable.requestPaint?.()
      instance?.resize()
    },
    resize: () => instance?.resize(),
    destroy() {
      output.removeEventListener('webglcontextlost', onContextLost)
      instance?.destroy()
      instance = null
    },
  }
}

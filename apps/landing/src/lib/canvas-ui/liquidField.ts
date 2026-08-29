import {
  createLiquid as createCanvasUiLiquid,
  type LiquidInstance,
} from './vendor/Liquid/LiquidVanilla'
import type { EffectLifecycle } from '../../shared/effects/contracts.ts'

export interface LiquidFieldHandle extends EffectLifecycle {
  setActive(active: boolean): void
  splat(x: number, y: number, dx: number, dy: number): void
  clear(): void
  destroy(): void
}

export const LIQUID_FIELD_CONFIG = {
  force: 0.62,
  radius: 0.15,
  curl: 1.35,
  pressureIterations: 3,
  pressure: 0.7,
  intensity: 0.58,
  densityDissipation: 0.9,
  velocityDissipation: 0.95,
  simResolution: 96,
  dyeResolution: 256,
  color: [0.36, 0.035, 0.025] as [number, number, number],
  rainbow: false,
} as const

export function createLiquidField(canvas: HTMLCanvasElement): LiquidFieldHandle | null {
  const host = canvas.parentElement
  if (!host) return null

  const source = document.createElement('canvas')
  source.setAttribute('layoutsubtree', '')
  source.style.display = 'none'
  const content = document.createElement('div')
  content.setAttribute('drawable', '')
  source.append(content)
  // Dye-only Footer mode never captures HTML. Keep the API-required source
  // canvas detached so the section owns one visible canvas/GL context only;
  // the real Footer DOM remains the accessible foreground layer.

  let instance: LiquidInstance | null = createCanvasUiLiquid(
    { source, content, output: canvas },
    {
      ...LIQUID_FIELD_CONFIG,
      captureContent: false,
      distortion: 0,
      blend: 0,
    },
  )
  if (!instance) {
    source.remove()
    return null
  }

  let active = false
  return {
    setActive(next) {
      active = next
      if (next) instance?.resume()
      else instance?.pause()
    },
    splat(x, y, dx, dy) {
      if (!active || !instance) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      instance.splat(
        (x - rect.left) / rect.width,
        1 - (y - rect.top) / rect.height,
        dx * LIQUID_FIELD_CONFIG.force,
        -dy * LIQUID_FIELD_CONFIG.force,
      )
    },
    clear() {
      // The Footer controller destroys the field whenever it deactivates;
      // rebuilding the official targets is therefore the clear operation.
    },
    pause() { instance?.pause() },
    resume() { instance?.resume() },
    resize() { instance?.resize() },
    destroy() {
      instance?.destroy()
      instance = null
      source.remove()
    },
  }
}

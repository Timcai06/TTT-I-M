export interface EffectLifecycle {
  /** Stop scheduled animation work while retaining the effect instance. */
  pause(): void
  /** Continue after pause without replaying elapsed hidden time. */
  resume(): void
  /** Re-read the owning surface's display size. */
  resize(): void
  /** Idempotently release listeners, frames, observers and GPU resources. */
  destroy(): void
}

export interface VisualEffectDefinition {
  id: string
  chapter: string
  trigger: string
  fallback: string
  reducedMotion: 'static' | 'disabled'
  contextCost: 0 | 1
  license: string
  sourceUrl?: string
  packageName?: string
}

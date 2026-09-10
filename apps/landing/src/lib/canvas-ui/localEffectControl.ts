export interface LocalEffectState {
  progress: number
  delta: number
}

export function normalizeLocalEffectState(state: LocalEffectState): LocalEffectState {
  return {
    progress: Number.isFinite(state.progress) ? Math.min(1, Math.max(0, state.progress)) : 0,
    delta: Number.isFinite(state.delta) ? Math.min(4_000, Math.max(-4_000, state.delta)) : 0,
  }
}

interface LocalEffectCommitOptions<Handle> {
  apply(handle: Handle, state: LocalEffectState): void
  destroy(handle: Handle): void
  onAttach?(handle: Handle): void
  onDetach?(handle: Handle): void
}

/** Small generation guard shared by the two async local Canvas effects. */
export function createLocalEffectCommit<Handle>(options: LocalEffectCommitOptions<Handle>) {
  let active = false
  let disposed = false
  let generation = 0
  let handle: Handle | null = null
  let state = normalizeLocalEffectState({ progress: 0, delta: 0 })

  const release = () => {
    const current = handle
    handle = null
    if (!current) return
    try { options.onDetach?.(current) } catch { /* observer-only callback */ }
    try { options.destroy(current) } catch { /* resource cleanup remains best-effort */ }
  }
  const invalidate = () => {
    active = false
    generation += 1
    release()
  }
  const apply = () => {
    if (!active || !handle) return
    try {
      options.apply(handle, state)
    } catch {
      invalidate()
    }
  }

  return {
    activate(): number {
      if (disposed) return generation
      if (!active) {
        active = true
        generation += 1
      }
      return generation
    },
    update(next: LocalEffectState): void {
      state = normalizeLocalEffectState(next)
      apply()
    },
    accept(token: number, next: Handle): boolean {
      if (disposed || !active || token !== generation) {
        try { options.destroy(next) } catch { /* rejected late resource */ }
        return false
      }
      release()
      handle = next
      try { options.onAttach?.(next) } catch { /* observer-only callback */ }
      apply()
      return handle === next
    },
    deactivate(): void { invalidate() },
    destroy(): void {
      if (disposed) return
      disposed = true
      invalidate()
    },
    snapshot(): Readonly<{ active: boolean; disposed: boolean; generation: number; state: LocalEffectState }> {
      return { active, disposed, generation, state: { ...state } }
    },
  }
}

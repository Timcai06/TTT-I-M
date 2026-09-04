import { getGLQualityProfile } from './quality.ts'

/** A WebGL context is represented by a single-use lease, never a loose counter. */
export interface ContextLease {
  readonly owner: string
  release(): void
}

/**
 * Explicitly release a canvas-owned WebGL context after its renderer has
 * deleted GPU objects. Removing a canvas from the DOM alone leaves reclamation
 * to browser heuristics and can exhaust the context budget during long visits.
 */
export function forceLoseCanvasWebGLContext(canvas: HTMLCanvasElement): void {
  try {
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    // A denied or already-lost context is already in the desired terminal state.
  }
}

/**
 * Verify the exact WebGL generation required by the installed Three.js
 * renderer before React Three Fiber mounts its asynchronous root. R3F does not
 * catch a renderer-construction rejection in its layout-effect bootstrap, so a
 * failed context request would otherwise escape as an unhandled promise.
 *
 * The probe context is explicitly lost before returning. It is a capability
 * check, not a long-lived surface, and therefore never enters the lease
 * registry.
 */
export function canCreateWebGL2Context(): boolean {
  if (typeof document === 'undefined') return false

  const canvas = document.createElement('canvas')
  try {
    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const activeLeases = new Map<symbol, string>()
const listeners = new Set<() => void>()

function reportRegistryError(error: unknown): void {
  try {
    globalThis.reportError?.(error)
  } catch {
    // Diagnostics must never corrupt admission accounting. Browsers without a
    // usable reportError hook still retain the fail-closed lease behavior.
  }
}

function normalizeOwner(owner: string): string {
  const normalizedOwner = owner.trim()
  if (!normalizedOwner) throw new Error('WebGL context leases require a non-empty owner.')
  return normalizedOwner
}

function emitContextChange(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch (error) {
      reportRegistryError(error)
    }
  }
}

/** Subscribe to context-budget changes so deferred optional surfaces can retry. */
export function subscribeContextRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * @description 返回当前已登记的 WebGL context 数量，用于调试和可选视觉面的预算判断
 * @dependencies 依赖本模块内存态 active；没有跨 tab 或跨页面持久化
 */
export function activeContextCount(): number {
  return activeLeases.size
}

/**
 * Exposes ownership for diagnostics/tests without exposing mutable registry state.
 */
export function activeContextOwners(): readonly string[] {
  return Object.freeze([...activeLeases.values()])
}

/**
 * Whether the page-level registered-context budget has capacity for another
 * optional surface. Required contexts count toward this admission ceiling,
 * which prevents a Hero canvas plus optional effects from silently exceeding
 * the total page budget. Allocation must still go through
 * tryAcquireOptionalContext so the check and reservation remain atomic.
 */
export function canAcquireOptionalSurface(): boolean {
  return activeLeases.size < getGLQualityProfile().optionalContextLimit
}

function createLease(owner: string): ContextLease {
  const normalizedOwner = normalizeOwner(owner)

  const token = Symbol(normalizedOwner)
  let released = false
  activeLeases.set(token, normalizedOwner)
  emitContextChange()

  return Object.freeze({
    owner: normalizedOwner,
    release() {
      if (released) return
      released = true
      if (activeLeases.delete(token)) emitContextChange()
    },
  })
}

/**
 * Acquire a required context lease. Required surfaces are accounted for but
 * are never denied by the optional-effects budget.
 */
export function acquireContext(owner: string): ContextLease {
  return createLease(owner)
}

/**
 * Atomically acquire an optional context lease. This prevents two effects from
 * both observing and consuming the final optional slot.
 */
export function tryAcquireOptionalContext(owner: string): ContextLease | null {
  const normalizedOwner = normalizeOwner(owner)
  if (!canAcquireOptionalSurface()) return null
  return createLease(normalizedOwner)
}

/**
 * Wait for optional capacity without polling. The callback runs at most once
 * and receives ownership of the lease; cancelling before delivery removes the
 * registry listener. Re-entrancy is guarded because acquiring a lease emits a
 * registry change synchronously.
 */
export function acquireOptionalContextWhenAvailable(
  owner: string,
  onAcquired: (lease: ContextLease) => void,
): () => void {
  const normalizedOwner = normalizeOwner(owner)
  let cancelled = false
  let acquiring = false
  let delivered = false
  let unsubscribe = () => {}

  const attempt = () => {
    if (cancelled || delivered || acquiring) return
    acquiring = true
    const lease = tryAcquireOptionalContext(normalizedOwner)
    acquiring = false
    if (!lease) return

    delivered = true
    unsubscribe()
    try {
      onAcquired(lease)
    } catch (error) {
      lease.release()
      reportRegistryError(error)
    }
  }

  unsubscribe = subscribeContextRegistry(attempt)
  attempt()

  return () => {
    cancelled = true
    unsubscribe()
  }
}

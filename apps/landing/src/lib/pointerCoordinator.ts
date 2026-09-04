export type PointerUpdateReason = 'move' | 'scroll' | 'resize' | 'iframe' | 'leave' | 'refresh'

export interface PointerSnapshot {
  clientX: number
  clientY: number
  hasMoved: boolean
  active: boolean
  target: Element | null
  reason: PointerUpdateReason
  revision: number
}

type PointerListener = (snapshot: PointerSnapshot) => void

const listeners = new Set<PointerListener>()
let snapshot: PointerSnapshot = {
  clientX: 0,
  clientY: 0,
  hasMoved: false,
  active: false,
  target: null,
  reason: 'refresh',
  revision: 0,
}
let listening = false
let pendingFrame = 0
let pendingReason: PointerUpdateReason = 'refresh'
let pendingTarget: Element | null | undefined

function resolveTarget(): Element | null {
  if (pendingTarget !== undefined) return pendingTarget
  if (!snapshot.active || typeof document === 'undefined') return null
  return document.elementFromPoint(snapshot.clientX, snapshot.clientY)
}

function flush(): void {
  pendingFrame = 0
  snapshot = {
    ...snapshot,
    target: resolveTarget(),
    reason: pendingReason,
    revision: snapshot.revision + 1,
  }
  pendingTarget = undefined
  listeners.forEach((listener) => listener(snapshot))
}

function schedule(reason: PointerUpdateReason, target?: Element | null): void {
  pendingReason = reason
  pendingTarget = target
  if (!pendingFrame) pendingFrame = window.requestAnimationFrame(flush)
}

function onMove(event: MouseEvent): void {
  snapshot = {
    ...snapshot,
    clientX: event.clientX,
    clientY: event.clientY,
    hasMoved: true,
    active: true,
  }
  schedule('move')
}

function onViewportChange(event: Event): void {
  schedule(event.type === 'resize' ? 'resize' : 'scroll')
}

function onWindowLeave(event: MouseEvent): void {
  if (event.relatedTarget) return
  snapshot = { ...snapshot, active: false }
  schedule('leave', null)
}

function onWindowBlur(): void {
  snapshot = { ...snapshot, active: false }
  schedule('leave', null)
}

function onVisibilityChange(): void {
  if (document.hidden) onWindowBlur()
  else schedule('refresh')
}

function onIframePointer(event: Event): void {
  const detail = (event as CustomEvent<{
    phase?: 'move' | 'leave'
    clientX?: number
    clientY?: number
    interactive?: boolean
    target?: HTMLElement
  }>).detail
  if (!detail || !Number.isFinite(detail.clientX) || !Number.isFinite(detail.clientY)) return

  snapshot = {
    ...snapshot,
    clientX: detail.clientX as number,
    clientY: detail.clientY as number,
    hasMoved: true,
    active: detail.phase !== 'leave',
  }
  schedule(
    detail.phase === 'leave' ? 'leave' : 'iframe',
    detail.interactive === true ? detail.target ?? null : null,
  )
}

function startListening(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('mousemove', onMove, { passive: true })
  window.addEventListener('scroll', onViewportChange, { passive: true })
  window.addEventListener('resize', onViewportChange, { passive: true })
  window.addEventListener('mouseout', onWindowLeave)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('portfolio:iframe-pointer', onIframePointer)
  document.addEventListener('visibilitychange', onVisibilityChange)
}

function stopListening(): void {
  if (!listening || typeof window === 'undefined') return
  listening = false
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('scroll', onViewportChange)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('mouseout', onWindowLeave)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('portfolio:iframe-pointer', onIframePointer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.cancelAnimationFrame(pendingFrame)
  pendingFrame = 0
  pendingTarget = undefined
  snapshot = {
    ...snapshot,
    active: false,
    target: null,
    reason: 'leave',
  }
}

export function getPointerSnapshot(): PointerSnapshot {
  return snapshot
}

export function subscribePointer(listener: PointerListener): () => void {
  listeners.add(listener)
  startListening()
  listener(snapshot)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopListening()
  }
}

export function requestPointerHitTest(): void {
  if (!listening || typeof window === 'undefined') return
  schedule('refresh')
}

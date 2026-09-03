import {
  getPointerSnapshot,
  subscribePointer,
  type PointerSnapshot,
} from '../pointerCoordinator.ts'

export interface WorkGlassCandidateRect {
  id: string
  top: number
  bottom: number
  left: number
  right: number
}

type SelectionListener = () => void

const candidates = new Map<string, HTMLElement>()
const listeners = new Set<SelectionListener>()
let selectedId: string | null = null
let pointerCleanup: (() => void) | null = null
let selectionFrame = 0
let latestPointer = getPointerSnapshot()

function verticalDistance(rect: WorkGlassCandidateRect, y: number): number {
  if (y < rect.top) return rect.top - y
  if (y > rect.bottom) return y - rect.bottom
  return 0
}

function intersectionHeight(rect: WorkGlassCandidateRect, viewportHeight: number): number {
  return Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
}

export function selectWorkGlassSurface(
  entries: readonly WorkGlassCandidateRect[],
  pointer: Pick<PointerSnapshot, 'clientX' | 'clientY' | 'hasMoved' | 'active'>,
  viewportWidth: number,
  viewportHeight: number,
  currentId: string | null,
  directTargetId: string | null = null,
): string | null {
  const visible = entries.filter((entry) => (
    entry.right > 0
    && entry.left < viewportWidth
    && intersectionHeight(entry, viewportHeight) > 0
  ))
  if (visible.length === 0) return null

  if (directTargetId && visible.some((entry) => entry.id === directTargetId)) return directTargetId

  const pointerY = pointer.hasMoved && pointer.active ? pointer.clientY : viewportHeight / 2
  if (pointer.hasMoved && pointer.active) {
    const containing = visible.find((entry) => (
      pointer.clientX >= entry.left
      && pointer.clientX <= entry.right
      && pointer.clientY >= entry.top
      && pointer.clientY <= entry.bottom
    ))
    if (containing) return containing.id
  }

  const current = visible.find((entry) => entry.id === currentId)
  if (current && verticalDistance(current, pointerY) <= 72) return current.id

  return visible
    .map((entry) => ({
      id: entry.id,
      score: intersectionHeight(entry, viewportHeight) * 2
        - verticalDistance(entry, pointerY)
        - Math.abs((entry.top + entry.bottom) / 2 - pointerY) * 0.08,
    }))
    .sort((a, b) => b.score - a.score)[0]?.id ?? null
}

function emitSelection(nextId: string | null): void {
  if (nextId === selectedId) return
  selectedId = nextId
  listeners.forEach((listener) => listener())
}

function flushSelection(): void {
  selectionFrame = 0
  if (typeof window === 'undefined') return
  const directTarget = latestPointer.target
    ?.closest<HTMLElement>('[data-work-glass-surface]')
    ?.dataset.workGlassSurface ?? null
  // Pointer hit-testing already proves that this surface occupies the current
  // viewport point. Keep the hot path free of list-wide layout reads.
  if (directTarget && candidates.has(directTarget)) {
    emitSelection(directTarget)
    return
  }
  const entries: WorkGlassCandidateRect[] = Array.from(candidates, ([id, element]) => {
    const rect = element.getBoundingClientRect()
    return { id, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
  })
  emitSelection(selectWorkGlassSurface(
    entries,
    latestPointer,
    window.innerWidth,
    window.innerHeight,
    selectedId,
    directTarget,
  ))
}

function scheduleSelection(pointer = getPointerSnapshot()): void {
  latestPointer = pointer
  if (!selectionFrame) selectionFrame = window.requestAnimationFrame(flushSelection)
}

function syncPointerSubscription(): void {
  if (candidates.size > 0 && !pointerCleanup) {
    pointerCleanup = subscribePointer(scheduleSelection)
  } else if (candidates.size === 0 && pointerCleanup) {
    pointerCleanup()
    pointerCleanup = null
    emitSelection(null)
  }
}

export function registerWorkGlassSurface(id: string, element: HTMLElement): () => void {
  candidates.set(id, element)
  element.dataset.workGlassSurface = id
  syncPointerSubscription()
  scheduleSelection()
  return () => {
    candidates.delete(id)
    delete element.dataset.workGlassSurface
    syncPointerSubscription()
    if (selectedId === id) scheduleSelection()
  }
}

export function subscribeWorkGlassSelection(listener: SelectionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getWorkGlassSelection(): string | null {
  return selectedId
}

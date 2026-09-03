import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

interface SurfaceSlotGroup {
  candidates: symbol[]
  listeners: Set<() => void>
}

const groups = new Map<string, SurfaceSlotGroup>()

function readGroup(name: string): SurfaceSlotGroup {
  const existing = groups.get(name)
  if (existing) return existing
  const created: SurfaceSlotGroup = { candidates: [], listeners: new Set() }
  groups.set(name, created)
  return created
}

function emit(group: SurfaceSlotGroup): void {
  group.listeners.forEach((listener) => listener())
}

/**
 * Grants one native HTML-in-Canvas surface per named group. Candidates remain
 * ordinary DOM until their turn, keeping both DOM canvas count and GPU memory
 * bounded for long repeated lists.
 */
export function useCanvasSurfaceSlot(groupName: string | undefined, candidate: boolean): boolean {
  const token = useRef(Symbol(groupName ?? 'unscoped-canvas-surface'))

  useEffect(() => {
    if (!groupName || !candidate) return
    const group = readGroup(groupName)
    const candidateToken = token.current
    group.candidates.push(candidateToken)
    emit(group)
    return () => {
      group.candidates = group.candidates.filter((entry) => entry !== candidateToken)
      emit(group)
      if (group.candidates.length === 0 && group.listeners.size === 0) groups.delete(groupName)
    }
  }, [candidate, groupName])

  const subscribe = useCallback((listener: () => void) => {
    if (!groupName) return () => {}
    const group = readGroup(groupName)
    group.listeners.add(listener)
    return () => {
      group.listeners.delete(listener)
      if (group.candidates.length === 0 && group.listeners.size === 0) groups.delete(groupName)
    }
  }, [groupName])

  const getSnapshot = useCallback(() => {
    if (!groupName) return true
    return readGroup(groupName).candidates[0] === token.current
  }, [groupName])

  return useSyncExternalStore(subscribe, getSnapshot, () => !groupName)
}

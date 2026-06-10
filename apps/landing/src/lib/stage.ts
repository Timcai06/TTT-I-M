import { useSyncExternalStore } from 'react'

/**
 * Runtime lifecycle SSOT.
 *
 * Composition has a single source of truth (`src/chapters/registry.ts`); this
 * is the matching SSOT for *runtime phase*. It replaces the previously scattered
 * ad-hoc flags (`introExited`, `introExitedOnce`, ChapterTransition's `busyRef`)
 * and the loose `INTRO_EXIT_EVENT` window event with one observable machine:
 *
 *   booting ──(loader title landed)──▶ intro
 *   intro ──(loader hands off / 2.2s fallback)──▶ live
 *   live ──(chapter jump request)──▶ transitioning
 *   transitioning ──(transition timeline ends)──▶ live
 *
 * Anything that used to ask "has the intro finished?" or "are we mid-transition?"
 * now reads from here, and heavy WebGL surfaces subscribe so they can self-pause
 * during a transition (the GPU-heaviest moment).
 */
export type Stage = 'booting' | 'intro' | 'live' | 'transitioning'

let current: Stage = 'booting'
const listeners = new Set<(stage: Stage) => void>()

/**
 * @description 读取当前运行阶段。
 * @dependencies 模块级 `current` 状态
 * @performance / @caveats 纯同步读取；不要在这里读取 window/DOM，保持 SSR/useSyncExternalStore 兼容。
 */
export function getStage(): Stage {
  return current
}

/** True once the intro has handed off — i.e. we're live or transitioning. */
export function isLive(): boolean {
  return current === 'live' || current === 'transitioning'
}

/**
 * @description 设置全站运行阶段，并通知所有订阅者。
 * @dependencies `subscribeStage` 注册的 listener 集合
 * @performance / @caveats 相同 stage 会直接 return，避免重复触发 WebGL pause/resume 和 React external store 更新。
 */
export function setStage(next: Stage): void {
  if (current === next) return
  current = next
  listeners.forEach((listener) => listener(current))
}

/**
 * @description 订阅运行阶段变化。
 * @dependencies `setStage`
 * @performance / @caveats 返回 unsubscribe；所有 effect 必须 cleanup，防止热更新后重复 listener。
 */
export function subscribeStage(listener: (stage: Stage) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React binding (purity-safe: no window/random read during render). */
export function useStage(): Stage {
  return useSyncExternalStore(subscribeStage, getStage, getStage)
}

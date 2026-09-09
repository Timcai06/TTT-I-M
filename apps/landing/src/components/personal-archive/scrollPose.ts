/** All poses depend only on scroll position, including reverse scroll and deep links. */
export function archiveScrollPose(progress: number, exit = false) {
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const range = (start: number, end: number) => clamp((progress - start) / (end - start))
  const smooth = (value: number) => value * value * (3 - 2 * value)
  if (exit) return {
    camera: 1, cover: 1, reveal: 1, departure: 0,
    approach: 1 - smooth(range(0.08, 0.48)),
    flatten: 1 - smooth(range(0.02, 0.24)),
    ink: 1, shelf: smooth(range(0.50, 0.90)),
  }
  return {
    camera: smooth(range(0.08, 0.42)),
    cover: smooth(range(0.22, 0.48)),
    reveal: smooth(range(0, 0.12)), departure: 0,
    approach: smooth(range(0.48, 0.72)),
    flatten: smooth(range(0.94, 1)),
    ink: smooth(range(0.42, 0.54)), shelf: 0,
  }
}

export function createArchiveProgress() {
  let value = 0
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: number) {
      value = Math.max(0, Math.min(1, next))
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
export type ArchiveProgress = ReturnType<typeof createArchiveProgress>

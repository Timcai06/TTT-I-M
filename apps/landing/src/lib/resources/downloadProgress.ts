/**
 * Byte-level progress for the one download large enough to dominate the intro.
 *
 * The room model is ~22.9 MB against ~12.8 MB for every preloaded image combined,
 * so a task-count bar raced to the nineties while the images landed and then sat
 * still for the whole model fetch. Weighting the task alone would only move the
 * stall, because it is a single task that completes all at once. Reporting the
 * bytes as they arrive is what actually makes the bar move evenly.
 *
 * Deliberately a plain module store rather than a parameter: the model is loaded
 * behind createSharedResource, which dedupes concurrent callers, so there is no
 * single caller a progress callback could belong to.
 */
let loaded = 0
let total = 0

export function reportArchiveBytes(next: number, expected: number) {
  loaded = Math.max(0, next)
  total = Math.max(0, expected)
}

export function resetArchiveBytes() {
  loaded = 0
  total = 0
}

/** 0 when the size is unknown, so an unmeasurable fetch never invents progress. */
export function archiveDownloadFraction(): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(1, loaded / total))
}

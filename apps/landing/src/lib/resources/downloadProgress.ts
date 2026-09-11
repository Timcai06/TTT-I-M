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
let stage = 0

/**
 * The stages after the bytes land, in order.
 *
 * Parsing, transcoding 83 KTX2 textures and uploading them is most of the wall
 * clock on a fast connection, and bytes alone pin the bar at 1 the moment the last
 * one arrives. The bar then sits still through the longest phase of the boot,
 * which is what made it jump into the nineties and appear to hang there.
 */
const STAGES = ['parsed', 'materials', 'scene', 'first-frame'] as const
export type ArchiveStage = (typeof STAGES)[number]
/** Bytes own this much of the bar; the stages share what is left. */
const DOWNLOAD_SHARE = .72

export function reportArchiveBytes(next: number, expected: number) {
  loaded = Math.max(0, next)
  total = Math.max(0, expected)
}

/** Monotonic: a later stage never un-reports an earlier one. */
export function reportArchiveStage(next: ArchiveStage) {
  stage = Math.max(stage, STAGES.indexOf(next) + 1)
}

export function resetArchiveBytes() {
  loaded = 0
  total = 0
  stage = 0
}

/** 0 when the size is unknown, so an unmeasurable fetch never invents progress. */
export function archiveDownloadFraction(): number {
  const bytes = !Number.isFinite(total) || total <= 0 ? 0 : Math.max(0, Math.min(1, loaded / total))
  const stages = stage / STAGES.length
  return Math.max(0, Math.min(1, bytes * DOWNLOAD_SHARE + stages * (1 - DOWNLOAD_SHARE)))
}

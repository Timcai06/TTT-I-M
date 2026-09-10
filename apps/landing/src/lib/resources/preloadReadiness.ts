export const ARCHIVE_RENDERER_TASK_ID = 'renderer:personal-archive'

interface PreloadReadinessInput {
  completed: number
  total: number
  failed: readonly string[]
}

/**
 * The room renderer is an enhancement over six complete semantic chapters.
 * It may hand off to explicit reading mode only after every other bounded
 * preload task, including chapter layout, has really settled successfully.
 */
export function isArchiveReadingFallbackReady({ completed, total, failed }: PreloadReadinessInput) {
  return completed === total
    && failed.length === 1
    && failed[0] === ARCHIVE_RENDERER_TASK_ID
}

export const ARCHIVE_RENDERER_TASK_ID = 'renderer:personal-archive'

interface PreloadReadinessInput {
  completed: number
  total: number
  failed: readonly string[]
  /** Ids of tasks flagged `optional` in the manifest. */
  optional: ReadonlySet<string>
}

/**
 * Reading mode is the honest outcome when every task the reader actually needs
 * succeeded and only enhancements were lost.
 *
 * This used to demand exactly one failure, and that it be the room renderer.
 * On a slow connection that is never what happens: the room, the chapter-page
 * prewarm and the film/sound preparation share one bandwidth window and time
 * out together, so `failed.length` reached two or three, no fallback engaged,
 * `renderReady` stayed false, and the intro never released at all. The site
 * became unreachable precisely when it most needed to degrade.
 *
 * Required failures still block: fonts, Pretext, the hero texture and the lazy
 * chapter chunks are what the first paint and the six chapters are actually made
 * of. Everything else in the manifest is prewarm — the images are <img> elements
 * the browser fetches again on render, and the room, film and shader surfaces all
 * have authored fallbacks — so their loss costs fidelity, never entry.
 */
export function isReadingFallbackReady({ completed, total, failed, optional }: PreloadReadinessInput) {
  return completed === total
    && failed.length > 0
    && failed.every((id) => optional.has(id))
}

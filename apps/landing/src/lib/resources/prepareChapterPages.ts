/** Prepare the full About opening and chapter metadata before the intro releases. */
export async function prepareChapterPages(signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { observer.disconnect(); signal.removeEventListener('abort', abort) }
    const check = () => {
      const pages = document.querySelectorAll('.archive-chapter-bridge__page[data-preview-ready="true"]')
      if (document.querySelector('#archive-entry .archive-bridge__page h2') && pages.length === 5 && [...pages].every(page => page.childElementCount > 0)) { cleanup(); resolve() }
    }
    const abort = () => { cleanup(); reject(signal.reason instanceof Error ? signal.reason : new Error('Chapter preparation aborted')) }
    const observer = new MutationObserver(check)
    if (signal.aborted) { abort(); return }
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-preview-ready'] })
    signal.addEventListener('abort', abort, { once: true }); check()
  })
  await Promise.all([...document.querySelectorAll<HTMLImageElement>('#archive-entry .archive-bridge__page img')].map(image => image.decode()))
  signal.throwIfAborted()
}

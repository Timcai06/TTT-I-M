interface ChapterTransitionOptions {
  updateHash?: boolean
}

export interface ChapterTransitionRequest {
  id: string
  updateHash: boolean
}

const CHAPTER_TRANSITION_EVENT = 'portfolio:chapter-transition'
export const CHAPTER_ARRIVED_EVENT = 'portfolio:chapter-arrived'

export function transitionToChapter(id: string, options: ChapterTransitionOptions = {}) {
  window.dispatchEvent(new CustomEvent<ChapterTransitionRequest>(CHAPTER_TRANSITION_EVENT, {
    detail: {
      id,
      updateHash: options.updateHash ?? false,
    },
  }))
}

export function onChapterTransitionRequest(
  callback: (request: ChapterTransitionRequest) => void
) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<ChapterTransitionRequest>).detail)
  }

  window.addEventListener(CHAPTER_TRANSITION_EVENT, listener)
  return () => window.removeEventListener(CHAPTER_TRANSITION_EVENT, listener)
}

export function dispatchChapterArrived(id: string) {
  window.dispatchEvent(new CustomEvent<string>(CHAPTER_ARRIVED_EVENT, { detail: id }))
}

export function onChapterArrived(callback: (id: string) => void) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<string>).detail)
  }

  window.addEventListener(CHAPTER_ARRIVED_EVENT, listener)
  return () => window.removeEventListener(CHAPTER_ARRIVED_EVENT, listener)
}

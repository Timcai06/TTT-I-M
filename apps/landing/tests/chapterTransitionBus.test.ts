import assert from 'node:assert/strict'
import test from 'node:test'
import {
  onChapterTransitionRequest,
  transitionToChapter,
  type ChapterTransitionRequest,
} from '../src/lib/chapterTransition.ts'

void test('a lazy transition listener receives the latest early navigation intent exactly once', async () => {
  transitionToChapter('frame', { updateHash: true })
  transitionToChapter('skills', { updateHash: false })

  const received: ChapterTransitionRequest[] = []
  const unsubscribe = onChapterTransitionRequest((request) => received.push(request))
  await new Promise<void>((resolve) => queueMicrotask(resolve))

  assert.deepEqual(received, [{ id: 'skills', updateHash: false }])

  transitionToChapter('projects', { updateHash: true })
  assert.deepEqual(received, [
    { id: 'skills', updateHash: false },
    { id: 'projects', updateHash: true },
  ])
  unsubscribe()
})

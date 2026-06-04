import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf8')
const providerSource = readFileSync('src/components/ChapterStateProvider.tsx', 'utf8')
const navSource = readFileSync('src/components/Nav.tsx', 'utf8')
const scrollIndicatorSource = readFileSync('src/components/ScrollIndicator.tsx', 'utf8')

const consumers = [
  ['src/components/Nav.tsx', navSource],
  ['src/components/ScrollIndicator.tsx', scrollIndicatorSource],
]

if (!appSource.includes('<ChapterStateProvider>')) {
  throw new Error('App must wrap navigation UI in ChapterStateProvider.')
}

if (!providerSource.includes('useActiveChapter')) {
  throw new Error('ChapterStateProvider must own the active chapter subscription.')
}

const directActiveReaders = consumers
  .filter(([, source]) => source.includes('useActiveChapter'))
  .map(([file]) => file)

if (directActiveReaders.length > 0) {
  throw new Error(`Navigation consumers must not read active chapter directly: ${directActiveReaders.join(', ')}`)
}

const missingContextConsumers = consumers
  .filter(([, source]) => !source.includes('useChapterState'))
  .map(([file]) => file)

if (missingContextConsumers.length > 0) {
  throw new Error(`Navigation consumers must use shared chapter state: ${missingContextConsumers.join(', ')}`)
}

console.log('[chapter-state-guards] navigation uses one shared chapter state provider.')

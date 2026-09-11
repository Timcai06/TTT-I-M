import { useSyncExternalStore } from 'react'

export const FILM_URL = '/projects/sciscope/sciscope-concept-film.mp4'

/**
 * The room's own sound, and the only audio the narrative plays.
 *
 * The cues used to be four byte offsets into sciscope-soundtrack.mp3 — the score of
 * a product film — so arriving at a chapter started that film's music at an
 * arbitrary bar. It was heard as exactly that: a video's backing track going off
 * for no reason. These are recordings of the things the room is made of instead:
 * paper, a drawer, a book closing. A room you sit in is made of texture, not score.
 *
 * There is one bed, not two. An interior layer was built first, from a recording
 * of an empty room, and it turned out to carry voices: measured at 33% of its
 * envelope energy in the 3-8Hz syllable band with 17% of its spectrum in the
 * 300-3400Hz speech band. No window of that source was clean, and no public-domain
 * replacement held still -- the best alternative was a fan recording that ramps
 * 35dB and clicks off at the end. A room with one opening in it does not need two
 * beds anyway: what the reader hears is the outside, arriving through the window,
 * louder as the camera approaches it.
 *
 * They live under /projects/ because `vercel.json`'s long-cache rule alternates on
 * `/(frame|life|projects|portrait|noise)/(.*)`. A new top-level directory would be
 * served with no cache header at all.
 */
export const ROOM_AUDIO = {
  window: '/projects/room/room-window.mp3',
  entry: '/projects/room/cue-entry.mp3',
  query: '/projects/room/cue-query.mp3',
  evidence: '/projects/room/cue-evidence.mp3',
  synthesis: '/projects/room/cue-synthesis.mp3',
} as const
export type RoomAudioName = keyof typeof ROOM_AUDIO

const urls = new Map<string, string>(), listeners = new Set<() => void>()
const roomAudio = new Map<RoomAudioName, AudioBuffer>()
let warmVideo: HTMLVideoElement | null = null
export const getPreparedRoomAudio = (name: RoomAudioName) => roomAudio.get(name) ?? null
export const getPreparedMediaUrl = (source: string) => urls.get(source) ?? source
export function usePreparedMediaUrl(source: string) {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => getPreparedMediaUrl(source), () => source)
}

async function prepareFilm(signal: AbortSignal) {
  const response = await fetch(FILM_URL, { signal })
  if (!response.ok) throw new Error('Site film download failed')
  const video = await response.blob()
  signal.throwIfAborted()
  const objectUrl = URL.createObjectURL(video)
  const element = document.createElement('video'); element.muted = true; element.preload = 'auto'; element.playsInline = true
  try {
    await new Promise<void>((resolve, reject) => {
      const clean = () => { signal.removeEventListener('abort', abort); element.onloadeddata = null; element.onerror = null }
      const abort = () => { clean(); reject(signal.reason instanceof Error ? signal.reason : new Error('Media preparation aborted')) }
      element.onloadeddata = () => { clean(); resolve() }
      element.onerror = () => { clean(); reject(new Error('Site film first frame could not decode')) }
      signal.addEventListener('abort', abort, { once: true }); element.src = objectUrl; element.load()
    })
    signal.throwIfAborted()
    const previous = urls.get(FILM_URL); if (previous) URL.revokeObjectURL(previous)
    warmVideo?.removeAttribute('src'); warmVideo?.load(); warmVideo = element
    urls.set(FILM_URL, objectUrl)
    listeners.forEach(listener => listener())
  } catch (error) { element.removeAttribute('src'); element.load(); URL.revokeObjectURL(objectUrl); throw error }
}

/**
 * Decoded in an OfflineAudioContext so no user gesture is needed: the intro has to
 * be able to prepare sound before the reader has decided whether they want it.
 * Each file settles on its own — one missing cue must not cost the others.
 */
async function prepareRoomAudio(signal: AbortSignal) {
  const context = new OfflineAudioContext(2, 1, 48000)
  const decoded = await Promise.allSettled((Object.entries(ROOM_AUDIO) as [RoomAudioName, string][]).map(async ([name, url]) => {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`Room audio download failed: ${name}`)
    const buffer = await context.decodeAudioData(await response.arrayBuffer())
    signal.throwIfAborted()
    roomAudio.set(name, buffer)
  }))
  signal.throwIfAborted()
  if (decoded.every(result => result.status === 'rejected')) throw new Error('No room audio could be decoded')
}

/**
 * Film and room audio settle independently, deliberately. They shared one
 * `Promise.all` and one `try` gated on the video's `loadeddata`, so a film whose
 * first frame failed to decode discarded audio that had already decoded — the room
 * went silent because of a video it never plays. Only a total loss fails the task,
 * and the task itself is optional, so neither can hold the intro.
 */
export async function prepareSiteMedia(signal: AbortSignal) {
  const [film, audio] = await Promise.allSettled([prepareFilm(signal), prepareRoomAudio(signal)])
  signal.throwIfAborted()
  if (film.status === 'rejected' && audio.status === 'rejected') throw film.reason
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  warmVideo?.removeAttribute('src'); warmVideo?.load(); warmVideo = null
  urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); roomAudio.clear()
})

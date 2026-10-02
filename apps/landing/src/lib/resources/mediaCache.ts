/**
 * The room's environmental sounds. The long music track is streamed separately
 * by SoundProvider after sound is enabled and the landing becomes live.
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

const roomAudio = new Map<RoomAudioName, AudioBuffer>()
export const getPreparedRoomAudio = (name: RoomAudioName) => roomAudio.get(name) ?? null

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
 * The room's sound, prepared during the intro. Films are not: the intro film fetches itself
 * (components/film/IntroFilm) and each project film loads when its play button is approached
 * (chapters/projects/ProjectFilm). The task is optional, so it can never hold the intro.
 */
export async function prepareSiteMedia(signal: AbortSignal) {
  await prepareRoomAudio(signal)
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  roomAudio.clear()
})

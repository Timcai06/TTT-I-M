import { useSyncExternalStore } from 'react'

export const FILM_URL = '/projects/sciscope/sciscope-concept-film.mp4'
export const SOUNDTRACK_URL = '/projects/sciscope/sciscope-soundtrack.mp3'
const urls = new Map<string, string>(), listeners = new Set<() => void>()
let soundtrack: AudioBuffer | null = null
let warmVideo: HTMLVideoElement | null = null
export const getPreparedSoundtrack = () => soundtrack
export const getPreparedMediaUrl = (source: string) => urls.get(source) ?? source
export function usePreparedMediaUrl(source: string) {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => getPreparedMediaUrl(source), () => source)
}

export async function prepareSiteMedia(signal: AbortSignal) {
  const [videoResponse, audioResponse] = await Promise.all([fetch(FILM_URL, { signal }), fetch(SOUNDTRACK_URL, { signal })])
  if (!videoResponse.ok || !audioResponse.ok) throw new Error('Site media download failed')
  const [video, audio] = await Promise.all([videoResponse.blob(), audioResponse.arrayBuffer()])
  signal.throwIfAborted()
  const decoded = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(audio)
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
    urls.set(FILM_URL, objectUrl); soundtrack = decoded
    listeners.forEach(listener => listener())
  } catch (error) { element.removeAttribute('src'); element.load(); URL.revokeObjectURL(objectUrl); throw error }
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  warmVideo?.removeAttribute('src'); warmVideo?.load(); warmVideo = null
  urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); soundtrack = null
})

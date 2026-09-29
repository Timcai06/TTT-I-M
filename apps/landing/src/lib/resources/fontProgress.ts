type FontStatus = 'unloaded' | 'loading' | 'loaded' | 'error'

/** Only faces requested by this document are part of its font-ready gate. */
export function fontLoadFraction(statuses: readonly FontStatus[], previous = 0): number {
  let active = 0, loaded = 0
  for (const status of statuses) {
    if (status === 'unloaded') continue
    active++
    if (status === 'loaded') loaded++
  }
  return Math.max(previous, active > 0 ? loaded / active : 0)
}

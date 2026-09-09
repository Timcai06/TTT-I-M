/** Freeze the actual visible reading composition, including live canvas imagery. */
export function readingSnapshot(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement
  clone.dataset.archiveClone = source.id
  clone.removeAttribute('id')
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
  clone.inert = true
  clone.querySelectorAll('img').forEach(image => { image.loading = 'eager' })
  const canvases = source.querySelectorAll('canvas')
  clone.querySelectorAll('canvas').forEach((canvas, i) => {
    const original = canvases[i]
    if (!original) return
    canvas.width = original.width; canvas.height = original.height
    try { canvas.getContext('2d')?.drawImage(original, 0, 0) } catch { canvas.style.visibility = 'hidden' }
  })
  const videos = source.querySelectorAll('video')
  clone.querySelectorAll('video').forEach((video, i) => {
    const original = videos[i]
    if (!original?.videoWidth) return
    const still = document.createElement('canvas')
    still.className = video.className; still.width = original.videoWidth; still.height = original.videoHeight
    try { still.getContext('2d')?.drawImage(original, 0, 0) } catch { still.style.visibility = 'hidden' }
    video.replaceWith(still)
  })
  // Nested bridges own separate room adapters and never belong to a reading snapshot.
  clone.querySelectorAll('.archive-bridge').forEach(node => node.remove())
  const rect = source.getBoundingClientRect()
  Object.assign(clone.style, { position: 'absolute', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', opacity: '1', transform: 'none', visibility: 'visible' })
  clone.querySelectorAll<HTMLElement>('[data-archive-live-target]').forEach(node => node.style.opacity = '1')
  return clone
}

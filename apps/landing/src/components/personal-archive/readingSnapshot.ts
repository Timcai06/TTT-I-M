/** Freeze the actual visible reading composition, including live canvas imagery. */
export function readingSnapshot(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement
  clone.dataset.archiveClone = source.id
  const theme = source.dataset.archiveReadingTheme || ({
    about: 'about', life: 'life', frame: 'frame', skills: 'stack', projects: 'work', contact: 'contact',
  } as const)[source.id as 'about' | 'life' | 'frame' | 'skills' | 'projects' | 'contact']
  if (theme) clone.dataset.archiveReadingTheme = theme
  clone.removeAttribute('id')
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
  clone.inert = true
  const images = source.querySelectorAll('img')
  clone.querySelectorAll('img').forEach((image,index) => {
    image.loading = 'eager'
    image.removeAttribute('srcset'); image.removeAttribute('sizes')
    image.src = images[index]?.currentSrc || images[index]?.src || image.src
  })
  clone.querySelectorAll('picture source').forEach(node => node.remove())
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
  // Hold the tail of the chapter in view. The offset is the source's live viewport
  // rect, which is right when the capture happens as the chapter is leaving. If it
  // happens later, the raw rect would park the clone entirely outside its container
  // and the panel would show blank paper, so clamp it to the last screen instead.
  const container = Math.max(0, source.parentElement?.clientHeight ?? rect.height)
  const top = Math.min(0, Math.max(rect.top, container - rect.height))
  Object.assign(clone.style, { position: 'absolute', top: `${top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', opacity: '1', transform: 'none', visibility: 'visible' })
  for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('[data-archive-live-target]')]) {
    node.style.opacity = '1'; node.style.visibility = 'visible'
    node.style.setProperty('--archive-live-target','1')
  }
  return clone
}

import { ScrollTrigger } from './gsap'
import { getLenis } from './lenis'
import { scrollToChapter } from './chapterScroll'
import { getPreparedArchiveRuntime } from '../components/personal-archive/archiveRuntime'
import { createArchiveProgress } from '../components/personal-archive/scrollPose'
import type { ArchiveView } from '../components/personal-archive/archiveDirector'
import { setStage } from './stage'

const viewByChapter: Record<string, ArchiveView> = {
  hero: 'home', about: 'about', life: 'life', frame: 'frame', skills: 'stack', 'work-transition': 'stack', projects: 'work', contact: 'contact',
}

let cancelActiveRoute: (() => void) | null = null

export function cancelArchiveRouting() {
  cancelActiveRoute?.()
}

function frame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function cloneViewport(element: HTMLElement, label: string) {
  const layer = document.createElement('div')
  layer.className = `archive-route-layer archive-route-layer--${label}`
  layer.setAttribute('aria-hidden', 'true')
  const clone = element.cloneNode(true) as HTMLElement
  clone.dataset.archiveClone = element.id
  const computed = getComputedStyle(element)
  for (const token of ['--bg','--bg-soft','--bg-elev','--fg','--fg-soft','--fg-mute','--fg-dim','--line','--accent','--accent-warm']) {
    clone.style.setProperty(token, computed.getPropertyValue(token))
  }
  clone.removeAttribute('id')
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
  clone.inert = true
  const originalCanvases = element.querySelectorAll('canvas')
  clone.querySelectorAll('canvas').forEach((canvas, index) => {
    const source = originalCanvases[index]
    if (!source) return
    canvas.width = source.width; canvas.height = source.height
    try { canvas.getContext('2d')?.drawImage(source, 0, 0) } catch { canvas.style.visibility = 'hidden' }
  })
  const originalVideos = element.querySelectorAll('video')
  clone.querySelectorAll('video').forEach((video, index) => {
    const source = originalVideos[index]
    if (!source || source.videoWidth <= 0 || source.videoHeight <= 0) return
    const still = document.createElement('canvas')
    still.className = video.className
    still.width = source.videoWidth; still.height = source.videoHeight
    try { still.getContext('2d')?.drawImage(source, 0, 0) } catch { still.style.visibility = 'hidden' }
    video.replaceWith(still)
  })
  const rect = element.getBoundingClientRect()
  Object.assign(clone.style, {
    position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
    height: `${rect.height}px`, margin: '0', transform: 'none', opacity: '1', pointerEvents: 'none',
  })
  layer.appendChild(clone)
  document.body.appendChild(layer)
  return layer
}

function bridgeDestination(bridge: HTMLElement, progress = .55) {
  const trigger = ScrollTrigger.getAll().find(item => item.trigger === bridge)
  if (trigger && Number.isFinite(trigger.start) && Number.isFinite(trigger.end)) {
    return trigger.start + (trigger.end - trigger.start) * progress
  }
  const top = bridge.getBoundingClientRect().top + scrollY
  return top - innerHeight + (bridge.offsetHeight - innerHeight) * progress
}

function jumpTo(top: number) {
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
  else window.scrollTo({ top, behavior: 'auto' })
}

async function playRoute({ source, from, to, land, expandTarget }: {
  source: HTMLElement
  from: ArchiveView
  to: ArchiveView
  land: () => void
  expandTarget: HTMLElement | null
}) {
  cancelActiveRoute?.()
  const runtime = getPreparedArchiveRuntime()
  if (!runtime || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    land(); return true
  }

  const sourceLayer = cloneViewport(source, 'source')
  const progress = createArchiveProgress()
  let failed = false
  const detach = runtime.navigate(from, to, progress, { ready() {}, pending() {}, failed() { failed = true } })
  if (failed) { sourceLayer.remove(); detach(); land(); return true }
  const sourceMatrix = getComputedStyle(document.documentElement).getPropertyValue('--archive-route-source-matrix').trim()
  const targetMatrix = getComputedStyle(document.documentElement).getPropertyValue('--archive-route-target-matrix').trim()
  let cancelled = false
  let raf = 0
  let sourceAnimation: Animation | null = null
  let targetAnimation: Animation | null = null
  let targetLayer: HTMLElement | null = null
  let settleAnimation: (() => void) | null = null
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    cancelAnimationFrame(raf)
    settleAnimation?.()
    sourceAnimation?.cancel(); targetAnimation?.cancel()
    sourceLayer.remove(); targetLayer?.remove(); detach()
    delete document.documentElement.dataset.archiveRouting
    setStage('live')
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchmove', cancel)
    window.removeEventListener('keydown', cancelKey)
    if (cancelActiveRoute === cancel) cancelActiveRoute = null
  }
  const cancel = () => { if (cancelled) return; cancelled = true; cleanup() }
  const cancelKey = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancel()
  }
  cancelActiveRoute = cancel
  window.addEventListener('wheel', cancel, { passive: true })
  window.addEventListener('touchmove', cancel, { passive: true })
  window.addEventListener('keydown', cancelKey)
  try {
    setStage('transitioning')
    document.documentElement.dataset.archiveRouting = 'true'
    land()
    await frame(); await frame()
    if (cancelled) return false
    if (expandTarget) targetLayer = cloneViewport(expandTarget, 'target')
    sourceAnimation = sourceLayer.animate([
      { transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', opacity: 1, filter: 'blur(0)' },
      { transform: sourceMatrix, opacity: 0, filter: 'blur(0)' },
    ], { duration: 390, easing: 'cubic-bezier(.55,0,.85,.25)', fill: 'forwards' })
    if (targetLayer) {
      targetAnimation = targetLayer.animate([
        { transform: targetMatrix, opacity: 0, filter: 'blur(0)' },
        { transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)', opacity: 1, filter: 'blur(0)' },
      ], { duration: 350, delay: 1200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' })
    }
    const started = performance.now()
    await new Promise<void>((resolve) => {
      let settled = false
      settleAnimation = () => { if (settled) return; settled = true; resolve() }
      const tick = (now: number) => {
        if (cancelled) { settleAnimation?.(); return }
        const elapsed = now - started
        progress.set(Math.max(0, Math.min(1, (elapsed - 390) / 810)))
        if (elapsed >= 1560) { settleAnimation?.(); return }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return !cancelled
  } catch (error) {
    console.error('[personal-archive] Direct route failed', error)
    return false
  } finally {
    cleanup()
  }
}

export function routeBetweenChapters(source: HTMLElement, targetId: string, updateHash: boolean) {
  const target = document.getElementById(targetId)
  const sourceId = source.dataset.archiveTarget ?? source.id
  const from = viewByChapter[sourceId] ?? 'home'
  const to = viewByChapter[targetId] ?? 'home'
  if (!target) return Promise.resolve(false)
  return playRoute({
    source, from, to, expandTarget: target,
    land: () => scrollToChapter(targetId, { immediate: true, updateHash, restore: true }),
  })
}

export function routeToArchiveObject(chapterId: string) {
  const source = document.getElementById(chapterId)
  const bridge = document.querySelector<HTMLElement>(`[data-archive-target="${CSS.escape(chapterId)}"]`)
  if (!source || !bridge) return Promise.resolve(false)
  const view = viewByChapter[chapterId] ?? 'home'
  return playRoute({ source, from: view, to: view, expandTarget: null, land: () => jumpTo(bridgeDestination(bridge, chapterId === 'about' ? .48 : .56)) })
}

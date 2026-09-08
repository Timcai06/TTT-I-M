import { gsap } from './gsap'
import type { ImagePlacement } from './canvas-ui/particlePortalMath'
import { measureImagePlacement } from './canvas-ui/particlePortal'
import type { ParticlePortalRequest } from './particlePortal'

function fullImage(placement: ImagePlacement) {
  const { rect, uvMin, uvMax } = placement
  const width = rect.width / (uvMax.x - uvMin.x), height = rect.height / (uvMax.y - uvMin.y)
  return { x: rect.left - uvMin.x * width, y: rect.top - uvMin.y * height, width, height }
}
const clip = (p: ImagePlacement) => `inset(${Math.max(0, p.rect.top)}px ${Math.max(0, innerWidth - p.rect.left - p.rect.width)}px ${Math.max(0, innerHeight - p.rect.top - p.rect.height)}px ${Math.max(0, p.rect.left)}px)`
const visible = (p: ImagePlacement) => p.rect.top < innerHeight && p.rect.top + p.rect.height > 0 && p.rect.left < innerWidth && p.rect.left + p.rect.width > 0

/** Animate the full image and its crop independently, preserving its aspect ratio. */
export async function runCaseImageTransition(request: ParticlePortalRequest, commit: () => Promise<void>, signal: AbortSignal,
  setTimeline: (timeline: gsap.core.Timeline | null) => void) {
  const start = measureImagePlacement(request.source)
  if (!start || !visible(start) || signal.aborted) { await commit(); return }
  const overlay = document.createElement('div')
  overlay.className = 'case-image-transition'
  overlay.setAttribute('aria-hidden', 'true'); overlay.inert = true
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden;'
  overlay.style.clipPath = clip(start)
  const image = document.createElement('img')
  image.src = request.source.currentSrc || request.source.src; image.alt = ''
  image.style.cssText = 'position:absolute;left:0;top:0;max-width:none;max-height:none;transform-origin:0 0;will-change:transform;'
  const from = fullImage(start)
  image.style.width = `${from.width}px`; image.style.height = `${from.height}px`
  image.style.transform = `translate(${from.x}px,${from.y}px)`
  overlay.append(image); document.body.append(overlay)
  const sourceVisibility = request.source.style.visibility
  let target: HTMLImageElement | null = null, targetVisibility = ''
  let timer = 0, poll = 0
  let finishWait = () => {}
  const animation: { timeline: gsap.core.Timeline | null } = { timeline: null }
  let finishAnimation = () => {}
  const finish = () => { finishWait(); animation.timeline?.progress(1); finishAnimation() }
  signal.addEventListener('abort', finish, { once: true })
  window.addEventListener('resize', finish, { once: true })
  document.body.dataset.caseImageTransition = request.mode
  try {
    // Navigation is immediate; a slow image or missing target never delays it.
    await commit()
    if (signal.aborted) return
    request.source.style.visibility = 'hidden'
    target = await new Promise<HTMLImageElement | null>(resolve => {
      let settled = false
      const done = (value: HTMLImageElement | null) => { if (!settled) { settled = true; clearInterval(poll); clearTimeout(timer); resolve(value) } }
      finishWait = () => done(null)
      const check = () => {
        const candidate = request.resolveTarget()
        if (!candidate?.complete || !candidate.naturalWidth) return
        const placement = measureImagePlacement(candidate)
        if (placement && visible(placement)) done(candidate)
      }
      poll = window.setInterval(check, 16); timer = window.setTimeout(() => done(null), 700); check()
    })
    if (!target || signal.aborted) return
    const end = measureImagePlacement(target)
    if (!end) return
    const to = fullImage(end)
    targetVisibility = target.style.visibility; target.style.visibility = 'hidden'
    await new Promise<void>(resolve => {
      finishAnimation = resolve
      const timeline = gsap.timeline({ onComplete: resolve })
      animation.timeline = timeline
      setTimeline(timeline)
      timeline.to(image, { x: to.x, y: to.y, scaleX: to.width / from.width, scaleY: to.height / from.height, duration: .82, ease: 'power3.inOut' }, 0)
        .to(overlay, { clipPath: clip(end), duration: .82, ease: 'power3.inOut' }, 0)
      // Ticker stalls must release the image and restore the real target.
      timer = window.setTimeout(finish, 1300)
    })
  } finally {
    clearTimeout(timer); clearInterval(poll); animation.timeline?.kill(); setTimeline(null)
    signal.removeEventListener('abort', finish); window.removeEventListener('resize', finish)
    request.source.style.visibility = sourceVisibility
    if (target) target.style.visibility = targetVisibility
    overlay.remove(); delete document.body.dataset.caseImageTransition
  }
}

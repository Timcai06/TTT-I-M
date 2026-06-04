import { useEffect, useMemo, useRef, useState } from 'react'
import { navChapters, progressChapters } from '../chapters/registry'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  dispatchChapterArrived,
  onChapterTransitionRequest,
  transitionToChapter,
  type ChapterTransitionRequest,
} from '../lib/chapterTransition'
import { scrollToChapter } from '../lib/chapterScroll'
import { getLenis } from '../lib/lenis'
import { prefersReducedMotion } from '../lib/motion'

const transitionChapters = navChapters.map((chapter) => {
  const progress = progressChapters.find((entry) => entry.id === chapter.id)?.progress
  return {
    id: chapter.id,
    index: progress?.index ?? chapter.nav.label.slice(0, 2),
    label: chapter.nav.label.replace(/^\d+\s*·\s*/, ''),
    name: progress?.name ?? chapter.nav.label,
  }
})

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

export default function ChapterTransition() {
  const rootRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLSpanElement>(null)
  const busyRef = useRef(false)
  const queuedRef = useRef<ChapterTransitionRequest | null>(null)
  const [active, setActive] = useState(false)
  const [targetId, setTargetId] = useState<string>('hero')

  const target = useMemo(
    () => transitionChapters.find((chapter) => chapter.id === targetId) ?? transitionChapters[0],
    [targetId]
  )

  useEffect(() => {
    const runTransition = async (request: ChapterTransitionRequest) => {
      if (busyRef.current) {
        queuedRef.current = request
        return
      }

      if (prefersReducedMotion()) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        return
      }

      busyRef.current = true
      setTargetId(request.id)
      setActive(true)
      await nextFrame()

      const root = rootRef.current
      if (!root) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        busyRef.current = false
        return
      }

      const lenis = getLenis()
      lenis?.stop()

      const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item'))
      const activeItem = root.querySelector<HTMLElement>('.chapter-transition__item.is-target')
      const caption = root.querySelector<HTMLElement>('.chapter-transition__caption')
      const targetText = root.querySelector<HTMLElement>('.chapter-transition__target')
      const grid = root.querySelector<HTMLElement>('.chapter-transition__grid')
      const rail = railRef.current

      gsap.set(root, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1, pointerEvents: 'auto' })
      gsap.set(items, { yPercent: 120, opacity: 0, skewY: 5 })
      gsap.set([caption, targetText], { y: 24, opacity: 0 })
      gsap.set(grid, { opacity: 0 })
      gsap.set(rail, { scaleX: 0, transformOrigin: 'left center' })

      await new Promise<void>((resolve) => {
        gsap.timeline({
          defaults: { ease: 'power4.inOut' },
          onComplete: resolve,
        })
          .to(root, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.48 })
          .to(grid, { opacity: 1, duration: 0.32, ease: 'power2.out' }, '<0.12')
          .to(items, {
            yPercent: 0,
            opacity: 1,
            skewY: 0,
            duration: 0.62,
            stagger: 0.045,
          }, '<0.04')
          .to([caption, targetText], { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out' }, '<0.14')
          .to(rail, { scaleX: 1, duration: 0.52, ease: 'power2.inOut' }, '<0.1')
          .to(activeItem, { x: 18, duration: 0.26, ease: 'power2.out' }, '>-0.08')
          .call(() => {
            scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
            window.requestAnimationFrame(() => {
              ScrollTrigger.refresh()
              ScrollTrigger.update()
              dispatchChapterArrived(request.id)
            })
          })
          .to(activeItem, { x: 0, duration: 0.18, ease: 'power2.in' })
          .to(items, {
            yPercent: -115,
            opacity: 0,
            skewY: -4,
            duration: 0.42,
            stagger: 0.032,
            ease: 'power3.in',
          }, '+=0.08')
          .to([caption, targetText], { y: -18, opacity: 0, duration: 0.28, ease: 'power2.in' }, '<')
          .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.58 }, '<0.08')
      })

      gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
      setActive(false)
      lenis?.start()
      busyRef.current = false

      const queued = queuedRef.current
      queuedRef.current = null
      if (queued) void runTransition(queued)
    }

    return onChapterTransitionRequest((request) => {
      void runTransition(request)
    })
  }, [])

  return (
    <div
      className={`chapter-transition${active ? ' is-active' : ''}`}
      ref={rootRef}
      aria-hidden={!active}
    >
      <div className="chapter-transition__chrome">
        <span>// Chapter jump</span>
        <span>Tim Cai · Portfolio</span>
      </div>
      <div className="chapter-transition__grid" aria-hidden="true" />
      <div className="chapter-transition__content">
        <div className="chapter-transition__caption">next section</div>
        <div className="chapter-transition__target">
          <span>{target?.index}</span>
          <strong>{target?.name}</strong>
        </div>
        <nav className="chapter-transition__nav" aria-label="Chapter transition">
          {transitionChapters.map((chapter) => (
            <button
              className={`chapter-transition__item${chapter.id === targetId ? ' is-target' : ''}`}
              key={chapter.id}
              onClick={() => transitionToChapter(chapter.id, { updateHash: true })}
              type="button"
            >
              <span className="chapter-transition__item-index">{chapter.index}</span>
              <span className="chapter-transition__item-name">{chapter.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <span className="chapter-transition__rail" ref={railRef} />
    </div>
  )
}

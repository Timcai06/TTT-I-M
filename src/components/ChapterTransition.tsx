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
import { usePretextTextInteraction } from '../lib/pretextIntroText'

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

function splitText(text: string, className: string) {
  return text.split('').map((char, index) => {
    const displayChar = char === ' ' ? '\u00a0' : char
    return (
      <span className={className} data-final={char} key={`${char}-${index}`}>
        {displayChar}
      </span>
    )
  })
}

function TransitionField({ active, targetId }: { active: boolean; targetId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let frame = 0
    let cleanup = () => {}

    void import('three').then((THREE) => {
      if (disposed) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90)
      camera.position.z = 18

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        canvas,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

      const count = 420
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const color = new THREE.Color(targetId === 'frame' ? '#f1b56c' : targetId === 'projects' ? '#7cc7ff' : '#ea412d')

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        positions[i3] = (Math.random() - 0.5) * 32
        positions[i3 + 1] = (Math.random() - 0.5) * 18
        positions[i3 + 2] = (Math.random() - 0.5) * 24
        colors[i3] = color.r * (0.55 + Math.random() * 0.45)
        colors[i3 + 1] = color.g * (0.55 + Math.random() * 0.45)
        colors[i3 + 2] = color.b * (0.55 + Math.random() * 0.45)
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const material = new THREE.PointsMaterial({
        opacity: 0.62,
        size: 0.055,
        transparent: true,
        vertexColors: true,
      })
      const points = new THREE.Points(geometry, material)
      scene.add(points)

      const resize = () => {
        const { innerWidth, innerHeight } = window
        renderer.setSize(innerWidth, innerHeight, false)
        camera.aspect = innerWidth / innerHeight
        camera.updateProjectionMatrix()
      }

      const tick = () => {
        if (disposed) return
        points.rotation.y += 0.0028
        points.rotation.x = Math.sin(performance.now() * 0.0004) * 0.08
        renderer.render(scene, camera)
        frame = window.requestAnimationFrame(tick)
      }

      resize()
      window.addEventListener('resize', resize, { passive: true })
      tick()

      cleanup = () => {
        window.removeEventListener('resize', resize)
        window.cancelAnimationFrame(frame)
        geometry.dispose()
        material.dispose()
        renderer.dispose()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [active, targetId])

  return <canvas className="chapter-transition__field" ref={canvasRef} aria-hidden="true" />
}

export default function ChapterTransition() {
  const rootRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLSpanElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
  const busyRef = useRef(false)
  const queuedRef = useRef<ChapterTransitionRequest | null>(null)
  const [active, setActive] = useState(false)
  const [pretextReady, setPretextReady] = useState(false)
  const [pretextRefreshKey, setPretextRefreshKey] = useState(0)
  const [targetId, setTargetId] = useState<string>('hero')

  const target = useMemo(
    () => transitionChapters.find((chapter) => chapter.id === targetId) ?? transitionChapters[0],
    [targetId]
  )

  usePretextTextInteraction(targetNameRef, {
    enabled: active && pretextReady,
    glyphSelector: '.chapter-transition__target-glyph',
    refreshKey: pretextRefreshKey,
    strength: 0.5,
    text: target?.name ?? '',
  })

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
      setPretextReady(false)
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
      const itemChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__item-char'))
      const activeItem = root.querySelector<HTMLElement>('.chapter-transition__item.is-target')
      const caption = root.querySelector<HTMLElement>('.chapter-transition__caption')
      const targetText = root.querySelector<HTMLElement>('.chapter-transition__target')
      const targetChars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.chapter-transition__target-glyph'))
      const grid = root.querySelector<HTMLElement>('.chapter-transition__grid')
      const field = root.querySelector<HTMLElement>('.chapter-transition__field')
      const rail = railRef.current

      gsap.set(root, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1, pointerEvents: 'auto' })
      gsap.set(items, { opacity: 1 })
      gsap.set(itemChars, { yPercent: 120, opacity: 0, skewY: 6 })
      gsap.set(targetChars, { yPercent: 115, opacity: 0, rotate: 4 })
      gsap.set([caption, targetText], { y: 24, opacity: 0 })
      gsap.set([grid, field], { opacity: 0 })
      gsap.set(rail, { scaleX: 0, transformOrigin: 'left center' })

      await new Promise<void>((resolve) => {
        gsap.timeline({
          defaults: { ease: 'power4.inOut' },
          onComplete: resolve,
        })
          .to(root, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.48 })
          .to([grid, field], { opacity: 1, duration: 0.42, ease: 'power2.out' }, '<0.08')
          .to(itemChars, {
            yPercent: 0,
            opacity: 1,
            skewY: 0,
            duration: 0.62,
            stagger: 0.012,
          }, '<0.04')
          .to([caption, targetText], { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out' }, '<0.14')
          .to(targetChars, {
            yPercent: 0,
            opacity: 1,
            rotate: 0,
            duration: 0.68,
            stagger: 0.024,
            ease: 'expo.out',
          }, '<0.02')
          .to(rail, { scaleX: 1, duration: 0.52, ease: 'power2.inOut' }, '<0.1')
          .call(() => {
            setPretextReady(true)
            setPretextRefreshKey((key) => key + 1)
          })
          .to(activeItem, { x: 18, duration: 0.26, ease: 'power2.out' }, '>-0.08')
          .call(() => {
            setPretextReady(false)
            scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
            window.requestAnimationFrame(() => {
              ScrollTrigger.refresh()
              ScrollTrigger.update()
              dispatchChapterArrived(request.id)
            })
          })
          .to(activeItem, { x: 0, duration: 0.18, ease: 'power2.in' })
          .to(itemChars, {
            yPercent: -115,
            opacity: 0,
            skewY: -4,
            duration: 0.42,
            stagger: 0.01,
            ease: 'power3.in',
          }, '+=0.08')
          .to(targetChars, { yPercent: -100, opacity: 0, duration: 0.34, stagger: 0.012, ease: 'power3.in' }, '<')
          .to([caption, targetText], { y: -18, opacity: 0, duration: 0.28, ease: 'power2.in' }, '<')
          .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.58 }, '<0.08')
      })

      gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
      setActive(false)
      setPretextReady(false)
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
      <TransitionField active={active} targetId={targetId} />
      <div className="chapter-transition__chrome">
        <span>// Chapter jump</span>
        <span>Tim Cai · Portfolio</span>
      </div>
      <div className="chapter-transition__grid" aria-hidden="true" />
      <div className="chapter-transition__content">
        <div className="chapter-transition__caption">next section</div>
        <div className="chapter-transition__target">
          <span>{target?.index}</span>
          <strong>
            <span className="chapter-transition__target-name" ref={targetNameRef}>
              {splitText(target?.name ?? '', 'chapter-transition__target-glyph')}
            </span>
          </strong>
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
              <span className="chapter-transition__item-name">
                {splitText(chapter.label, 'chapter-transition__item-char')}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <span className="chapter-transition__rail" ref={railRef} />
    </div>
  )
}

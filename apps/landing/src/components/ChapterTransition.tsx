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
import { getStage, setStage } from '../lib/stage'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../lib/webgl/contextRegistry'
import { getGLQualityProfile } from '../lib/webgl/quality'
import { createTransitionTimeline } from '../lib/timelines/transitionTimeline'
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
    const quality = getGLQualityProfile()
    if (quality.transitionParticles <= 0) return
    // The field is ambient: if the WebGL context budget is tight (Hero + About
    // already live), skip it and let the CSS grid carry the transition rather
    // than spawning a third/fourth context at the heaviest moment.
    if (!canAcquireOptionalSurface()) return
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let frame = 0
    let cleanup = () => {}
    acquireContext()

    void import('three').then((THREE) => {
      if (disposed) return

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x070707, 0.048)
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90)
      camera.position.z = 20

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        canvas,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dprMax))

      const count = quality.transitionParticles
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const color = new THREE.Color(targetId === 'frame' ? '#b7844d' : targetId === 'projects' ? '#557b92' : '#8c2c22')

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        positions[i3] = (Math.random() - 0.5) * 38
        positions[i3 + 1] = (Math.random() - 0.5) * 20
        positions[i3 + 2] = -Math.random() * 28
        const tone = 0.22 + Math.random() * 0.28
        colors[i3] = color.r * tone
        colors[i3 + 1] = color.g * tone
        colors[i3 + 2] = color.b * tone
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const material = new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.34,
        size: 0.038,
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
        points.rotation.y += 0.0012
        points.rotation.x = Math.sin(performance.now() * 0.00022) * 0.035
        points.position.z = Math.sin(performance.now() * 0.00016) * 0.7
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
      releaseContext()
    }
  }, [active, targetId])

  return <canvas className="chapter-transition__field" ref={canvasRef} aria-hidden="true" />
}

export default function ChapterTransition() {
  const rootRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLSpanElement>(null)
  const targetNameRef = useRef<HTMLSpanElement>(null)
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
      if (getStage() === 'transitioning') {
        queuedRef.current = request
        return
      }

      if (prefersReducedMotion()) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        return
      }

      // Entering `transitioning` freezes Lenis and pauses heavy WebGL surfaces
      // (Hero portrait) via their stage subscriptions — no imperative wiring here.
      setStage('transitioning')
      setPretextReady(false)
      setTargetId(request.id)
      setActive(true)
      await nextFrame()

      const root = rootRef.current
      if (!root) {
        scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
        setStage('live')
        return
      }

      await new Promise<void>((resolve) => {
        createTransitionTimeline(root, railRef.current, {
          onRevealTarget: () => {
            setPretextReady(true)
            setPretextRefreshKey((key) => key + 1)
          },
          onLand: () => {
            setPretextReady(false)
            scrollToChapter(request.id, { immediate: true, updateHash: request.updateHash })
            window.requestAnimationFrame(() => {
              requestScrollRefresh(true)
              ScrollTrigger.update()
              dispatchChapterArrived(request.id)
            })
          },
          onComplete: resolve,
        })
      })

      gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
      setActive(false)
      setPretextReady(false)
      // Back to `live` resumes Lenis (stage subscription) and re-arms the queue.
      setStage('live')

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

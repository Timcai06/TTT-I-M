import { useEffect, useRef } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'
import { buildTextParticleField } from '../lib/textParticles'

interface Particle {
  sx: number
  sy: number
  tx: number
  ty: number
  delay: number
}

interface Props {
  text: string
  className?: string
  /** Target glyph size at desktop width; scaled down to fit narrow columns. */
  fontSize?: number
  color?: string
}

/**
 * Signature "particle ⇄ text" reveal (Phase B MVP, 2D canvas).
 *
 * Native measureText lays the line out once; filled pixels become particle
 * targets. As the block scrolls through the viewport, particles condense from a
 * scattered cloud into the words (and dissolve on the way back) — echoing the
 * hero portrait's particle motif. Drawing happens only on scroll ticks (no idle
 * rAF), and the loop is parked entirely while the block is off-screen.
 *
 * The real text ships as a visually-hidden span for AT/SEO; under reduced
 * motion the canvas is skipped and that span is shown as ordinary type.
 */
export default function TextParticles({
  text,
  className = '',
  fontSize = 72,
  color = '#e8e8ea',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    if (prefersReducedMotion()) {
      wrap.classList.add('text-particles--static')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      wrap.classList.add('text-particles--static')
      return
    }

    let particles: Particle[] = []
    let width = 0
    let height = 0
    let dpr = 1
    let progress = 0
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.max(1, wrap.clientWidth)
      const fs = Math.max(26, Math.min(fontSize, cw / 6.5))
      const serif =
        getComputedStyle(wrap).getPropertyValue('--font-serif').trim() || 'serif'

      const field = buildTextParticleField({
        text,
        maxWidth: cw,
        fontSize: fs,
        fontFamily: serif,
        fontWeight: 500,
        sampleGap: 4,
        maxTargets: 5200,
      })

      width = field.width
      height = field.height
      wrap.style.height = `${height}px`
      canvas.width = Math.ceil(width * dpr)
      canvas.height = Math.ceil(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const reach = Math.max(width, height)
      particles = field.targets.map((t) => {
        const ang = Math.random() * Math.PI * 2
        const rad = reach * (0.35 + Math.random() * 0.75)
        return {
          tx: t.x,
          ty: t.y,
          sx: width / 2 + Math.cos(ang) * rad,
          sy: height / 2 + Math.sin(ang) * rad,
          delay: Math.random(),
        }
      })
    }

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = color
      const p = progress
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i]!
        // Per-particle stagger: each forms inside a 0.6-wide window offset by
        // its delay, so the words assemble edge-first instead of all at once.
        const local = Math.min(1, Math.max(0, (p - pt.delay * 0.4) / 0.6))
        const e = easeOut(local)
        const x = pt.sx + (pt.tx - pt.sx) * e
        const y = pt.sy + (pt.ty - pt.sy) * e
        ctx.globalAlpha = 0.12 + 0.88 * e
        ctx.fillRect(x, y, 1.4, 1.4)
      }
      ctx.globalAlpha = 1
    }

    build()
    draw()

    const st = ScrollTrigger.create({
      trigger: wrap,
      start: 'top 85%',
      end: 'top 32%',
      scrub: true,
      onUpdate: (self) => {
        progress = self.progress
        draw()
      },
    })
    // Seed from current scroll so a deep-link straight into About isn't stuck
    // scattered until the first scroll tick.
    progress = st.progress
    draw()

    // Re-layout once the serif web font loads — otherwise the first build
    // samples the fallback glyph shapes and the particles form the wrong type.
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (cancelled) return
      build()
      draw()
      ScrollTrigger.refresh()
    })

    let resizeRaf = 0
    const onResize = () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        build()
        draw()
        ScrollTrigger.refresh()
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('resize', onResize)
      st.kill()
    }
  }, [text, fontSize, color])

  return (
    <div ref={wrapRef} className={`text-particles ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="text-particles__sr">{text}</span>
    </div>
  )
}

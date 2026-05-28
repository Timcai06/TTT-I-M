import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

const NUM_POINTS = 10
const NUM_PATHS = 2

function buildPath(points: number[], reveal: boolean) {
  let d = reveal ? `M 0 0 V ${points[0]} C` : `M 0 ${points[0]} C`
  for (let j = 0; j < NUM_POINTS - 1; j++) {
    const p = ((j + 1) / (NUM_POINTS - 1)) * 100
    const cp = p - (1 / (NUM_POINTS - 1)) * 100 / 2
    d += ` ${cp} ${points[j]} ${cp} ${points[j + 1]} ${p} ${points[j + 1]}`
  }
  d += reveal ? ' V 100 H 0' : ' V 0 H 0'
  return d
}

export default function Footer() {
  const root = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const allPointsRef = useRef<number[][]>([])
  const pathsRef = useRef<SVGPathElement[]>([])

  useEffect(() => {
    if (!root.current || !svgRef.current) return

    const svgPaths = svgRef.current.querySelectorAll<SVGPathElement>('.shape-overlays__path')
    pathsRef.current = Array.from(svgPaths)

    const allPoints: number[][] = []
    for (let i = 0; i < NUM_PATHS; i++) {
      const pts: number[] = []
      for (let j = 0; j < NUM_POINTS; j++) pts.push(100)
      allPoints.push(pts)
    }
    allPointsRef.current = allPoints

    function render() {
      for (let i = 0; i < NUM_PATHS; i++) {
        const path = pathsRef.current[i]
        if (!path) continue
        path.setAttribute('d', buildPath(allPoints[i], true))
      }
    }

    const ctx = gsap.context(() => {
      // Liquid SVG reveal
      const pointsDelay: number[] = []
      for (let i = 0; i < NUM_POINTS; i++) {
        pointsDelay[i] = Math.random() * 0.3
      }

      const liquidTl = gsap.timeline({
        onUpdate: render,
        scrollTrigger: {
          trigger: '.footer__liquid',
          start: 'top 90%',
          end: 'top 30%',
          scrub: 1.2,
        },
        defaults: {
          ease: 'power2.inOut',
          duration: 0.9,
        },
      })

      for (let i = 0; i < NUM_PATHS; i++) {
        const points = allPoints[i]
        const pathDelay = 0.25 * i
        for (let j = 0; j < NUM_POINTS; j++) {
          liquidTl.to(points, { [j]: 0 }, pointsDelay[j] + pathDelay)
        }
      }

      // CTA reveal
      gsap.fromTo(
        '.footer__cta-line',
        { yPercent: 100 },
        {
          scrollTrigger: { trigger: '.footer__cta', start: 'top 80%' },
          yPercent: 0,
          duration: 2.0,
          ease: 'expo.out',
          stagger: 0.12,
        }
      )

      // Contact items reveal
      gsap.from('.footer__contact-item', {
        scrollTrigger: { trigger: '.footer__contact', start: 'top 88%' },
        opacity: 0,
        y: 32,
        duration: 1.6,
        stagger: 0.12,
        ease: 'expo.out',
      })

      // Meta reveal
      gsap.from('.footer__meta > *', {
        scrollTrigger: { trigger: '.footer__meta', start: 'top 90%' },
        opacity: 0,
        y: 24,
        duration: 1.8,
        stagger: 0.15,
        ease: 'expo.out',
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <footer className="footer" id="contact" ref={root}>
      {/* Liquid SVG transition */}
      <div className="footer__liquid">
        <svg
          ref={svgRef}
          className="shape-overlays"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="liquid-g1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7890a8" />
              <stop offset="100%" stopColor="#0a0a0a" />
            </linearGradient>
            <linearGradient id="liquid-g2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d6c5a8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7890a8" />
            </linearGradient>
          </defs>
          <path className="shape-overlays__path" fill="url(#liquid-g2)" />
          <path className="shape-overlays__path" fill="url(#liquid-g1)" />
        </svg>
      </div>

      <div className="container">
        <div className="footer__kicker">// GET IN TOUCH · 联系方式</div>

        <h2 className="footer__cta">
          <span className="split-line"><span className="footer__cta-line split-line__inner">Let&apos;s build</span></span>
          <span className="split-line"><span className="footer__cta-line split-line__inner"><em>something</em></span></span>
          <span className="split-line"><span className="footer__cta-line split-line__inner">
            <a href="mailto:cairentian932@gmail.com">that lasts.</a>
          </span></span>
        </h2>

        <div className="footer__contact">
          <div className="footer__contact-item">
            <div className="footer__contact-label">Email</div>
            <a href="mailto:cairentian932@gmail.com">cairentian932@gmail.com</a>
          </div>
          <div className="footer__contact-item">
            <div className="footer__contact-label">Phone</div>
            <a href="tel:+8615800841294">+86 158 0084 1294</a>
          </div>
          <div className="footer__contact-item">
            <div className="footer__contact-label">GitHub</div>
            <a href="https://github.com/Timcai06" target="_blank" rel="noreferrer">github.com/Timcai06</a>
          </div>
          <div className="footer__contact-item">
            <div className="footer__contact-label">Location</div>
            <span>Shanghai, China · 31°N 121°E</span>
          </div>
        </div>

        <div className="footer__meta">
          <div>© 2026 · Tim Cai · ShangHai</div>
          <div className="footer__links">
            <a href="https://github.com/Timcai06" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="mailto:cairentian932@gmail.com">Email ↗</a>
            <a href="#hero" onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}>↑ top</a>
          </div>
          <div>Site · GSAP · R3F · GLSL · hand-coded</div>
        </div>
      </div>
    </footer>
  )
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Footer() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.footer__cta-line',
        { yPercent: 100 },
        {
          scrollTrigger: {
            trigger: '.footer__cta',
            start: 'top 80%',
          },
          yPercent: 0,
          duration: 2.0,
          ease: 'expo.out',
          stagger: 0.12,
        }
      )

      gsap.from('.footer__meta > *', {
        scrollTrigger: {
          trigger: '.footer__meta',
          start: 'top 90%',
        },
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
    <footer className="footer container" id="contact" ref={root}>
      <h2 className="footer__cta">
        <span className="split-line"><span className="footer__cta-line split-line__inner">Let&apos;s build</span></span>
        <span className="split-line"><span className="footer__cta-line split-line__inner"><em>something</em></span></span>
        <span className="split-line"><span className="footer__cta-line split-line__inner">
          <a href="mailto:cairentian932@gmail.com">that lasts.</a>
        </span></span>
      </h2>

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
    </footer>
  )
}

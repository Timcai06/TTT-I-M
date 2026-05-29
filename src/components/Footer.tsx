import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'

export default function Footer() {
  const root = useRef<HTMLElement>(null)
  const blobRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current || !blobRef.current || !wrapRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current!,
        start: 'top bottom',
        onEnter: () => { wrapRef.current!.style.visibility = 'visible' },
        onLeaveBack: () => { wrapRef.current!.style.visibility = 'hidden' },
        onEnterBack: () => { wrapRef.current!.style.visibility = 'visible' },
        onLeave: () => { wrapRef.current!.style.visibility = 'hidden' },
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current!,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      tl.fromTo(blobRef.current, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
      tl.to('.footer__inner', { opacity: 1, duration: 0.25, ease: 'power2.out' }, 0.22)
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <footer className="footer" id="contact" ref={root}>
      <div className="contact__blob-wrap" ref={wrapRef}>
        <div className="contact__blob" ref={blobRef} />
      </div>
      <div className="container footer__content">
        <div className="footer__inner">
          <div className="footer__kicker">// GET IN TOUCH · 联系方式</div>
          <h2 className="footer__title">
            Let&apos;s build<br />
            something that <em>lasts</em>.
          </h2>
          <div className="contact__items">
            <a href="mailto:cairentian932@gmail.com" className="contact__link">cairentian932@gmail.com</a>
            <span className="contact__sep">·</span>
            <a href="https://github.com/Timcai06" target="_blank" rel="noreferrer">github.com/Timcai06</a>
          </div>
          <div className="footer__meta">
            <div>© 2026 · Tim Cai · Shanghai</div>
            <div className="footer__links">
              <a href="https://github.com/Timcai06" target="_blank" rel="noreferrer">GitHub ↗</a>
              <a href="mailto:cairentian932@gmail.com">Email ↗</a>
              <a href="#hero" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>↑ top</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

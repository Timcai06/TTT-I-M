import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { transitionToChapter } from '../lib/chapterTransition'
import { attachMagnetic } from '../lib/magnetic'

export default function Footer() {
  const root = useRef<HTMLElement>(null)
  const blobRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    if (!root.current || !blobRef.current || !wrapRef.current) return
    const rootEl = root.current

    const ctx = gsap.context(() => {
      // Set initial states for elements that will animate in. The buttons fade
      // in on opacity only (no y) so the magnetic transform below owns x/y
      // without the scrubbed reveal fighting it.
      gsap.set('.footer__kicker', { opacity: 0, y: 15 })
      gsap.set('.footer__title .split-line__inner', { yPercent: 110, skewY: 6 })
      gsap.set('.contact__btn', { opacity: 0 })
      gsap.set('.footer__meta', { opacity: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootEl,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      tl.fromTo(blobRef.current, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
      tl.to('.footer__inner', { opacity: 1, duration: 0.1, ease: 'none' }, 0.18)
      tl.to('.footer__kicker', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.18)
      tl.to('.footer__title .split-line__inner', { yPercent: 0, skewY: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.22)
      tl.to('.contact__btn', { opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)
      tl.to('.footer__meta', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.45)
    }, root)

    // Magnetic pull on the contact pills (outside the context — owns its own
    // ticker/listeners, torn down explicitly).
    const magneticDisposers = gsap.utils
      .toArray<HTMLElement>(rootEl.querySelectorAll('.contact__btn'))
      .map((btn) => attachMagnetic(btn, 0.4))

    // Live Shanghai clock in the meta.
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = fmt.format(new Date())
    }
    tick()
    const clockId = window.setInterval(tick, 30000)

    return () => {
      magneticDisposers.forEach((dispose) => dispose())
      window.clearInterval(clockId)
      ctx.revert()
    }
  }, [])

  return (
    <footer className="footer" id="contact" ref={root}>
      <div className="contact__blob-wrap" ref={wrapRef}>
        <div className="contact__blob" ref={blobRef}>
          <div className="contact__blob-inner" />
        </div>
      </div>
      <div className="container footer__content">
        <div className="footer__inner">
          <div className="footer__kicker">// GET IN TOUCH · 联系方式</div>
          <h2 className="footer__title">
            <span className="split-line">
              <span className="split-line__inner">Let&apos;s build</span>
            </span>
            <span className="split-line">
              <span className="split-line__inner">
                something that <em>lasts</em>.
              </span>
            </span>
          </h2>
          <div className="contact__items">
            <a href="mailto:cairentian932@gmail.com" className="contact__btn">
              <span className="contact__btn-text">cairentian932@gmail.com</span>
              <span className="contact__btn-arrow">↗</span>
            </a>
            <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer" className="contact__btn">
              <span className="contact__btn-text">github.com/Timcai06</span>
              <span className="contact__btn-arrow">↗</span>
            </a>
          </div>
          <div className="footer__meta">
            <div className="footer__meta-left">
              <span className="footer__now">
                <i className="footer__now-dot" aria-hidden="true" />
                Shanghai{' '}
                <time ref={clockRef} className="footer__now-time" aria-label="Local time in Shanghai">--:--</time>
                {' · available for work'}
              </span>
              <span>© 2026 · Tim Cai</span>
            </div>
            <div className="footer__links">
              <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              <a href="mailto:cairentian932@gmail.com">Email ↗</a>
              <a href="#hero" onClick={(e) => { e.preventDefault(); transitionToChapter('hero', { updateHash: true }) }}>↑ top</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

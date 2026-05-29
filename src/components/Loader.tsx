import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'

const BAFFLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░█'

export default function Loader() {
  const panelRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!panelRef.current) return

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro__char')
      if (!charEls?.length) return

      const tl = gsap.timeline()

      /* ── init ── */
      gsap.set(charEls, { opacity: 0, yPercent: 120 })

      /* ── baffle scramble (kept) ── */
      charEls.forEach((el) => {
        const final = el.getAttribute('data-final') || el.textContent || ''
        let frame = 0
        const interval = setInterval(() => {
          if (frame < 11) {
            el.textContent = BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)]
          } else if (frame < 15) {
            el.textContent = frame % 2 === 0
              ? BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)]
              : final
          } else {
            el.textContent = final
            clearInterval(interval)
          }
          frame++
        }, 42)
      })

      /* ── chars rise from behind the mask edge, slow expo ── */
      tl.to(charEls, {
        opacity: 1,
        yPercent: 0,
        duration: 1.25,
        stagger: 0.075,
        ease: 'expo.out',
      }, 0.1)

      /* ── corner counter + hairline, in parallel ── */
      const count = { v: 0 }
      tl.to(count, {
        v: 100,
        duration: 1.6,
        ease: 'power2.inOut',
        onUpdate: () => {
          const v = Math.round(count.v)
          if (countRef.current) countRef.current.textContent = String(v).padStart(2, '0')
          if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`
        },
      }, 0.1)

      /* ── hold a beat ── */
      tl.to({}, { duration: 0.35 })

      /* ── detail (counter + hairline) recede ── */
      tl.to('.intro__counter, .intro__bar-track', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      }, '>-0.1')

      /* ── name lifts away behind the mask ── */
      tl.to(charEls, {
        yPercent: -120,
        duration: 0.8,
        stagger: 0.04,
        ease: 'power3.in',
      }, '<')

      /* ── hand off to hero just before the panel clears ── */
      tl.call(() => window.dispatchEvent(new CustomEvent('loader:exit')), [], '>-0.15')

      /* ── single panel wipes up, revealing the hero already composed beneath ── */
      tl.to(panelRef.current, {
        yPercent: -100,
        duration: 1.15,
        ease: 'expo.inOut',
      }, '>-0.05')

      tl.call(() => setDone(true))
    }, panelRef)

    return () => ctx.revert()
  }, [])

  if (done) return null

  const text = 'Tim Cai.'
  const chars = text.split('').map((ch, i) => {
    if (ch === ' ') {
      return <span key={i} className="intro__char intro__space" data-final=" ">&nbsp;</span>
    }
    if (ch === '.') {
      return <span key={i} className="intro__char intro__dot" data-final=".">.</span>
    }
    return <span key={i} className="intro__char" data-final={ch}>{ch}</span>
  })

  return (
    <div className="intro" ref={panelRef}>
      <div className="intro__meta">// Portfolio · 2026</div>

      <div className="intro__text-wrap">
        <div className="intro__text" ref={textRef}>{chars}</div>
      </div>

      <div className="intro__counter">
        <span ref={countRef}>00</span>
        <span className="intro__counter-sep">/ 100</span>
      </div>

      <div className="intro__bar-track">
        <span className="intro__bar" ref={barRef} />
      </div>
    </div>
  )
}

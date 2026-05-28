import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'

const BAFFLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░█'

export default function Loader() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const leftCurtainRef = useRef<HTMLDivElement>(null)
  const rightCurtainRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!overlayRef.current) return

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro-text__char')
      const curtainLeft = leftCurtainRef.current
      const curtainRight = rightCurtainRef.current
      if (!charEls?.length || !curtainLeft || !curtainRight) return

      const tl = gsap.timeline()

      /* ── Phase 0: init ── */
      gsap.set([curtainLeft, curtainRight], { scaleX: 0 })
      gsap.set(charEls, { opacity: 0, y: 80, scale: 0.5 })

      /* ── Phase 1: baffle‑style scramble then settle ── */
      charEls.forEach((el) => {
        const final = el.getAttribute('data-final') || el.textContent || ''
        let frame = 0
        const interval = setInterval(() => {
          if (frame < 10) {
            el.textContent = BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)]
          } else if (frame < 14) {
            el.textContent = frame % 2 === 0
              ? BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)]
              : final
          } else {
            el.textContent = final
            clearInterval(interval)
          }
          frame++
        }, 40)
      }, 0)

      tl.to(charEls, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.06,
        ease: 'back.out(1.8)',
      }, 0)

      /* ── Phase 2: scale‑close ── */
      tl.to(textRef.current, {
        scale: 0.35,
        opacity: 0,
        duration: 0.65,
        ease: 'power3.in',
      }, 1.0)

      /* ── dispatch loader:exit BEFORE curtain closes ── */
      tl.call(() => {
        window.dispatchEvent(new CustomEvent('loader:exit'))
      }, [], 1.7)

      /* ── Phase 3: red‑black curtain close ── */
      tl.to(curtainLeft, {
        scaleX: 1,
        duration: 0.75,
        ease: 'power3.inOut',
      }, 1.8)

      tl.to(curtainRight, {
        scaleX: 1,
        duration: 0.75,
        ease: 'power3.inOut',
      }, 1.8)

      /* ── Phase 4: blackout hold ── */

      /* ── Phase 5: curtain open ── */
      tl.to([curtainLeft, curtainRight], {
        scaleX: 0,
        duration: 1.0,
        ease: 'power3.inOut',
      }, 2.8)

      /* ── Phase 6: overlay fade ── */
      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      }, 3.5)

      tl.call(() => setDone(true), [], 4.1)
    }, overlayRef)

    return () => ctx.revert()
  }, [])

  if (done) return null

  const text = 'Tim Cai.'
  const chars = text.split('').map((ch, i) => {
    if (ch === ' ') {
      return <span key={i} className="intro-text__char intro-text__space" data-final=" ">&nbsp;</span>
    }
    if (ch === '.') {
      return <span key={i} className="intro-text__char intro-text__dot" data-final=".">.</span>
    }
    return <span key={i} className="intro-text__char" data-final={ch}>{ch}</span>
  })

  return (
    <>
      <div className="intro-curtain intro-curtain--left" ref={leftCurtainRef} />
      <div className="intro-curtain intro-curtain--right" ref={rightCurtainRef} />
      <div className="intro-overlay" ref={overlayRef}>
        <div className="intro-text" ref={textRef}>
          {chars}
        </div>
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { dispatchIntroExit } from '../lib/intro'
import { setStage } from '../lib/stage'
import { useIntroPretextInteraction } from '../lib/pretextIntroText'
import { useWholeSitePreload } from '../lib/resources/preloadController'

const BAFFLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░█'

function randomBaffleChar() {
  return BAFFLE_CHARS[Math.floor(Math.random() * BAFFLE_CHARS.length)] ?? ''
}

export default function Loader() {
  const panelRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const exitStarted = useRef(false)
  const [done, setDone] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const preload = useWholeSitePreload()
  useIntroPretextInteraction(textRef, introReady && !done && !exiting)
  const stageText = preload.ready ? 'ready' : preload.label

  useEffect(() => {
    if (!panelRef.current) return
    const intervals: number[] = []

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro__char')
      if (!charEls?.length) return

      const tl = gsap.timeline()

      /* ── init ── */
      gsap.set(charEls, { opacity: 0, yPercent: 120 })

      /* ── baffle scramble (kept) ── */
      charEls.forEach((el) => {
        const glyph = el.querySelector<HTMLElement>('.intro__char-glyph') ?? el
        const final = glyph.getAttribute('data-final') || glyph.textContent || ''
        let frame = 0
        const interval = window.setInterval(() => {
          if (frame < 11) {
            glyph.textContent = randomBaffleChar()
          } else if (frame < 15) {
            glyph.textContent = frame % 2 === 0
              ? randomBaffleChar()
              : final
          } else {
            glyph.textContent = final
            clearInterval(interval)
          }
          frame++
        }, 42)
        intervals.push(interval)
      })

      /* ── chars rise from behind the mask edge, slow expo ── */
      tl.to(charEls, {
        opacity: 1,
        yPercent: 0,
        duration: 1.25,
        stagger: 0.075,
        ease: 'expo.out',
      }, 0.1)

      tl.call(() => {
        setStage('intro')
        setIntroReady(true)
      })
    }, panelRef)

    return () => {
      intervals.forEach((interval) => window.clearInterval(interval))
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    const progress = preload.total > 0 ? preload.completed / preload.total : 0
    const value = preload.ready ? 100 : Math.min(99, Math.floor(progress * 100))

    if (countRef.current) countRef.current.textContent = String(value).padStart(2, '0')
    if (barRef.current) {
      gsap.to(barRef.current, {
        scaleX: preload.ready ? 1 : progress,
        duration: 0.28,
        ease: 'power2.out',
        overwrite: true,
      })
    }
  }, [preload.completed, preload.ready, preload.total])

  useEffect(() => {
    if (!introReady || !preload.ready || exitStarted.current || !panelRef.current) return
    exitStarted.current = true
    setExiting(true)

    const ctx = gsap.context(() => {
      const charEls = textRef.current?.querySelectorAll<HTMLElement>('.intro__char')
      if (!charEls?.length) return

      const tl = gsap.timeline()

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
      tl.call(dispatchIntroExit, [], '>-0.15')

      /* ── single panel wipes up, revealing the hero already composed beneath ── */
      tl.to(panelRef.current, {
        yPercent: -100,
        duration: 1.15,
        ease: 'expo.inOut',
      }, '>-0.05')

      tl.call(() => setDone(true))
    }, panelRef)

    return () => ctx.revert()
  }, [introReady, preload.ready])

  if (done) return null

  const text = 'Tim Cai.'
  const chars = text.split('').map((ch, i) => {
    if (ch === ' ') {
      return (
        <span key={i} className="intro__char intro__space">
          <span className="intro__char-glyph" data-final=" ">&nbsp;</span>
        </span>
      )
    }
    if (ch === '.') {
      return (
        <span key={i} className="intro__char intro__dot">
          <span className="intro__char-glyph" data-final=".">.</span>
        </span>
      )
    }
    return (
      <span key={i} className="intro__char">
        <span className="intro__char-glyph" data-final={ch}>{ch}</span>
      </span>
    )
  })

  return (
    <div className="intro" ref={panelRef}>
      <div className="intro__meta">// Portfolio · 2026</div>

      <div className={`intro__text-wrap${introReady && !exiting ? ' intro__text-wrap--interactive' : ''}`}>
        <div className="intro__text" ref={textRef}>{chars}</div>
      </div>

      <div className="intro__counter">
        <span ref={countRef}>00</span>
        <span className="intro__counter-sep">/ 100</span>
        <span className="intro__stage">{stageText}</span>
      </div>

      <div className="intro__bar-track">
        <span className="intro__bar" ref={barRef} />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'

export default function Loader() {
  const ref = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const target = { value: 0 }

    const introTl = gsap.timeline()

    // Letters start invisible, staggered entrance with font morphing
    introTl
      .set('.loader__char', { opacity: 0, y: 60, scale: 0.6 })
      .to('.loader__char', {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        stagger: 0.07,
        ease: 'expo.out',
      })
      // Font weight morph: light → bold → settle at 400
      .fromTo('.loader__name', { fontWeight: 200 }, {
        fontWeight: 600,
        duration: 0.6,
        ease: 'power2.in',
      }, 0.3)
      .to('.loader__name', {
        fontWeight: 400,
        duration: 0.5,
        ease: 'power2.out',
      }, 0.9)
      // Scale pulse: name expands then settles
      .fromTo('.loader__name', { scale: 0.85 }, {
        scale: 1.12,
        duration: 0.7,
        ease: 'power2.out',
      }, 0.2)
      .to('.loader__name', {
        scale: 1,
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      }, 0.9)
      // Font-size shift on "Tim" vs "Cai" — Tim grows bigger, Cai stays refined
      .fromTo('.loader__first', { fontSize: '1em' }, {
        fontSize: '1.25em',
        duration: 0.6,
        ease: 'power3.out',
      }, 0.5)
      .fromTo('.loader__last', { fontSize: '1em', letterSpacing: '-0.02em' }, {
        fontSize: '0.85em',
        letterSpacing: '0.12em',
        duration: 0.6,
        ease: 'power3.out',
      }, 0.5)
      // Serif → sans crossfade via class swap
      .add(() => {
        ref.current?.querySelector('.loader__name')?.classList.add('loader__name--sans')
      }, 0.7)
      .to('.loader__name', {
        letterSpacing: '0.08em',
        duration: 0.8,
        ease: 'power2.inOut',
      }, 0.7)
      // Dot accent fades in
      .fromTo('.loader__dot', { opacity: 0, scale: 0 }, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(3)',
      }, 1.0)

    // Counter starts after intro settles
    const countTl = gsap.timeline({ delay: 0.6 })
    countTl
      .fromTo('.loader__count', { opacity: 0, y: 20 }, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'expo.out',
      })
      .to(target, {
        value: 100,
        duration: 1.6,
        ease: 'power2.inOut',
        onUpdate: () => {
          const v = Math.round(target.value)
          if (countRef.current) {
            countRef.current.textContent = String(v).padStart(3, '0')
          }
          if (barRef.current) {
            barRef.current.style.width = `${v}%`
          }
        },
        onComplete: () => {
          const exit = gsap.timeline({
            onComplete: () => setDone(true),
          })

          exit
            .to('.loader__char', {
              yPercent: -120,
              rotation: () => gsap.utils.random(-12, 12),
              duration: 0.5,
              stagger: 0.03,
              ease: 'expo.in',
            }, 0)
            .to('.loader__dot', {
              scale: 30,
              opacity: 0,
              duration: 0.8,
              ease: 'expo.in',
            }, 0)
            .to('.loader__count', {
              opacity: 0,
              y: -30,
              duration: 0.35,
              ease: 'expo.in',
            }, 0)
            .to(ref.current, {
              clipPath: 'inset(0 0 100% 0)',
              duration: 1.0,
              ease: 'expo.inOut',
            }, 0.25)

          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('loader:exit'))
          }, 200)
        },
      })

    return () => {
      introTl.kill()
      countTl.kill()
    }
  }, [])

  if (done) return null

  return (
    <div className="loader" ref={ref}>
      <div className="loader__name" aria-hidden="true">
        <span className="loader__first">
          {'Tim'.split('').map((ch, i) => (
            <span className="loader__char" key={`f${i}`}>{ch}</span>
          ))}
        </span>
        <span className="loader__space loader__char">&nbsp;</span>
        <span className="loader__last">
          {'Cai'.split('').map((ch, i) => (
            <span className="loader__char" key={`l${i}`}>{ch}</span>
          ))}
        </span>
        <span className="loader__dot loader__char">.</span>
      </div>
      <div className="loader__count" style={{ opacity: 0 }}>
        <span ref={countRef}>000</span>
        <span>/ 100</span>
      </div>
      <div className="loader__bar" ref={barRef} />
    </div>
  )
}

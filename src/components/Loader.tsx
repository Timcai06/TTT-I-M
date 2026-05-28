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
    const tl = gsap.timeline({
      onComplete: () => {
        const exit = gsap.timeline({
          onComplete: () => setDone(true),
        })

        exit
          .to('.loader__name span', {
            yPercent: -110,
            duration: 0.6,
            stagger: 0.04,
            ease: 'expo.in',
          }, 0)
          .to('.loader__count', {
            opacity: 0,
            y: -20,
            duration: 0.4,
            ease: 'expo.in',
          }, 0)
          .to(ref.current, {
            clipPath: 'inset(0 0 100% 0)',
            duration: 1.0,
            ease: 'expo.inOut',
          }, 0.3)

        // Fire Hero animations early (overlap with exit)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('loader:exit'))
        }, 200)
      },
    })

    tl.to(target, {
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
    })

    return () => {
      tl.kill()
    }
  }, [])

  if (done) return null

  return (
    <div className="loader" ref={ref}>
      <div className="loader__name" aria-hidden="true">
        {'Tim Cai'.split('').map((ch, i) => (
          <span key={i}>{ch === ' ' ? ' ' : ch}</span>
        ))}
      </div>
      <div className="loader__count">
        <span ref={countRef}>000</span>
        <span>/ 100</span>
      </div>
      <div className="loader__bar" ref={barRef} />
    </div>
  )
}

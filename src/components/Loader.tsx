import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

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
        gsap.to(ref.current, {
          y: '-100%',
          duration: 1.1,
          ease: 'expo.inOut',
          onComplete: () => setDone(true),
        })
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
      <div className="loader__count">
        <span ref={countRef}>000</span>
        <span>/ 100</span>
      </div>
      <div className="loader__bar" ref={barRef} />
    </div>
  )
}

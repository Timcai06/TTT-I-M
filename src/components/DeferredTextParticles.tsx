import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { scheduleIdle } from '../lib/scheduleIdle'

const TextParticles = lazy(() => import('./TextParticles'))

interface Props {
  text: string
  className?: string
  fontSize?: number
}

function StaticTextParticles({ text, className = '' }: Pick<Props, 'text' | 'className'>) {
  return (
    <div className={`text-particles text-particles--static ${className}`}>
      <span className="text-particles__sr">{text}</span>
    </div>
  )
}

export default function DeferredTextParticles(props: Props) {
  const fallbackRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    const el = fallbackRef.current
    if (!el) return

    let cancelIdle = () => {}
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        cancelIdle = scheduleIdle(() => setEnabled(true), 1500, 360)
      },
      { rootMargin: '70% 0px' }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelIdle()
    }
  }, [])

  const fallback = <StaticTextParticles text={props.text} className={props.className} />

  if (!enabled) {
    return <div ref={fallbackRef}>{fallback}</div>
  }

  return (
    <Suspense fallback={fallback}>
      <TextParticles {...props} />
    </Suspense>
  )
}

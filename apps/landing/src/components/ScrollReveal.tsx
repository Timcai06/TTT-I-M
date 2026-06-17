import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { gsap } from '../lib/gsap'

interface ScrollRevealProps {
  children: ReactNode
  as?: 'h2' | 'span'
  scrollContainerRef?: RefObject<HTMLElement | null>
  enableBlur?: boolean
  baseOpacity?: number
  baseRotation?: number
  blurStrength?: number
  containerClassName?: string
  textClassName?: string
  rotationEnd?: string
  wordAnimationEnd?: string
  animateOnScroll?: boolean
}

const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3040-\\u30ff\\uff00-\\uffef\\u3000-\\u303f'
const TOKEN_RE = new RegExp(`(\\s+)|([${CJK}])|([^\\s${CJK}]+)`, 'g')

function splitText(children: ReactNode) {
  const text = typeof children === 'string' ? children : ''

  return Array.from(text.matchAll(TOKEN_RE)).map((match, index) => {
    const [word, whitespace] = match
    if (whitespace) return word
    return (
      <span className="scroll-reveal__word" key={`${word}-${index}`}>
        {word}
      </span>
    )
  })
}

export default function ScrollReveal({
  children,
  as = 'h2',
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom',
  animateOnScroll = true,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLElement>(null)
  const split = useMemo(() => splitText(children), [children])
  const setContainerRef = (node: HTMLElement | null) => {
    containerRef.current = node
  }

  useEffect(() => {
    if (!animateOnScroll) return
    const el = containerRef.current
    if (!el) return

    const scroller = scrollContainerRef?.current ?? window
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: '0% 50%', rotate: baseRotation },
        {
          ease: 'none',
          rotate: 0,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom',
            end: rotationEnd,
            scrub: true,
          },
        }
      )

      const words = el.querySelectorAll<HTMLElement>('.scroll-reveal__word')

      gsap.fromTo(
        words,
        { opacity: baseOpacity, willChange: 'opacity' },
        {
          ease: 'none',
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom-=20%',
            end: wordAnimationEnd,
            scrub: true,
          },
        }
      )

      if (enableBlur) {
        gsap.fromTo(
          words,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: 'none',
            filter: 'blur(0px)',
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom-=20%',
              end: wordAnimationEnd,
              scrub: true,
            },
          }
        )
      }
    }, el)

    return () => ctx.revert()
  }, [
    animateOnScroll,
    baseOpacity,
    baseRotation,
    blurStrength,
    enableBlur,
    rotationEnd,
    scrollContainerRef,
    wordAnimationEnd,
  ])

  const className = `scroll-reveal ${containerClassName}`.trim()
  const content = <span className={`scroll-reveal-text ${textClassName}`.trim()}>{split}</span>

  if (as === 'span') {
    return (
      <span ref={setContainerRef} className={className}>
        {content}
      </span>
    )
  }

  return (
    <h2 ref={setContainerRef} className={className}>
      {content}
    </h2>
  )
}

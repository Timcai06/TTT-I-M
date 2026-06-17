import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'

interface CountUpProps {
  /** Target value to count up (or down) to. */
  to: number
  /** Starting value. Default 0. */
  from?: number
  /** Tween duration in seconds. Default 2. */
  duration?: number
  /** Text appended after the number (e.g. '+'). */
  suffix?: string
  /** Text prepended before the number. */
  prefix?: string
  /** Thousands separator (e.g. ','). Default '' (none). */
  separator?: string
  className?: string
}

/**
 * @description React Bits CountUp（GSAP 移植版）—— 数字从 `from` 滚动到 `to`。
 *   进入视口时（IntersectionObserver, 60% 阈值）触发一次，用 GSAP 补间一个对象的值并写 textContent。
 * @customization 上游用 framer-motion 的 useSpring/useInView；本仓库无 framer-motion，
 *   改用项目已有的 GSAP + 原生 IntersectionObserver，零新依赖。降动用户直接落定终值，不滚动。
 * @perf 纯文本更新，无 layout 抖动来源（仅改 textContent）；触发后断开 observer。
 */
export default function CountUp({
  to,
  from = 0,
  duration = 2,
  suffix = '',
  prefix = '',
  separator = '',
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const format = (n: number) => {
      const rounded = Math.round(n)
      const body = separator
        ? rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator)
        : rounded.toString()
      return `${prefix}${body}${suffix}`
    }

    if (prefersReducedMotion()) {
      el.textContent = format(to)
      return
    }

    el.textContent = format(from)
    const counter = { val: from }
    let played = false

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || played) return
        played = true
        gsap.to(counter, {
          val: to,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = format(counter.val)
          },
        })
      },
      { threshold: 0.6 }
    )
    io.observe(el)

    return () => io.disconnect()
  }, [to, from, duration, suffix, prefix, separator])

  return <span ref={ref} className={`count-up ${className}`.trim()} />
}

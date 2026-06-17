import {
  createElement,
  useRef,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { prefersReducedMotion } from '../lib/motion'

interface SpotlightCardProps {
  /** Host element to render as. Defaults to `div`; pass `button` for clickable tiles. */
  as?: ElementType
  children: ReactNode
  className?: string
  /** Any remaining props (onClick, type, aria-*, style, data-*) are forwarded to the host element. */
  [prop: string]: unknown
}

/**
 * @description React Bits SpotlightCard —— 跟随光标的径向高光卡片。指针在卡面移动时，
 *   通过 CSS 变量 `--spot-x/--spot-y` 把一团柔光锚到光标位置（高光本体在 CSS `.spotlight-card`
 *   里用 radial-gradient 实现）。多态：`as` 可渲染成任意标签（bento 瓦片用 `as="button"`）。
 * @customization 相比上游：加 `prefersReducedMotion()` 早退（降动用户不写坐标变量，
 *   高光静止），并改用 `onPointerMove`（一次绑定覆盖鼠标/触控笔）。
 * @perf 纯 CSS 合成，无 WebGL / 无逐帧 JS —— 仅在指针移动时写两个 CSS 变量，不进 canvas 预算。
 */
export default function SpotlightCard({ as: Tag = 'div', children, className = '', ...rest }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null)

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
  }

  // Rendering a value typed as the full `ElementType` union via JSX collapses
  // its props to `never`. `createElement` keeps a permissive signature, so the
  // forwarded props (onClick, type, aria-*, style…) pass through cleanly.
  return createElement(
    Tag,
    { ref, onPointerMove: handlePointerMove, className: `spotlight-card ${className}`.trim(), ...rest },
    children
  )
}

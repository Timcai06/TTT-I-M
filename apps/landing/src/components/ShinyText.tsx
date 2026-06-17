interface ShinyTextProps {
  text: string
  /** Disable the moving highlight (renders as plain inherited color). */
  disabled?: boolean
  /** Seconds per shine sweep. Default 5. */
  speed?: number
  className?: string
}

/**
 * @description React Bits ShinyText —— 一束高光横扫文字。用 background-clip:text + 动画
 *   background-position 实现，高光本体在 CSS `.shiny-text` 里。
 * @customization 降动用户的静止处理放在 CSS（`prefers-reduced-motion` 媒体查询里停动画），
 *   组件只透传 `--shine-duration`。
 * @perf 纯 CSS，无 JS 逐帧；只动画 background-position，不触发 layout。
 */
export default function ShinyText({ text, disabled = false, speed = 5, className = '' }: ShinyTextProps) {
  return (
    <span
      className={`shiny-text ${disabled ? 'shiny-text--off' : ''} ${className}`.trim()}
      style={{ '--shine-duration': `${speed}s` } as React.CSSProperties}
    >
      {text}
    </span>
  )
}

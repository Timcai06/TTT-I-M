import type { CSSProperties, ReactNode } from 'react'

interface GradientTextProps {
  children: ReactNode
  className?: string
  /** Gradient stop colors, looped for a seamless sweep. */
  colors?: string[]
  /** Seconds per gradient sweep. Default 8. */
  animationSpeed?: number
  /** Render a matching gradient hairline border behind the text. */
  showBorder?: boolean
}

/**
 * @description React Bits GradientText —— 流动渐变填充文字（可选渐变描边）。用 background-clip:text
 *   + 动画 background-position，渐变与动画细节在 CSS `.gradient-text`。
 * @customization 颜色经 inline `--gradient-stops` 传入；降动停动画交给 CSS 媒体查询。
 * @perf 纯 CSS，无 JS 逐帧；仅动画 background-position。
 */
export default function GradientText({
  children,
  className = '',
  colors = ['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa'],
  animationSpeed = 8,
  showBorder = false,
}: GradientTextProps) {
  const style = {
    '--gradient-stops': colors.join(', '),
    '--gradient-duration': `${animationSpeed}s`,
  } as CSSProperties

  return (
    <span className={`gradient-text ${showBorder ? 'gradient-text--border' : ''} ${className}`.trim()} style={style}>
      <span className="gradient-text__content">{children}</span>
    </span>
  )
}

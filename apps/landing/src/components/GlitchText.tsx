import type { CSSProperties, ReactNode } from 'react'

interface GlitchTextProps {
  children: ReactNode
  speed?: number
  duration?: number
  enableShadows?: boolean
  enableOnHover?: boolean
  className?: string
  text?: string
}

interface GlitchTextStyles extends CSSProperties {
  '--after-duration': string
  '--before-duration': string
  '--after-shadow': string
  '--before-shadow': string
  '--glitch-iteration-count': 'infinite'
}

export default function GlitchText({
  children,
  speed = 1,
  duration,
  enableShadows = true,
  enableOnHover = true,
  className = '',
  text,
}: GlitchTextProps) {
  const dataText = text ?? (typeof children === 'string' ? children : '')
  const afterDuration = duration ?? speed * 3
  const beforeDuration = duration ?? speed * 2
  const inlineStyles: GlitchTextStyles = {
    '--after-duration': `${afterDuration}s`,
    '--before-duration': `${beforeDuration}s`,
    '--after-shadow': enableShadows ? '-5px 0 red' : 'none',
    '--before-shadow': enableShadows ? '5px 0 cyan' : 'none',
    '--glitch-iteration-count': 'infinite',
  }
  const hoverClass = enableOnHover ? 'enable-on-hover' : ''

  return (
    <span
      className={`glitch-text ${hoverClass} ${className}`.trim()}
      style={inlineStyles}
      data-text={dataText}
    >
      {children}
    </span>
  )
}

export const colors = {
  accent: '#7890a8',
  accentWarm: '#d6c5a8',
  background: '#0a0a0a',
  backgroundElevated: '#121212',
  foreground: '#f0f0f0',
  foregroundMuted: 'rgba(240, 240, 240, 0.60)',
  line: 'rgba(255, 255, 255, 0.04)',
  lineStrong: 'rgba(255, 255, 255, 0.12)',
} as const

export const fonts = {
  sans: "'Inter', system-ui, -apple-system, 'PingFang SC', sans-serif",
  serif: "'Playfair Display', 'Noto Serif SC', 'Songti SC', serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', monospace",
} as const

export const motion = {
  easeOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
  easeInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
} as const

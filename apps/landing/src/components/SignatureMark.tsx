type SignatureMarkTone = 'dark' | 'light'
type SignatureMarkVariant = 'inline' | 'seal' | 'corner'

interface SignatureMarkProps {
  tone?: SignatureMarkTone
  variant?: SignatureMarkVariant
  className?: string
}

/**
 * @description 站点微型签章系统，用同一组 Tim Cai / signed 2026 落款语言连接 Hero、Frame 和 Footer。
 * @dependencies 依赖 signature-mark.css 与全局字体 token；不持有动画状态，避免干扰各章节自己的 GSAP timeline。
 * @performance 纯 DOM/CSS，无 rAF、无 pointer listener；适合在 caption/meta 等高密度区域重复出现。
 * @caveats 这是品牌印记而不是内容标题，默认 aria-hidden，不能承载关键信息。
 */
export default function SignatureMark({
  tone = 'dark',
  variant = 'inline',
  className = '',
}: SignatureMarkProps) {
  const classes = [
    'signature-mark',
    `signature-mark--${tone}`,
    `signature-mark--${variant}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={classes} aria-hidden="true">
      <span className="signature-mark__name">Tim Cai</span>
      <span className="signature-mark__meta">signed / 2026</span>
    </span>
  )
}

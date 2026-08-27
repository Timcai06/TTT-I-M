import { useId, useMemo, useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { useReducedMotion } from '../lib/motion'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'

export type MaskedHeadingProps = {
  text: string
  src?: string
  sources?: string[]
  mediaType?: 'image' | 'video'
  poster?: string
  fillScale?: number
  parallax?: number
  reveal?: 'wipe' | 'fade' | 'none'
  trigger?: 'view' | 'load'
  emphasis?: string
  className?: string
}

const VIEWBOX_WIDTH = 1600
const VIEWBOX_HEIGHT = 560

function renderMaskLine(line: string, emphasis: string | undefined, y: number) {
  const emphasisStart = emphasis ? line.indexOf(emphasis) : -1

  if (emphasisStart === -1 || !emphasis) {
    return <text className="masked-heading__mask-text" x="28" y={y}>{line}</text>
  }

  const before = line.slice(0, emphasisStart)
  const after = line.slice(emphasisStart + emphasis.length)

  return (
    <text className="masked-heading__mask-text" x="28" y={y}>
      <tspan>{before}</tspan>
      <tspan className="masked-heading__mask-emphasis">{emphasis}</tspan>
      <tspan>{after}</tspan>
    </text>
  )
}

/**
 * Large editorial heading whose letterforms reveal real project media.
 * The SVG mask keeps the media live (including video) without rasterising the
 * typography, while the readable heading remains exposed through aria-label.
 */
export default function MaskedHeading({
  text,
  src,
  sources = [],
  mediaType = 'image',
  poster,
  fillScale = 1.12,
  parallax = 18,
  reveal = 'wipe',
  trigger = 'view',
  emphasis,
  className = '',
}: MaskedHeadingProps) {
  const root = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const reactId = useId()
  const maskId = `masked-heading-${reactId.replace(/:/g, '')}`
  const lines = useMemo(() => text.split('\n').slice(0, 2), [text])
  const imageSources = useMemo(
    () => Array.from(new Set([...sources, ...(src && mediaType === 'image' ? [src] : [])].filter(Boolean))),
    [mediaType, sources, src],
  )

  useGSAP(() => {
    const heading = root.current
    if (!heading) return
    const stage = heading.querySelector<SVGSVGElement>('.masked-heading__stage')
    const media = heading.querySelector<HTMLElement>('.masked-heading__media')
    if (!stage || !media) return

    gsap.set(media, { scale: fillScale, transformOrigin: '50% 50%' })

    if (reducedMotion) {
      gsap.set(stage, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' })
      gsap.set(media, { yPercent: 0 })
      requestScrollRefresh()
      return
    }

    const revealFrom = reveal === 'fade'
      ? { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 0%)' }
      : { autoAlpha: reveal === 'none' ? 1 : 0.18, clipPath: reveal === 'none' ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)' }
    const revealTo = {
      autoAlpha: 1,
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: reveal === 'none' ? 0 : 1.35,
      ease: 'expo.out',
    }

    if (trigger === 'view') {
      gsap.fromTo(stage, revealFrom, {
        ...revealTo,
        scrollTrigger: {
          trigger: heading,
          start: 'top 82%',
          once: true,
        },
      })
    } else {
      gsap.fromTo(stage, revealFrom, revealTo)
    }

    if (parallax > 0) {
      gsap.fromTo(media, { y: -parallax / 2 }, {
        y: parallax / 2,
        ease: 'none',
        scrollTrigger: {
          trigger: heading,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.55,
        },
      })
    }

    requestScrollRefresh()
  }, {
    scope: root,
    dependencies: [fillScale, parallax, reducedMotion, reveal, trigger],
    revertOnUpdate: true,
  })

  const lineYs = lines.length === 1 ? [350] : [218, 458]

  return (
    <h2
      ref={root}
      className={`masked-heading${className ? ` ${className}` : ''}`}
      aria-label={text.replace(/\s*\n\s*/g, ' ')}
    >
      <svg
        className="masked-heading__stage"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT}>
            <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="black" />
            {lines.map((line, index) => (
              <g key={`${line}-${index}`}>{renderMaskLine(line, emphasis, lineYs[index] ?? 350)}</g>
            ))}
          </mask>
        </defs>

        <foreignObject
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          mask={`url(#${maskId})`}
        >
          <div className="masked-heading__media">
            {mediaType === 'video' && src ? (
              <video
                className="masked-heading__video"
                src={src}
                poster={poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <div
                className="masked-heading__image-strip"
                style={{ '--masked-heading-panels': Math.max(1, imageSources.length) } as React.CSSProperties}
              >
                {imageSources.map((image, index) => (
                  <span className="masked-heading__image-panel" key={image}>
                    <img
                      src={image}
                      alt=""
                      loading="eager"
                      decoding="async"
                      fetchPriority={index < 2 ? 'high' : 'auto'}
                    />
                  </span>
                ))}
              </div>
            )}
            <span className="masked-heading__metal" aria-hidden="true" />
          </div>
        </foreignObject>
      </svg>
    </h2>
  )
}

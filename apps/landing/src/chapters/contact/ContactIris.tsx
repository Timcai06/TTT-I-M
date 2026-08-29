import type { RefObject } from 'react'

export default function ContactIris({
  svgRef,
  wrapRef,
}: {
  svgRef: RefObject<SVGSVGElement | null>
  wrapRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="contact__blob-wrap" ref={wrapRef} aria-hidden="true">
      <svg className="contact__iris" ref={svgRef} preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="contact-iris-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
              result="goo"
            />
            <feBlend in="goo" in2="goo" />
          </filter>
        </defs>
        <circle className="contact__iris-aura" data-iris-aura r="0" />
        <g className="contact__iris-goo" filter="url(#contact-iris-goo)">
          <circle data-iris-core r="0" />
          {Array.from({ length: 4 }, (_, index) => <circle data-iris-sat r="0" key={index} />)}
        </g>
        <circle className="contact__iris-rim" data-iris-rim r="0" />
      </svg>
    </div>
  )
}

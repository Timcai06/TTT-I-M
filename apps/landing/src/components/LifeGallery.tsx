import { useRef } from 'react'
import { photos } from '../content'
import { useMobileExperience } from '../lib/device'
import { gsap, useGSAP } from '../lib/gsap'
import DriftWall from './DriftWall'

export default function LifeGallery() {
  const root = useRef<HTMLElement>(null)
  const mobile = useMobileExperience()

  useGSAP(() => {
    gsap.from('.life__eyebrow', {
      autoAlpha: 0,
      y: 20,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: root.current, start: 'top 76%' },
    })
    gsap.from('.life__statement-line', {
      autoAlpha: 0,
      yPercent: 90,
      stagger: 0.1,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: root.current, start: 'top 70%' },
    })
  }, { scope: root })

  return (
    <section className="life" id="life" ref={root}>
      <div className="life__copy container">
        <div className="life__eyebrow">Life archive · 生活切片</div>
        <h2 className="life__statement" aria-label="Off the clock, still looking for movement and light.">
          <span className="life__statement-mask"><span className="life__statement-line">Off the clock,</span></span>
          <span className="life__statement-mask"><span className="life__statement-line"><em>still looking</em> for movement and light.</span></span>
        </h2>
        <p className="life__note">
          球场上的空当、城市里的光、以及和朋友并肩完成一件事的瞬间——
          它们塑造了我观察系统与人的方式。
        </p>
      </div>

      <div className="life__wall" data-drift-wall>
        <DriftWall
          items={photos.map((photo) => ({ image: photo.src, title: photo.alt, tone: photo.tone }))}
          columns={mobile ? 3 : 7}
          tileWidth={mobile ? 154 : 188}
          tileHeight={mobile ? 116 : 160}
          gap={mobile ? 12 : 16}
          scale={mobile ? 1.1 : 1.08}
          tilt={mobile ? 8 : 11}
          turn={mobile ? -8 : -7}
          depth={mobile ? 70 : 40}
          speed={mobile ? 28 : 38}
          variance={0.45}
          parallax={mobile ? 0.24 : 0.38}
          lift={mobile ? 34 : 64}
          fade={mobile ? 0.42 : 0.34}
          dim={0.66}
          overlayColor="#000000"
        />
        <div className="life__wall-index" aria-hidden="true">
          <span>01 / MOTION</span><span>02 / LIGHT</span><span>03 / BUILD</span>
        </div>
      </div>
    </section>
  )
}

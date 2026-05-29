import { useEffect, useRef } from 'react'
import { gsap, Flip } from '../lib/gsap'
import { photos } from '../data/life'

export default function LifeGallery() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    const gallery = galleryRef.current
    const wrap = wrapRef.current
    if (!gallery || !wrap) return

    const createFlip = () => {
      ctxRef.current?.revert()

      gallery.classList.remove('gallery--final')

      ctxRef.current = gsap.context(() => {
        const items = gallery.querySelectorAll('.gallery__item')

        gallery.classList.add('gallery--final')
        const flipState = Flip.getState(items)
        gallery.classList.remove('gallery--final')

        const flip = Flip.to(flipState, {
          simple: true,
          duration: 1,
          ease: 'expoScale(1, 5)',
        })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: gallery,
            start: 'center center',
            end: '+=185%',
            scrub: 1.1,
            pin: wrap,
          },
        })
        tl.add(flip)
        /* ── 阻尼停顿：完全展开到最大状态后停留一拍再释放 pin ── */
        tl.to({}, { duration: 0.62 })

        return () => gsap.set(items, { clearProps: 'all' })
      })
    }

    createFlip()
    window.addEventListener('resize', createFlip)

    return () => {
      window.removeEventListener('resize', createFlip)
      ctxRef.current?.revert()
    }
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const ctx = gsap.context(() => {
      gsap.from('.life__header > *', {
        scrollTrigger: {
          trigger: '.life__header',
          start: 'top 85%',
        },
        opacity: 0,
        y: 32,
        duration: 1.8,
        stagger: 0.12,
        ease: 'expo.out',
      })
    }, wrap)

    return () => ctx.revert()
  }, [])

  return (
    <section className="life" ref={wrapRef}>
      <div className="life__header container">
        <div className="section__label">Life — 生活</div>
        <h2 className="section__title">
          Off the <em>clock</em>.
        </h2>
      </div>

      <div className="gallery-wrap">
        <div className="gallery gallery--bento" id="gallery-life" ref={galleryRef}>
          {photos.map((p, i) => (
            <div className="gallery__item" key={i}>
              {p.src ? (
                <img src={p.src} alt={p.alt} loading="lazy" />
              ) : (
                <div className="gallery__placeholder" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useRef } from 'react'
import { gsap, Flip } from '../lib/gsap'

export interface LifePhoto {
  src: string
  alt: string
}

const photos: LifePhoto[] = [
  { src: '/life/football-action.png', alt: '球场 · 运球' },
  { src: '/life/night-portrait.png', alt: '冬夜 · 街头' },
  { src: '/life/football-portrait.png', alt: '中场 · 沉思' },
  { src: '/life/shanghai-skyline.png', alt: '上海 · 天际线' },
  { src: '/life/team-photo.png', alt: '球队 · 合照' },
  { src: '/life/life-scene-2.png', alt: '夜场 · 队友' },
  { src: '/life/life-casual.png', alt: '日常 · 随拍' },
]

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
          duration: 3.0,
          ease: 'expoScale(1, 5)',
        })

        // Initial setup for the narrative text elements - query from wrap node for stability
        const paragraphs = wrap.querySelectorAll<HTMLElement>('.life__intro-p')
        const allLines = wrap.querySelectorAll<HTMLElement>('.life__intro-p .split-line__inner')
        if (paragraphs.length > 0) {
          gsap.set(paragraphs, { opacity: 0, y: 0 })
        }
        if (allLines.length > 0) {
          gsap.set(allLines, { yPercent: 110, opacity: 0 })
        }

        // 钉住 .gallery-wrap（正好 100vh），让 gallery 完整填满视口；
        // .life__header 在钉住前先正常滚走，避免顶部标题占位导致只露出上半。
        const galleryWrap = gallery.parentElement as HTMLElement

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: galleryWrap,
            start: 'top top',
            end: () => '+=' + window.innerHeight * 10,
            scrub: 1.1,
            pin: galleryWrap,
          },
        })

        // 1. 吸附入场：bento 网格像被磁性吸住、轻微回弹定格，而非硬停顿
        tl.fromTo(gallery, { scale: 1.045 }, { scale: 1, duration: 1.4, ease: 'power3.out' })
        tl.to({}, { duration: 0.25 })

        // 2. Morph the bento grid TO full bleed
        tl.add(flip)

        // 3. Brief settle at full-bleed state
        tl.to({}, { duration: 0.5 })

        // 4. Gradually dim and blur background images for text readability
        const images = gallery.querySelectorAll('.gallery__item img')
        tl.fromTo(images, {
          filter: 'brightness(1) saturate(0.82) contrast(1.05) blur(0px)',
        }, {
          filter: 'brightness(0.18) saturate(0.4) contrast(1.05) blur(8px)',
          duration: 1.5,
        })

        // 5. Sequential paragraph slide-up and fade-out
        if (paragraphs.length > 0) {
          paragraphs.forEach((p, index) => {
            const lines = p.querySelectorAll('.split-line__inner')

            // Fade in paragraph container
            tl.fromTo(p, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 }, index === 0 ? '+=0.1' : '+=0.6')
            
            // Slide up the split-text lines (concurrent with paragraph fade)
            tl.fromTo(lines, 
              { yPercent: 110, opacity: 0 },
              { yPercent: 0, opacity: 1, stagger: 0.14, duration: 1.0, ease: 'power3.out' },
              '<'
            )
            
            // Hold for reading
            tl.to({}, { duration: 2.6 }) 
            
            // Fade out and slide up
            tl.to(p, { opacity: 0, y: -24, duration: 0.7, ease: 'power2.in' })
            // 重置该段文字行，避免回滚/叠层残留
            tl.set(lines, { yPercent: 110, opacity: 0 })
          })
        }

        return () => {
          gsap.set(items, { clearProps: 'all' })
          gsap.set(gallery, { clearProps: 'all' })
          if (images.length) gsap.set(images, { clearProps: 'all' })
          if (paragraphs.length) gsap.set(paragraphs, { clearProps: 'all' })
          if (allLines.length) gsap.set(allLines, { clearProps: 'all' })
        }
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

        {/* 电影感叙事文字图层 */}
        <div className="life__intro-overlay" aria-hidden="true">
          <div className="life__intro-container">
            <p className="life__intro-p">
              <span className="split-line"><span className="split-line__inner">在绿茵场上，我是习惯掌控防守节奏的 6 号位后腰。</span></span>
              <span className="split-line"><span className="split-line__inner">足球不仅是对抗与折返跑，更是对空间落点、</span></span>
              <span className="split-line"><span className="split-line__inner">以及攻防瞬时转换的精准捕捉。</span></span>
            </p>
            <p className="life__intro-p">
              <span className="split-line"><span className="split-line__inner">在镜头背后，我是夜幕下上海街头的寻光者。</span></span>
              <span className="split-line"><span className="split-line__inner">从高耸的陆家嘴天际线，到泛着霓虹倒影的沥青马路，</span></span>
              <span className="split-line"><span className="split-line__inner">记录着数字代码与物理实体空间融合的瞬间。</span></span>
            </p>
            <p className="life__intro-p">
              <span className="split-line"><span className="split-line__inner">在屏幕面前，我是把 strange ideas 写进代码的 builder。</span></span>
              <span className="split-line"><span className="split-line__inner">我习惯写清文档，并和队友在深夜并肩攻克最后一公里。</span></span>
              <span className="split-line"><span className="split-line__inner">那些跑通算法与还原高保真界面的时刻，胜过所有词藻。</span></span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

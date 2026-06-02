import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { frameChapters, frameImages, framePanels, type FrameChapter, type FrameImage } from '../data/frames'

interface ActiveFrameState {
  imageIndex: number
  chapterIndex: number
}

function FrameRail({
  active,
  currentImage,
  currentChapter,
}: {
  active: ActiveFrameState
  currentImage?: FrameImage
  currentChapter?: FrameChapter
}) {
  return (
    <aside className="frame-horizontal__rail" aria-label="Frame gallery progress">
      <span className="frame-horizontal__rail-kicker">Frame</span>
      <span className="frame-horizontal__rail-title">{currentChapter?.title ?? 'Architecture'}</span>
      <span className="frame-horizontal__rail-count">
        {String(active.chapterIndex + 1).padStart(2, '0')} / {String(frameChapters.length).padStart(2, '0')}
      </span>
      <span className="frame-horizontal__rail-subcount">
        Image {String(active.imageIndex + 1).padStart(2, '0')} / {String(frameImages.length).padStart(2, '0')}
      </span>
      {currentImage && <span className="frame-horizontal__rail-current">{currentImage.title}</span>}
    </aside>
  )
}

function FrameChapterPanel({ chapter }: { chapter: FrameChapter }) {
  return (
    <article className="frame-panel frame-panel--chapter frame-chapter-panel" data-chapter={chapter.id}>
      <p className="frame-panel__eyebrow">{chapter.eyebrow}</p>
      <h2 className="frame-chapter-panel__title">{chapter.title}</h2>
      <p className="frame-panel__body frame-chapter-panel__body">{chapter.body}</p>
    </article>
  )
}

function FrameTextPanel({ layout, eyebrow, title, body }: { layout: 'intro' | 'outro'; eyebrow?: string; title?: string; body?: string }) {
  return (
    <article className={`frame-panel frame-panel--${layout} frame-chapter-panel`}>
      {eyebrow && <p className="frame-panel__eyebrow">{eyebrow}</p>}
      {title && <h2 className="frame-chapter-panel__title">{title}</h2>}
      {body && <p className="frame-panel__body frame-chapter-panel__body">{body}</p>}
    </article>
  )
}

function FrameImagePanel({ image, chapter }: { image: FrameImage; chapter: FrameChapter }) {
  return (
    <figure
      className={[
        'frame-panel',
        'frame-panel--image',
        `frame-panel--${image.orientation}`,
        `frame-panel--scale-${image.scale}`,
        `frame-panel--align-${image.align}`,
        `frame-panel--pace-${image.pace}`,
      ].join(' ')}
      key={image.src}
      data-tone={image.tone}
      data-frame-id={image.id}
      data-chapter={chapter.id}
      data-cursor="hover"
    >
      <div className="frame-panel__media">
        <img src={image.src} alt={image.title} loading="lazy" decoding="async" />
      </div>
      <figcaption className="frame-panel__caption">
        <span className="frame-panel__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
      </figcaption>
    </figure>
  )
}

export default function Frame() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ActiveFrameState>({ imageIndex: 0, chapterIndex: 0 })

  const currentImage = frameImages[active.imageIndex]
  const currentChapter = frameChapters[active.chapterIndex]

  const chapterByImageId = useMemo(() => {
    const map = new Map<number, number>()
    frameChapters.forEach((chapter, chapterIndex) => {
      chapter.images.forEach((image) => map.set(image.id, chapterIndex))
    })
    return map
  }, [])

  useEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    if (!rootEl || !trackEl) return

    const updateActivePanel = () => {
      const panels = Array.from(trackEl.querySelectorAll<HTMLElement>('.frame-panel--image'))
      const center = window.innerWidth / 2
      let imageIndex = 0
      let closest = Number.POSITIVE_INFINITY

      panels.forEach((panel, index) => {
        const rect = panel.getBoundingClientRect()
        const distance = Math.abs(rect.left + rect.width / 2 - center)
        if (distance < closest) {
          closest = distance
          imageIndex = index
        }
      })

      const imageId = Number(panels[imageIndex]?.dataset.frameId)
      const chapterIndex = chapterByImageId.get(imageId) ?? 0
      setActive((prev) => (
        prev.imageIndex === imageIndex && prev.chapterIndex === chapterIndex
          ? prev
          : { imageIndex, chapterIndex }
      ))
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.frame-chapter-panel__title',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: rootEl, start: 'top 78%' },
        }
      )

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const tween = gsap.to(trackEl, {
          x: () => -(trackEl.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: rootEl,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${Math.max(1, trackEl.scrollWidth - window.innerWidth)}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: updateActivePanel,
            onRefresh: updateActivePanel,
          },
        })

        updateActivePanel()

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      gsap.utils.toArray<HTMLImageElement>('.frame-panel img').forEach((img) => {
        if (img.complete) return
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
      })
    }, rootEl)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [chapterByImageId])

  return (
    <section className="frame-horizontal" id="frame" ref={root} data-horizontal-section>
      <div className="frame-horizontal__pin">
        <FrameRail active={active} currentImage={currentImage} currentChapter={currentChapter} />

        <div className="frame-horizontal__track" ref={track} data-horizontal-track>
          {framePanels.map((panel, index) => {
            if (panel.layout === 'intro' || panel.layout === 'outro') {
              return (
                <FrameTextPanel
                  key={`${panel.layout}-${index}`}
                  layout={panel.layout}
                  eyebrow={panel.eyebrow}
                  title={panel.title}
                  body={panel.body}
                />
              )
            }

            if (panel.layout === 'chapter' && panel.chapter) {
              return <FrameChapterPanel chapter={panel.chapter} key={panel.chapter.id} />
            }

            if (panel.layout === 'image' && panel.image && panel.chapter) {
              return <FrameImagePanel image={panel.image} chapter={panel.chapter} key={panel.image.src} />
            }

            return null
          })}
        </div>
      </div>
    </section>
  )
}

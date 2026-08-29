import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import type { ProjectShot } from '../../content'
import { openProjectLightbox } from './lightbox'

interface MobileProjectCarouselProps {
  shots: readonly ProjectShot[]
  label: string
}

export default function MobileProjectCarousel({ shots, label }: MobileProjectCarouselProps) {
  const [viewportRef, embla] = useEmblaCarousel({ loop: false, align: 'start', containScroll: 'trimSnaps' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const syncSelection = useCallback(() => {
    setSelectedIndex(embla?.selectedScrollSnap() ?? 0)
  }, [embla])

  useEffect(() => {
    if (!embla) return
    embla.on('select', syncSelection)
    embla.on('reInit', syncSelection)
    return () => {
      embla.off('select', syncSelection)
      embla.off('reInit', syncSelection)
    }
  }, [embla, syncSelection])

  const openShot = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    void openProjectLightbox(shots, index, event.currentTarget)
  }

  return (
    <div className="project-carousel" aria-label={label} data-project-carousel>
      <div className="project-carousel__viewport" ref={viewportRef}>
        <div className="project-carousel__track">
          {shots.map((shot, index) => (
            <figure className="project-carousel__slide" key={shot.src}>
              <a
                className="project-carousel__open"
                href={shot.src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => openShot(event, index)}
                aria-label={`全屏查看：${shot.label}`}
                data-cursor="hover"
              >
                <img src={shot.src} alt={shot.alt} loading="lazy" decoding="async" />
              </a>
              <figcaption>{shot.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      {shots.length > 1 ? (
        <div className="project-carousel__dots" aria-label="选择项目截图">
          {shots.map((shot, index) => (
            <button
              key={shot.src}
              type="button"
              className={index === selectedIndex ? 'is-active' : ''}
              onClick={() => embla?.scrollTo(index)}
              aria-label={`查看截图 ${index + 1}：${shot.label}`}
              aria-current={index === selectedIndex ? 'true' : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

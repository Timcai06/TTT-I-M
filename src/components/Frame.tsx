import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  archiveIntro,
  archiveOutro,
  archiveThemes,
  type ArchiveCluster,
  type ArchiveClusterSlot,
  type ArchiveImage,
  type ArchiveTextPanel,
  type ArchiveTheme,
} from '../data/frames'

interface ActiveArchiveState {
  clusterIndex: number
}

function ArchiveRail({
  active,
  theme,
  themeIndex,
}: {
  active: ActiveArchiveState
  theme: ArchiveTheme
  themeIndex: number
}) {
  const cluster = theme.clusters[active.clusterIndex]
  const clusterNumber = active.clusterIndex >= 0 ? active.clusterIndex + 1 : 0

  return (
    <aside className="frame-horizontal__rail" aria-label={`${theme.title} progress`}>
      <span className="frame-horizontal__rail-kicker">Frame</span>
      <span className="frame-horizontal__rail-title">{theme.title}</span>
      <span className="frame-horizontal__rail-count">
        Part {String(themeIndex + 1).padStart(2, '0')} / {String(archiveThemes.length).padStart(2, '0')}
      </span>
      <span className="frame-horizontal__rail-subcount">
        Cluster {String(clusterNumber).padStart(2, '0')} / {String(theme.clusters.length).padStart(2, '0')}
      </span>
      {cluster && <span className="frame-horizontal__rail-current">{cluster.title}</span>}
    </aside>
  )
}

function ArchiveTextPanel({ panel, layout }: { panel: ArchiveTextPanel; layout: 'intro' | 'outro' }) {
  return (
    <article className={`archive-frame-text archive-frame-text--${layout}`}>
      <p className="frame-panel__eyebrow">{panel.eyebrow}</p>
      <h2 className="archive-theme-marker__title">{panel.title}</h2>
      <p className="frame-panel__body archive-theme-marker__body">{panel.body}</p>
    </article>
  )
}

function ArchiveThemeMarker({ theme }: { theme: ArchiveTheme }) {
  return (
    <article className="frame-panel frame-panel--theme archive-theme-marker" data-theme={theme.id}>
      <p className="frame-panel__eyebrow">{theme.eyebrow}</p>
      <h2 className="archive-theme-marker__title" id={`frame-${theme.id}-title`}>{theme.title}</h2>
      <p className="frame-panel__body archive-theme-marker__body">{theme.body}</p>
    </article>
  )
}

interface ArchiveSlotStyle extends CSSProperties {
  '--slot-x'?: string
  '--slot-y'?: string
  '--slot-scale'?: number
}

function ArchiveImageSlot({ eager, slot }: { eager: boolean; slot: ArchiveClusterSlot }) {
  const image: ArchiveImage = slot.image
  const slotStyle: ArchiveSlotStyle = {
    '--slot-x': `${slot.offset?.x ?? 0}px`,
    '--slot-y': `${slot.offset?.y ?? 0}px`,
    '--slot-scale': slot.offset?.scale ?? 1,
  }

  return (
    <figure
      className={[
        'archive-slot',
        `archive-slot--${slot.role}`,
        `archive-slot--${image.orientation}`,
      ].join(' ')}
      data-tone={image.tone}
      data-cursor="hover"
      style={slotStyle}
    >
      <div className="archive-slot__media">
        <img
          src={image.src}
          alt={image.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          fetchPriority={eager ? 'high' : 'auto'}
        />
      </div>
      <figcaption className="archive-slot__caption">
        <span className="archive-slot__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
      </figcaption>
    </figure>
  )
}

function ArchiveClusterPanel({
  active,
  cluster,
  eagerFirstImage,
  theme,
}: {
  active: boolean
  cluster: ArchiveCluster
  eagerFirstImage: boolean
  theme: ArchiveTheme
}) {
  return (
    <article
      className={[
        'frame-panel',
        'frame-panel--cluster',
        'archive-cluster',
        `archive-cluster--${cluster.layout}`,
        `archive-cluster--theme-${theme.id}`,
        `archive-cluster--direction-${theme.direction}`,
        `archive-cluster--rhythm-${cluster.rhythm}`,
        active ? 'is-active-cluster' : '',
      ].join(' ')}
      data-theme={theme.id}
      data-cluster={cluster.id}
      data-direction={theme.direction}
    >
      {cluster.slots.map((slot, index) => (
        <ArchiveImageSlot
          eager={eagerFirstImage && index === 0}
          key={`${cluster.id}-${slot.image.src}`}
          slot={slot}
        />
      ))}
    </article>
  )
}

function ArchiveThemeSection({ theme, themeIndex }: { theme: ArchiveTheme; themeIndex: number }) {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ActiveArchiveState>({ clusterIndex: 0 })

  useEffect(() => {
    const sectionEl = section.current
    const trackEl = track.current
    if (!sectionEl || !trackEl) return

    const updateActiveCluster = () => {
      const clusters = Array.from(trackEl.querySelectorAll<HTMLElement>('.archive-cluster'))
      const center = window.innerWidth / 2
      let clusterIndex = 0
      let closest = Number.POSITIVE_INFINITY

      clusters.forEach((cluster, index) => {
        const rect = cluster.getBoundingClientRect()

        const distance = Math.abs(rect.left + rect.width / 2 - center)
        if (distance < closest) {
          closest = distance
          clusterIndex = index
        }
      })

      setActive((prev) => (
        prev.clusterIndex === clusterIndex ? prev : { clusterIndex }
      ))
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.archive-theme-marker__title',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: sectionEl, start: 'top 76%' },
        }
      )

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const scrollDistance = () => Math.max(1, trackEl.scrollWidth - window.innerWidth)
        const tween = gsap.fromTo(
          trackEl,
          { x: () => (theme.direction === 'left-to-right' ? -scrollDistance() : 0) },
          {
            x: () => (theme.direction === 'left-to-right' ? 0 : -scrollDistance()),
            ease: 'none',
            scrollTrigger: {
              trigger: sectionEl,
              pin: true,
              scrub: 1,
              start: 'top top',
              end: () => `+=${scrollDistance()}`,
              toggleClass: { targets: sectionEl, className: 'is-frame-theme-active' },
              invalidateOnRefresh: true,
              anticipatePin: 1,
              onUpdate: updateActiveCluster,
              onRefresh: updateActiveCluster,
            },
          }
        )

        updateActiveCluster()

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      let refreshFrame = 0
      const scheduleRefresh = () => {
        window.cancelAnimationFrame(refreshFrame)
        refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
      }

      const images = gsap.utils.toArray<HTMLImageElement>('.archive-slot img')
      images.forEach((img) => {
        if (img.complete) return
        img.addEventListener('load', scheduleRefresh, { once: true })
      })

      return () => {
        window.cancelAnimationFrame(refreshFrame)
        images.forEach((img) => img.removeEventListener('load', scheduleRefresh))
      }
    }, sectionEl)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [theme.direction])

  return (
    <section
      aria-labelledby={`frame-${theme.id}-title`}
      className={`archive-theme-section archive-theme-section--${theme.id}`}
      data-archive-theme={theme.id}
      ref={section}
    >
      <div className="archive-theme-section__pin">
        <ArchiveRail active={active} theme={theme} themeIndex={themeIndex} />

        <div className="archive-theme-section__track" data-horizontal-track ref={track}>
          <ArchiveThemeMarker theme={theme} />
          {theme.clusters.map((cluster, clusterIndex) => (
            <ArchiveClusterPanel
              active={clusterIndex === active.clusterIndex}
              cluster={cluster}
              eagerFirstImage={clusterIndex === 0}
              key={cluster.id}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Frame() {
  return (
    <section className="frame-horizontal" id="frame" data-horizontal-section>
      <ArchiveTextPanel layout="intro" panel={archiveIntro} />
      {archiveThemes.map((theme, index) => (
        <ArchiveThemeSection key={theme.id} theme={theme} themeIndex={index} />
      ))}
      <ArchiveTextPanel layout="outro" panel={archiveOutro} />
    </section>
  )
}

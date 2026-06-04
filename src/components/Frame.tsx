import { Fragment, type CSSProperties, useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { revealWordsOnce } from '../lib/wordReveal'
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
  const ref = useRef<HTMLElement>(null)

  // Vertical (non-pinned) panels — a one-shot per-word reveal on enter.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealWordsOnce(el, '.archive-theme-marker__title', { start: 'top 82%' })
      revealWordsOnce(el, '.frame-panel__body', { start: 'top 78%' })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <article ref={ref} className={`archive-frame-text archive-frame-text--${layout}`}>
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

function ArchiveClusterMarker({
  cluster,
  clusterIndex,
  theme,
}: {
  cluster: ArchiveCluster
  clusterIndex: number
  theme: ArchiveTheme
}) {
  if (theme.id !== 'building' || !cluster.body) return null

  return (
    <article className="frame-panel archive-cluster-marker" data-cluster-marker={cluster.id}>
      <p className="frame-panel__eyebrow">
        Building / {String(clusterIndex + 1).padStart(2, '0')}
      </p>
      <h3 className="archive-cluster-marker__title">{cluster.title}</h3>
      <p className="archive-cluster-marker__body">{cluster.body}</p>
    </article>
  )
}

interface ArchiveSlotStyle extends CSSProperties {
  '--slot-x'?: string
  '--slot-y'?: string
  '--slot-scale'?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function ArchiveImageSlot({ eager, slot }: { eager: boolean; slot: ArchiveClusterSlot }) {
  const image: ArchiveImage = slot.image
  const slotStyle: ArchiveSlotStyle = {
    '--slot-x': `${clamp(slot.offset?.x ?? 0, -10, 10)}px`,
    '--slot-y': `${clamp(slot.offset?.y ?? 0, -12, 12)}px`,
    '--slot-scale': clamp(slot.offset?.scale ?? 1, 0.98, 1),
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
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={image.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'low'}
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
  cluster,
  eagerFirstImage,
  theme,
}: {
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
      ].join(' ')}
      data-theme={theme.id}
      data-cluster={cluster.id}
      data-cluster-title={cluster.title}
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
  const activeClusterIndex = useRef(-1)
  const activeUpdateFrame = useRef(0)
  const [active, setActive] = useState<ActiveArchiveState>({ clusterIndex: 0 })
  const themeWord = theme.id.toUpperCase()

  useEffect(() => {
    const sectionEl = section.current
    const trackEl = track.current
    if (!sectionEl || !trackEl) return

    const warmedImages = new Set<string>()
    const warmClusterImages = (clusterIndex: number) => {
      const clusters = Array.from(sectionEl.querySelectorAll<HTMLElement>('.archive-cluster'))
      const nearbyClusters = [clusters[clusterIndex], clusters[clusterIndex + 1]]

      nearbyClusters.forEach((clusterEl) => {
        if (!clusterEl) return
        const images = Array.from(clusterEl.querySelectorAll<HTMLImageElement>('.archive-slot img'))
        images.forEach((img) => {
          const key = img.src
          if (warmedImages.has(key)) return

          const preload = new Image()
          preload.decoding = 'async'
          preload.fetchPriority = 'low'
          preload.sizes = img.sizes
          preload.srcset = img.srcset
          preload.src = img.src
          warmedImages.add(key)
          void preload.decode().catch(() => {})
        })
      })
    }

    const updateActiveCluster = (progress = 0) => {
      window.cancelAnimationFrame(activeUpdateFrame.current)
      activeUpdateFrame.current = window.requestAnimationFrame(() => {
        const clusterCount = theme.clusters.length
        const clusterIndex = Math.min(clusterCount - 1, Math.max(0, Math.floor(progress * clusterCount)))

        if (clusterIndex === activeClusterIndex.current) {
          warmClusterImages(clusterIndex)
          return
        }
        activeClusterIndex.current = clusterIndex
        warmClusterImages(clusterIndex)
        setActive({ clusterIndex })
      })
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      // The theme marker is the first panel in the pinned track (visible when
      // the section pins), so a one-shot per-word reveal on section enter reads
      // correctly without fighting the horizontal scrub.
      revealWordsOnce(sectionEl, '.archive-theme-marker__title', { trigger: sectionEl, start: 'top 76%' })
      revealWordsOnce(sectionEl, '.archive-theme-marker__body', { trigger: sectionEl, start: 'top 72%' })

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const scrollDistance = () => Math.max(1, trackEl.scrollWidth - window.innerWidth)
        const scrollEndDistance = () => Math.ceil(scrollDistance() + window.innerHeight * 0.8)
        const tween = gsap.fromTo(
          trackEl,
          { x: () => (theme.direction === 'left-to-right' ? -scrollDistance() : 0) },
          {
            x: () => (theme.direction === 'left-to-right' ? 0 : -scrollDistance()),
            ease: 'none',
            scrollTrigger: {
              trigger: sectionEl,
              pin: true,
              scrub: true,
              start: 'top top',
              end: () => `+=${scrollEndDistance()}`,
              toggleClass: { targets: sectionEl, className: 'is-frame-theme-active' },
              invalidateOnRefresh: true,
              anticipatePin: 1,
              onUpdate: (self) => updateActiveCluster(self.progress),
              onRefresh: (self) => updateActiveCluster(self.progress),
            },
          }
        )

        updateActiveCluster(0)

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      return undefined
    }, sectionEl)

    return () => {
      window.cancelAnimationFrame(activeUpdateFrame.current)
      mm.revert()
      ctx.revert()
    }
  }, [theme.clusters.length, theme.direction])

  return (
    <section
      aria-labelledby={`frame-${theme.id}-title`}
      className={`archive-theme-section archive-theme-section--${theme.id}`}
      data-archive-theme={theme.id}
      data-theme-word={themeWord}
      ref={section}
    >
      <div className="archive-theme-section__pin">
        <ArchiveRail active={active} theme={theme} themeIndex={themeIndex} />

        <div className="archive-theme-section__track" data-horizontal-track ref={track}>
          <ArchiveThemeMarker theme={theme} />
          {theme.clusters.map((cluster, clusterIndex) => (
            <Fragment key={cluster.id}>
              <ArchiveClusterMarker cluster={cluster} clusterIndex={clusterIndex} theme={theme} />
              <ArchiveClusterPanel
                cluster={cluster}
                eagerFirstImage={clusterIndex === 0}
                theme={theme}
              />
            </Fragment>
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

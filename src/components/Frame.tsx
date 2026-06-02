import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  archiveClusters,
  archivePanels,
  archiveThemes,
  type ArchiveCluster,
  type ArchiveClusterSlot,
  type ArchiveImage,
  type ArchiveTheme,
} from '../data/frames'

interface ActiveArchiveState {
  themeIndex: number
  clusterIndex: number
}

function ArchiveRail({ active, theme, cluster }: { active: ActiveArchiveState; theme?: ArchiveTheme; cluster?: ArchiveCluster }) {
  return (
    <aside className="frame-horizontal__rail" aria-label="Visual archive progress">
      <span className="frame-horizontal__rail-kicker">Frame</span>
      <span className="frame-horizontal__rail-title">{theme?.title ?? 'Visual Archive'}</span>
      <span className="frame-horizontal__rail-count">
        {String(active.themeIndex + 1).padStart(2, '0')} / {String(archiveThemes.length).padStart(2, '0')}
      </span>
      <span className="frame-horizontal__rail-subcount">
        Cluster {String(active.clusterIndex + 1).padStart(2, '0')} / {String(archiveClusters.length).padStart(2, '0')}
      </span>
      {cluster && <span className="frame-horizontal__rail-current">{cluster.id.replace(/-/g, ' ')}</span>}
    </aside>
  )
}

function ArchiveTextPanel({ layout, eyebrow, title, body }: { layout: 'intro' | 'outro'; eyebrow?: string; title?: string; body?: string }) {
  return (
    <article className={`frame-panel frame-panel--${layout} archive-theme-marker`}>
      {eyebrow && <p className="frame-panel__eyebrow">{eyebrow}</p>}
      {title && <h2 className="archive-theme-marker__title">{title}</h2>}
      {body && <p className="frame-panel__body archive-theme-marker__body">{body}</p>}
    </article>
  )
}

function ArchiveThemeMarker({ theme }: { theme: ArchiveTheme }) {
  return (
    <article className="frame-panel frame-panel--theme archive-theme-marker" data-theme={theme.id}>
      <p className="frame-panel__eyebrow">{theme.eyebrow}</p>
      <h2 className="archive-theme-marker__title">{theme.title}</h2>
      <p className="frame-panel__body archive-theme-marker__body">{theme.body}</p>
    </article>
  )
}

function ArchiveImageSlot({ slot }: { slot: ArchiveClusterSlot }) {
  const image: ArchiveImage = slot.image
  return (
    <figure
      className={[
        'archive-slot',
        `archive-slot--${slot.role}`,
        `archive-slot--${image.orientation}`,
      ].join(' ')}
      data-tone={image.tone}
      data-cursor="hover"
    >
      <div className="archive-slot__media">
        <img src={image.src} alt={image.title} loading="lazy" decoding="async" />
      </div>
      <figcaption className="archive-slot__caption">
        <span className="archive-slot__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
      </figcaption>
    </figure>
  )
}

function ArchiveClusterPanel({ theme, cluster }: { theme: ArchiveTheme; cluster: ArchiveCluster }) {
  return (
    <article
      className={[
        'frame-panel',
        'frame-panel--cluster',
        'archive-cluster',
        `archive-cluster--${cluster.layout}`,
        `archive-cluster--theme-${theme.id}`,
        `archive-cluster--direction-${theme.direction}`,
      ].join(' ')}
      data-theme={theme.id}
      data-cluster={cluster.id}
      data-direction={theme.direction}
    >
      {cluster.slots.map((slot) => (
        <ArchiveImageSlot key={`${cluster.id}-${slot.image.src}`} slot={slot} />
      ))}
    </article>
  )
}

export default function Frame() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ActiveArchiveState>({ themeIndex: 0, clusterIndex: 0 })

  const currentTheme = archiveThemes[active.themeIndex]
  const currentCluster = archiveClusters[active.clusterIndex]

  const themeByClusterId = useMemo(() => {
    const map = new Map<string, number>()
    archiveThemes.forEach((theme, themeIndex) => {
      theme.clusters.forEach((cluster) => map.set(cluster.id, themeIndex))
    })
    return map
  }, [])

  useEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    if (!rootEl || !trackEl) return

    const updateActivePanel = () => {
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

      const clusterId = clusters[clusterIndex]?.dataset.cluster ?? ''
      const themeIndex = themeByClusterId.get(clusterId) ?? 0
      setActive((prev) => (
        prev.themeIndex === themeIndex && prev.clusterIndex === clusterIndex
          ? prev
          : { themeIndex, clusterIndex }
      ))
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.archive-theme-marker__title',
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
        const scrollDistance = () => Math.max(1, trackEl.scrollWidth - window.innerWidth)
        const tween = gsap.to(trackEl, {
          x: () => -scrollDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: rootEl,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${scrollDistance()}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: updateActivePanel,
            onRefresh: updateActivePanel,
          },
        })

        const directionTween = gsap.fromTo(
          '.archive-cluster--direction-left-to-right',
          { xPercent: -42 },
          {
            xPercent: 42,
            ease: 'none',
            scrollTrigger: {
              trigger: rootEl,
              scrub: 1,
              start: 'top top',
              end: () => `+=${scrollDistance()}`,
              invalidateOnRefresh: true,
            },
          }
        )

        updateActivePanel()

        return () => {
          directionTween.scrollTrigger?.kill()
          directionTween.kill()
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      gsap.utils.toArray<HTMLImageElement>('.archive-slot img').forEach((img) => {
        if (img.complete) return
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
      })
    }, rootEl)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [themeByClusterId])

  return (
    <section className="frame-horizontal" id="frame" ref={root} data-horizontal-section>
      <div className="frame-horizontal__pin">
        <ArchiveRail active={active} theme={currentTheme} cluster={currentCluster} />

        <div className="frame-horizontal__track" ref={track} data-horizontal-track>
          {archivePanels.map((panel, index) => {
            if (panel.layout === 'intro' || panel.layout === 'outro') {
              return (
                <ArchiveTextPanel
                  key={`${panel.layout}-${index}`}
                  layout={panel.layout}
                  eyebrow={panel.eyebrow}
                  title={panel.title}
                  body={panel.body}
                />
              )
            }

            if (panel.layout === 'theme' && panel.theme) {
              return <ArchiveThemeMarker theme={panel.theme} key={panel.theme.id} />
            }

            if (panel.layout === 'cluster' && panel.theme && panel.cluster) {
              return <ArchiveClusterPanel theme={panel.theme} cluster={panel.cluster} key={panel.cluster.id} />
            }

            return null
          })}
        </div>
      </div>
    </section>
  )
}

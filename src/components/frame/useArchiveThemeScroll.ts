import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from '../../lib/gsap'
import { revealWordsOnce } from '../../lib/wordReveal'
import type { ArchiveTheme } from '../../data/frames'
import type { ActiveArchiveState } from './ArchiveRail'

export default function useArchiveThemeScroll({
  section,
  theme,
  track,
}: {
  section: RefObject<HTMLElement | null>
  theme: ArchiveTheme
  track: RefObject<HTMLDivElement | null>
}) {
  const activeClusterIndex = useRef(-1)
  const activeUpdateFrame = useRef(0)
  const [active, setActive] = useState<ActiveArchiveState>({ clusterIndex: 0 })

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
  }, [section, theme, track])

  return active
}

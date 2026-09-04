import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from '../../lib/gsap'
import { revealWordsOnce } from '../../lib/wordReveal'
import { enqueueImageDecode } from '../../lib/resources/imageDecodeQueue'
import type { ArchiveTheme } from '../../content'
import type { ActiveArchiveState } from './ArchiveRail'
import type { HorizontalBendHandle } from '../../lib/canvas-ui/horizontalBend'
import { computeFrameScrollDuration } from './frameScrollMath'

interface ArchiveThemeScrollOptions {
  /** 当前 theme section 根节点，用作 GSAP context、pin trigger 和图片预热查询范围 */
  section: RefObject<HTMLElement | null>
  /** Frame 内容主题，包含横向方向、cluster 数量和图片数据 */
  theme: ArchiveTheme
  /** 横向移动的 track 节点，scrollWidth 决定 pin 期间需要横移的距离 */
  track: RefObject<HTMLDivElement | null>
  /** Optional HTML-in-Canvas bend surface. DOM remains the semantic and failure fallback authority. */
  bendHandle: RefObject<HorizontalBendHandle | null>
}

/**
 * @description 驱动 Frame 单个主题段落的桌面横向滚动、章节 rail 状态和临近图片预热
 * @dependencies 依赖 GSAP ScrollTrigger、wordReveal、imageDecodeQueue、ArchiveTheme 内容结构
 * @performance 只在桌面且非 reduced-motion 下启用 pin scrub；active cluster 更新用 rAF 节流，避免 ScrollTrigger 高频回调反复 setState
 * @caveats 移动端不启用 horizontal pin，必须由 CSS 文档流兜底；图片预热只处理当前和下一个 cluster，避免早期 decode 风暴
 * @steps
 * step1: 进入 section 后触发 marker 标题和正文的文字 reveal
 * step2: 桌面端根据 track.scrollWidth 创建横向 fromTo pin 动画
 * step3: ScrollTrigger 进度映射到 clusterIndex，并预热当前/下一组图片
 * step4: 清理时撤销 rAF、matchMedia 和 GSAP context，避免路由或热更新后残留 trigger
 */
export default function useArchiveThemeScroll({
  section,
  theme,
  track,
  bendHandle,
}: ArchiveThemeScrollOptions) {
  const activeClusterIndex = useRef(-1)
  const activeUpdateFrame = useRef(0)
  const [active, setActive] = useState<ActiveArchiveState>({ clusterIndex: 0 })

  useEffect(() => {
    const sectionEl = section.current
    const trackEl = track.current
    if (!sectionEl || !trackEl) return
    activeClusterIndex.current = -1

    const warmedImages = new Set<string>()
    const warmLifecycle = new AbortController()
    const pendingPreloads = new Set<HTMLImageElement>()
    const clusterElements = Array.from(trackEl.querySelectorAll<HTMLElement>(':scope > .archive-cluster'))
    const clustersById = new Map(clusterElements.map((cluster) => [cluster.dataset.cluster, cluster]))
    const imagesByCluster = new Map(clusterElements.map((cluster) => [
      cluster.dataset.cluster,
      Array.from(cluster.querySelectorAll<HTMLImageElement>('.archive-slot img')),
    ]))
    /**
     * @description 低优先级预热当前 cluster 和下一个 cluster 的图片，减少快速滑到 Frame 时的空白
     * @dependencies 依赖 DOM 中已渲染的 .archive-cluster/.archive-slot img 和 imageDecodeQueue
     * @performance 每个 src 只预热一次；load 后再进 idle decode 队列，避免和首屏 critical decode 抢主线程
     */
    const warmClusterImages = (clusterIndex: number) => {
      const nearbyClusters = [clusterIndex, clusterIndex + 1].map((index) => {
        const clusterId = theme.clusters[index]?.id
        return clusterId ? clustersById.get(clusterId) : undefined
      })

      nearbyClusters.forEach((clusterEl) => {
        if (!clusterEl) return
        const images = imagesByCluster.get(clusterEl.dataset.cluster) ?? []
        images.forEach((img) => {
          const key = img.src
          if (warmedImages.has(key)) return

          warmedImages.add(key)
          const preload = new Image()
          preload.decoding = 'async'
          preload.fetchPriority = 'low'
          preload.sizes = img.sizes

          const settlePreload = () => pendingPreloads.delete(preload)
          preload.addEventListener('load', () => {
            settlePreload()
            void enqueueImageDecode(preload, warmLifecycle.signal).catch(() => {})
          }, { once: true, signal: warmLifecycle.signal })
          preload.addEventListener('error', settlePreload, { once: true, signal: warmLifecycle.signal })
          pendingPreloads.add(preload)
          preload.srcset = img.srcset
          preload.src = img.src
        })
      })
    }

    /**
     * @description 将横向滚动进度同步到 ArchiveRail 的 active cluster 状态
     * @dependencies 依赖 theme.clusters.length 和 ScrollTrigger progress
     * @performance rAF 合并同一帧内的多次 progress 更新，避免滚动时 React state 过度刷新
     */
    let latestProgress = 0
    const updateActiveCluster = (progress = 0) => {
      latestProgress = progress
      if (activeUpdateFrame.current) return
      activeUpdateFrame.current = window.requestAnimationFrame(() => {
        activeUpdateFrame.current = 0
        const clusterCount = theme.clusters.length
        const clusterIndex = Math.min(clusterCount - 1, Math.max(0, Math.floor(latestProgress * clusterCount)))

        if (clusterIndex === activeClusterIndex.current) return
        activeClusterIndex.current = clusterIndex
        warmClusterImages(clusterIndex)
        setActive({ clusterIndex })
      })
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      revealWordsOnce(sectionEl, '.archive-editorial-copy__theme-title', { trigger: sectionEl, start: 'top 76%' })

      // 巨型水印（::before 的 attr(data-theme-word)）随滚动从左到右被「擦亮」：
      // 这里只 scrub 一个 CSS 变量，clip-path/透明度的映射在 frame.css，
      // 伪元素继承 section 上的 --word-reveal。pin 与否（移动端文档流）都适用。
      gsap.fromTo(
        sectionEl,
        { '--word-reveal': 0 },
        {
          '--word-reveal': 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionEl,
            start: 'top 82%',
            end: 'top -35%',
            scrub: true,
          },
        }
      )

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        let measuredScrollDistance = Math.max(1, trackEl.scrollWidth - window.innerWidth)
        const measureScrollDistance = () => {
          measuredScrollDistance = Math.max(1, trackEl.scrollWidth - window.innerWidth)
          return measuredScrollDistance
        }
        const scrollEndDistance = () => computeFrameScrollDuration(measureScrollDistance(), window.innerHeight)
        const tween = gsap.fromTo(
          trackEl,
          { x: () => (theme.direction === 'left-to-right' ? -measureScrollDistance() : 0) },
          {
            x: () => (theme.direction === 'left-to-right' ? 0 : -measuredScrollDistance),
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
              onUpdate: (self) => {
                updateActiveCluster(self.progress)
                bendHandle.current?.setScrollState({
                  progress: self.progress,
                  distance: measuredScrollDistance,
                  direction: theme.direction,
                })
              },
              onRefresh: (self) => {
                measureScrollDistance()
                updateActiveCluster(self.progress)
                bendHandle.current?.resize()
              },
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
      warmLifecycle.abort(new Error('Frame image warmup detached'))
      pendingPreloads.forEach((preload) => {
        preload.srcset = ''
        preload.src = 'data:,'
      })
      pendingPreloads.clear()
      window.cancelAnimationFrame(activeUpdateFrame.current)
      activeUpdateFrame.current = 0
      mm.revert()
      ctx.revert()
    }
  }, [bendHandle, section, theme, track])

  return active
}

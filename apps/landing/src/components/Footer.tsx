import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { transitionToChapter } from '../lib/chapterTransition'
import { attachMagnetic } from '../lib/magnetic'
import { prefersReducedMotion } from '../lib/motion'
import SignatureMark from './SignatureMark'

/**
 * @description Contact/Footer 章节 —— 最后一屏的联系入口与站点收束。
 *   揭示方式是一束 goo「液体光圈」：从上一章节(Projects)的结束点为圆心，
 *   奶白色经金属球融合向外涨开、铺满视口，把 Contact 内容自然「生」出来。
 *   光圈灌满即定格为这一屏的白色背景，不回抽 —— 取代旧的「白底实体块 + 同色 blob」双机制。
 * @dependencies
 *   - GSAP timeline + ScrollTrigger（footer 入场 scrub，驱动 iris 半径与文字浮现）
 *   - `attachMagnetic`（contact pill 的 pointer-following 磁吸）
 *   - `transitionToChapter`（↑ top 走统一章节转场，而不是裸 hash 跳转）
 *   - `prefersReducedMotion`（降动/移动端跳过 iris，footer 退回纯白底直接可读）
 *   - `Intl.DateTimeFormat` Asia/Shanghai（本地时间展示）
 * @performance / @caveats
 *   - iris 是 SVG goo 滤镜（feGaussianBlur+feColorMatrix），只在 `animated`（桌面 + 非降动）下渲染；
 *     由 footer 自身的 scroll-scrub 驱动，无独立 rAF / 无新增 ScrollTrigger。
 *   - `.footer` 默认纯白底兜底；只有 `is-iris-reveal`（animated）时转透明，让 iris 成为唯一的白色来源，
 *     避免旧版「白叠白」—— 揭示发生在上一章节的深色之上，高对比可见。
 *   - `.contact__blob-wrap` 是 fixed 满视口高层级揭示层，必须同时通过真实 footer rect 和 ScrollTrigger 进度门控；
 *     否则 Frame/LifeGallery 的 pin 或图片 relayout 可能让 footer trigger 提前测量，导致白色穿到前面的章节。
 *   - `.contact__btn` 入场只改 opacity，不改 y；按钮位移由 magnetic 独占，避免两个 transform 写入源互相覆盖。
 *   - 磁吸交互在 GSAP context 外创建，必须手动 dispose；否则按钮卸载后 ticker/listener 会泄漏。
 *   - 时钟 30s 更新一次足够表达「本地时间」，避免每秒 setInterval 造成无意义 React/DOM 压力。
 * @steps
 *   step1: 设置 footer 内部元素初始状态，桌面非降动下挂 is-iris-reveal 并初始化 iris SVG 尺寸
 *   step2: 创建 scroll-scrub 时间线，iris 半径 0→1 灌满，再依次浮现标题、按钮、meta
 *   step3: 为联系按钮挂载 magnetic 交互
 *   step4: 初始化并定时刷新上海本地时间
 *   step5: cleanup 手动释放 resize、magnetic、clock interval 和 GSAP context
 */
export default function Footer() {
  const root = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    if (!root.current || !svgRef.current || !wrapRef.current) return
    const rootEl = root.current
    const svgEl = svgRef.current
    const wrapEl = wrapRef.current

    // The iris is the expensive part: only run it on desktop without reduced
    // motion. Otherwise the footer keeps its solid white background and the
    // content just fades in — fully readable, no goo filter on the GPU.
    const animated = !prefersReducedMotion() && window.matchMedia('(min-width: 769px)').matches

    // Iris origin is the previous chapter's real end point: the bottom-centre
    // of the Projects section, read LIVE each frame so the reveal literally
    // grows out of where Projects ends — and trails it as it scrolls up during
    // the wash. Falls back to bottom-centre fractions if Projects is absent
    // (e.g. collapsed by its ChapterBoundary).
    const originTarget = document.getElementById('projects')
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

    const core = svgEl.querySelector<SVGCircleElement>('[data-iris-core]')
    const rim = svgEl.querySelector<SVGCircleElement>('[data-iris-rim]')
    const sats = Array.from(svgEl.querySelectorAll<SVGCircleElement>('[data-iris-sat]'))
    let vw = window.innerWidth
    let vh = window.innerHeight

    const sizeSvg = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      svgEl.setAttribute('viewBox', `0 0 ${vw} ${vh}`)
    }

    // The single tweened scalar. The satellite blobs orbit the rim so the goo
    // filter fuses them into one organic, breathing edge as the iris grows.
    const iris = { p: 0 }
    const renderIris = () => {
      if (!core || !rim) return
      const originRect = originTarget?.getBoundingClientRect()
      const hasOrigin = !!originRect && originRect.width > 0
      const ox = hasOrigin ? originRect.left + originRect.width / 2 : vw * 0.5
      const oy = hasOrigin ? originRect.bottom : vh * 0.9
      const maxR = Math.hypot(Math.max(ox, vw - ox), Math.max(oy, vh - oy)) * 1.08
      const p = clamp01(iris.p)
      const radius = p * maxR
      const phase = p * 8
      core.setAttribute('cx', `${ox}`)
      core.setAttribute('cy', `${oy}`)
      core.setAttribute('r', `${radius}`)
      sats.forEach((sat, index) => {
        const angle = phase * 0.5 + (index * Math.PI * 2) / Math.max(1, sats.length)
        const orbit = radius * 0.84
        sat.setAttribute('cx', `${ox + Math.cos(angle) * orbit}`)
        sat.setAttribute('cy', `${oy + Math.sin(angle) * orbit}`)
        sat.setAttribute('r', `${Math.max(0, radius * (0.14 + 0.05 * Math.sin(phase + index)))}`)
      })
      rim.setAttribute('cx', `${ox}`)
      rim.setAttribute('cy', `${oy}`)
      rim.setAttribute('r', `${Math.max(0, radius - 1)}`)
      // Luminous rim: ramps in fast, then fades as the iris fills the screen.
      rim.style.opacity = `${clamp01(p * 3) * (1 - clamp01((p - 0.85) / 0.15)) * 0.55}`
    }

    if (animated) {
      rootEl.classList.add('is-iris-reveal')
      sizeSvg()
      renderIris()
    }

    const ctx = gsap.context(() => {
      // Set initial states for elements that will animate in. The buttons fade
      // in on opacity only (no y) so the magnetic transform below owns x/y
      // without the scrubbed reveal fighting it.
      gsap.set('.footer__kicker', { opacity: 0, y: 15 })
      gsap.set('.footer__title .split-line__inner', { yPercent: 110, skewY: 6 })
      gsap.set('.contact__btn', { opacity: 0 })
      gsap.set('.footer__meta', { opacity: 0 })
      gsap.set(wrapEl, { autoAlpha: 0 })

      const updateBlobVisibility = (progress = 0) => {
        const rect = rootEl.getBoundingClientRect()
        const isNearContact = rect.top <= window.innerHeight * 1.02 && rect.bottom >= 0
        gsap.set(wrapEl, { autoAlpha: isNearContact && progress > 0.001 ? 1 : 0 })
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootEl,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: (self) => updateBlobVisibility(self.progress),
          onUpdate: (self) => updateBlobVisibility(self.progress),
          onLeaveBack: () => {
            gsap.set(wrapEl, { autoAlpha: 0 })
          },
        },
      })

      if (animated) {
        tl.to(iris, { p: 1, duration: 0.6, ease: 'none', onUpdate: renderIris }, 0)
      }
      tl.to('.footer__inner', { opacity: 1, duration: 0.1, ease: 'none' }, 0.18)
      tl.to('.footer__kicker', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.18)
      tl.to('.footer__title .split-line__inner', { yPercent: 0, skewY: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.22)
      tl.to('.contact__btn', { opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)
      tl.to('.footer__meta', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.45)
    }, root)

    const onResize = () => {
      if (!animated) return
      sizeSvg()
      renderIris()
    }
    window.addEventListener('resize', onResize)

    // Magnetic pull on the contact pills (outside the context — owns its own
    // ticker/listeners, torn down explicitly).
    const magneticDisposers = gsap.utils
      .toArray<HTMLElement>(rootEl.querySelectorAll('.contact__btn'))
      .map((btn) => attachMagnetic(btn, 0.4))

    // Live Shanghai clock in the meta.
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = fmt.format(new Date())
    }
    tick()
    const clockId = window.setInterval(tick, 30000)

    return () => {
      window.removeEventListener('resize', onResize)
      rootEl.classList.remove('is-iris-reveal')
      magneticDisposers.forEach((dispose) => dispose())
      window.clearInterval(clockId)
      ctx.revert()
    }
  }, [])

  return (
    <footer className="footer" id="contact" ref={root}>
      <div className="contact__blob-wrap" ref={wrapRef} aria-hidden="true">
        <svg className="contact__iris" ref={svgRef} preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="contact-iris-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
                result="goo"
              />
              <feBlend in="goo" in2="goo" />
            </filter>
          </defs>
          <g className="contact__iris-goo" filter="url(#contact-iris-goo)">
            <circle data-iris-core r="0" />
            <circle data-iris-sat r="0" />
            <circle data-iris-sat r="0" />
            <circle data-iris-sat r="0" />
            <circle data-iris-sat r="0" />
          </g>
          <circle className="contact__iris-rim" data-iris-rim r="0" />
        </svg>
      </div>
      <div className="container footer__content">
        <div className="footer__inner">
          <div className="footer__kicker">// GET IN TOUCH · 联系方式</div>
          <h2 className="footer__title">
            <span className="split-line">
              <span className="split-line__inner">Let&apos;s build</span>
            </span>
            <span className="split-line">
              <span className="split-line__inner">
                something that <em>lasts</em>.
              </span>
            </span>
          </h2>
          <div className="contact__items">
            <a href="mailto:cairentian932@gmail.com" className="contact__btn">
              <span className="contact__btn-text">cairentian932@gmail.com</span>
              <span className="contact__btn-arrow">↗</span>
            </a>
            <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer" className="contact__btn">
              <span className="contact__btn-text">github.com/Timcai06</span>
              <span className="contact__btn-arrow">↗</span>
            </a>
          </div>
          <div className="footer__meta">
            <div className="footer__meta-left">
              <span className="footer__now">
                <i className="footer__now-dot" aria-hidden="true" />
                Shanghai{' '}
                <time ref={clockRef} className="footer__now-time" aria-label="Local time in Shanghai">--:--</time>
                {' · available for work'}
              </span>
              <span>© 2026 · Tim Cai</span>
            </div>
            <div className="footer__links">
              <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              <a href="mailto:cairentian932@gmail.com">Email ↗</a>
              <a href="#hero" onClick={(e) => { e.preventDefault(); transitionToChapter('hero', { updateHash: true }) }}>↑ top</a>
            </div>
            <SignatureMark tone="light" variant="corner" className="footer__signature" />
          </div>
        </div>
      </div>
    </footer>
  )
}

import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { transitionToChapter } from '../lib/chapterTransition'
import { attachMagnetic } from '../lib/magnetic'
import SignatureMark from './SignatureMark'

/**
 * @description Contact/Footer 章节 —— 最后一屏的联系入口与站点收束。
 *   通过 scroll-scrub 时间线让背景 blob、标题、联系按钮和 meta 信息随滚动进入；
 *   联系按钮使用磁吸交互增强手感，右下角显示上海本地时间作为“当前可联系状态”的轻量信号。
 * @dependencies
 *   - GSAP timeline + ScrollTrigger（footer 入场 scrub）
 *   - `attachMagnetic`（contact pill 的 pointer-following 磁吸）
 *   - `transitionToChapter`（↑ top 走统一章节转场，而不是裸 hash 跳转）
 *   - `Intl.DateTimeFormat` Asia/Shanghai（本地时间展示）
 * @performance / @caveats
 *   - `.contact__btn` 入场只改 opacity，不改 y；按钮位移由 magnetic 独占，避免两个 transform 写入源互相覆盖。
 *   - `.contact__blob-wrap` 是 fixed 高层级液态幕布，必须同时通过真实 footer rect 和 ScrollTrigger 进度门控；
 *     否则 Frame/LifeGallery 的 pin 或图片 relayout 可能让 footer trigger 提前测量，导致白色 blob 穿到前面的章节。
 *   - 磁吸交互在 GSAP context 外创建，必须手动 dispose；否则按钮卸载后 ticker/listener 会泄漏。
 *   - 时钟 30s 更新一次足够表达“本地时间”，避免每秒 setInterval 造成无意义 React/DOM 压力。
 * @steps
 *   step1: 设置 footer 内部元素初始状态
 *   step2: 创建 scroll-scrub 时间线，依次展开 blob、标题、按钮、meta
 *   step3: 为联系按钮挂载 magnetic 交互
 *   step4: 初始化并定时刷新上海本地时间
 *   step5: cleanup 手动释放 magnetic、clock interval 和 GSAP context
 */
export default function Footer() {
  const root = useRef<HTMLElement>(null)
  const blobRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    if (!root.current || !blobRef.current || !wrapRef.current) return
    const rootEl = root.current

    const ctx = gsap.context(() => {
      const wrapEl = wrapRef.current
      const blobEl = blobRef.current
      if (!wrapEl || !blobEl) return

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

      tl.fromTo(blobEl, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
      tl.to('.footer__inner', { opacity: 1, duration: 0.1, ease: 'none' }, 0.18)
      tl.to('.footer__kicker', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.18)
      tl.to('.footer__title .split-line__inner', { yPercent: 0, skewY: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.22)
      tl.to('.contact__btn', { opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)
      tl.to('.footer__meta', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.45)
    }, root)

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
      magneticDisposers.forEach((dispose) => dispose())
      window.clearInterval(clockId)
      ctx.revert()
    }
  }, [])

  return (
    <footer className="footer" id="contact" ref={root}>
      <div className="contact__blob-wrap" ref={wrapRef}>
        <div className="contact__blob" ref={blobRef}>
          <div className="contact__blob-inner" />
        </div>
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

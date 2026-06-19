import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { getLenis } from '../lib/lenis'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { attachTilt } from '../lib/tilt'
import { projects, type Project } from '../content'
import LaserFlow from './LaserFlow'
import SpotlightCard from './SpotlightCard'
import ShinyText from './ShinyText'

/**
 * @description Bento 速览格 —— 六个项目的不等宽导航瓦片（zentry bento 模式）。
 *   闲置态只显示编号/名称/年份；hover/focus 时项目首图从底部 clip-path 展开，
 *   点击经 Lenis 平滑滚动到对应的详情卡片。填补 Work 章节头部的密度洼地，
 *   同时充当章节内目录。
 * @performance 图片 lazy 加载且初始被 clip 隐藏，不增加首屏解码；
 *   reveal 全部走 CSS transition（clip-path/transform/opacity），无逐帧 JS。
 */
function ProjectsBento() {
  const [showLaser, setShowLaser] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)')
    const sync = () => setShowLaser(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const scrollToCard = (id: string) => {
    const card = document.querySelector<HTMLElement>(`[data-project-id="${id}"]`)
    if (!card) return
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(card, { offset: -72 })
    } else {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="projects__bento-shell">
      {showLaser && (
        <div className="projects__bento-laser" aria-hidden="true">
          <LaserFlow
            color="#cf9eff"
            horizontalBeamOffset={0.0}
            verticalBeamOffset={-0.09}
            horizontalSizing={0.5}
            verticalSizing={2.0}
            wispDensity={1.0}
            wispSpeed={13}
            wispIntensity={4.2}
            flowSpeed={0.35}
            flowStrength={0.25}
            fogIntensity={0.4}
            fogScale={0.3}
            fogFallSpeed={0.6}
            mouseTiltStrength={0.008}
          />
        </div>
      )}

      <div className="projects__bento" role="list" aria-label="项目速览">
        {projects.map((p, i) => {
          const shot = p.media?.shots[0]
          return (
            <SpotlightCard
              as="button"
              type="button"
              role="listitem"
              className={`bento-tile${shot ? '' : ' bento-tile--soon'}`}
              key={p.id}
              style={{ '--tile-accent': p.accent, '--tile-i': i }}
              onClick={() => scrollToCard(p.id)}
              aria-label={`跳到项目 ${p.name} — ${p.tagline}`}
              data-cursor="hover"
            >
              {shot && <img className="bento-tile__img" src={shot.src} alt="" loading="lazy" />}
              <span className="bento-tile__scrim" aria-hidden="true" />
              <span className="bento-tile__top" aria-hidden="true">
                <span className="bento-tile__index">{p.index}</span>
                <span className="bento-tile__year">{p.year}</span>
              </span>
              <span className="bento-tile__name" aria-hidden="true">{p.name}</span>
              <span className="bento-tile__tag" aria-hidden="true">
                {shot ? p.tagline : 'in the lab / / /'}
              </span>
              <span className="bento-tile__line" aria-hidden="true" />
            </SpotlightCard>
          )
        })}
      </div>
    </div>
  )
}

/**
 * @description 项目卡片右侧媒体展示器。根据 `Project.media.kind` 切换 cinematic / ui / terminal / data 四种外观，
 *   并在多截图项目中提供缩略图 hover/focus/click 切换。该组件只负责单张项目卡片内的媒体状态，
 *   不参与外层 ScrollTrigger 入场动画，避免项目卡片滚动生命周期和截图切换状态互相耦合。
 * @dependencies
 *   - `Project.media` 数据契约（`kind` 决定 Chrome 框样式，`shots` 决定截图序列）
 *   - CSS 类 `media-frame--{kind}` / `media-thumb.is-active`
 *   - 浏览器原生 lazy image loading
 * @performance / @caveats
 *   - 所有截图 DOM 会同时渲染，通过 `.is-active` 控制显示层级；这样切换时不重新 mount 图片，
 *     代价是多帧项目会多占用少量解码/内存预算，适合当前每个项目截图数量较少的场景。
 *   - 缩略图事件同时绑定 mouseenter/focus/click，保证桌面 hover、键盘可访问性和触摸点击都能切换。
 *   - `project.media` 缺失时渲染 soon 占位，避免未公开项目破坏 Projects 列表布局。
 * @steps
 *   step1: 若 media 缺失，返回稳定占位态
 *   step2: 取 active 下标对应截图，生成不同 media kind 的 chrome label
 *   step3: 渲染全部截图帧，并给当前帧加 `.is-active`
 *   step4: 多帧项目渲染缩略图导航器，事件更新 active 下标
 */
function ProjectMedia({ project }: { project: Project }) {
  const [active, setActive] = useState(0)

  if (!project.media) {
    return (
      <div className="project-card__media project-card__media--soon">
        <div className="media-frame media-frame--soon">
          <span className="media-frame__soon-mark">/ / /</span>
          <span className="media-frame__soon-text">in the lab</span>
        </div>
      </div>
    )
  }

  const { kind, shots } = project.media
  const shot = shots[active] ?? shots[0]
  if (!shot) return null
  const multi = shots.length > 1

  const chromeLabel =
    kind === 'terminal'
      ? `zsh — ${project.id}`
      : kind === 'data'
        ? 'DATA READOUT'
        : shot.label

  return (
    <div className={`project-card__media project-card__media--${kind}`}>
      <figure className={`media-frame media-frame--${kind}`} data-cursor="hover">
        {kind !== 'cinematic' && (
          <div className="media-frame__chrome">
            <span className="media-frame__dots">
              <i /><i /><i />
            </span>
            <span className="media-frame__label">{chromeLabel}</span>
          </div>
        )}

        <div className="media-frame__stage">
          {shots.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={`${project.name} — ${s.label}`}
              loading="lazy"
              className={`media-frame__img${i === active ? ' is-active' : ''}`}
            />
          ))}
          {kind === 'cinematic' && (
            <>
              <span className="media-frame__tick media-frame__tick--tl" />
              <span className="media-frame__tick media-frame__tick--br" />
              <figcaption className="media-frame__caption">{shot.label}</figcaption>
            </>
          )}
        </div>
      </figure>

      {multi && (
        <div className="media-frame__thumbs">
          {shots.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className={`media-thumb${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={s.label}
            >
              <img src={s.src} alt="" loading="lazy" />
              <span className="media-thumb__label">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * @description Projects 章节 —— 六个工程项目的卡片式展示。
 *   标题裂分入场 + 每张卡片通过 ScrollTrigger onEnter 添加 `.is-visible` 类触发 CSS 过渡。
 *   每张卡片分为左右两部分：左侧文本 (编号/年份/标题/描述/亮点/技术栈/链接)，
 *   右侧项目媒体 (根据 MediaKind 渲染不同 Chrome 框的截图展示)。
 *
 *   ProjectMedia 子组件处理单帧/多帧切换：多帧时显示缩略图导航器，hover/click 切换 active 帧。
 *
 * @dependencies
 *   - GSAP + ScrollTrigger + gsap.context + gsap.utils.toArray
 *   - `attachTilt` (每个 media-frame 的 damped 3D tilt 交互，触摸/降动时自动 no-op)
 *   - `requestScrollRefresh` (在所有 card 绑定后刷新 ScrollTrigger 测量)
 *
 * @performance / @caveats
 *   - tilt 交互在每个 media-frame 上独立运行（各自一个 gsap.ticker callback），
 *     单帧内仅写入 rotateX/rotateY (GPU 合成)，不触发布局
 *   - onEnter/onLeaveBack 的双向触发确保卡片进入/退出视口时 CSS transition 自然反转
 *   - 媒体图片使用 `loading="lazy"` 延迟加载；非首屏项目不抢占网络带宽
 *
 * @steps
 *   step1: 标题裂分入场 (split-line stagger)
 *   step2: 每张 card 绑定 ScrollTrigger.onEnter → 添加 is-visible CSS 过渡
 *   step3: 每张 card 注入 data-accent 色彩到 CSS 变量 --accent
 *   step4: requestScrollRefresh 确保 ScrollTrigger 在测量完成后刷新
 *   step5: 每个 media-frame 绑定 attachTilt（独立生命周期，在 ctx.revert 之外手动清理）
 */
export default function Projects() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.section__title .split-line__inner',
        { yPercent: 110, skewY: 6 },
        {
          yPercent: 0,
          skewY: 0,
          duration: 1.4,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.section__title', start: 'top 88%', toggleActions: 'play none none reverse' },
        }
      )

      // Bento tiles cascade in once (per-tile delay lives in CSS via --tile-i).
      const bento = root.current?.querySelector<HTMLElement>('.projects__bento')
      if (bento) {
        ScrollTrigger.create({
          trigger: bento,
          start: 'top 86%',
          onEnter: () => bento.classList.add('is-visible'),
          onLeaveBack: () => bento.classList.remove('is-visible'),
        })
      }

      gsap.utils.toArray<HTMLElement>('.project-card').forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          onEnter: () => card.classList.add('is-visible'),
          onLeaveBack: () => card.classList.remove('is-visible'),
        })
      })

      root.current?.querySelectorAll<HTMLElement>('.project-card').forEach((card) => {
        const accent = card.dataset.accent || '#6b8fb5'
        card.style.setProperty('--accent', accent)
      })

      requestScrollRefresh()
    }, root)

    // Pointer-following 3D tilt on each media frame (no-ops on touch / reduced
    // motion). Lives outside the gsap.context — it owns its own ticker/listeners
    // and is torn down explicitly below.
    const tiltDisposers = gsap.utils
      .toArray<HTMLElement>(root.current.querySelectorAll('.media-frame'))
      .map((frame) => attachTilt(frame, { damp: 0.22 }))

    return () => {
      tiltDisposers.forEach((dispose) => dispose())
      ctx.revert()
    }
  }, [])

  return (
    <section className="section projects container" id="projects" ref={root}>
      <div className="projects__header">
        <div>
          <div className="section__label"><ShinyText text="Work — 选作" speed={6} /></div>
          <h2 className="section__title">
            <span className="split-line"><span className="split-line__inner">Six things <em>I made</em></span></span>
            <span className="split-line"><span className="split-line__inner">in 2026.</span></span>
          </h2>
        </div>
        <p className="projects__header-side">
          每个项目都对应一个 GitHub 仓库。点开看 README 里我留下的细节 —
          它们大多是阶段性的，但每一个我都在工程化上花过功夫。
        </p>
      </div>

      <ProjectsBento />

      <div className="projects__list">
        {projects.map((p) => (
          <article
            className="project-card"
            key={p.id}
            data-accent={p.accent}
            data-project-id={p.id}
          >
            <div className="project-card__text">
              <div className="project-card__top">
                <span className="project-card__index">{p.index}</span>
                <span className="project-card__year">{p.year}</span>
              </div>

              <h3 className="project-card__title">{p.name}</h3>
              <div className="project-card__cn">{p.cnTitle}</div>
              <div className="project-card__tagline">{p.tagline}</div>

              <p className="project-card__desc">{p.description}</p>
              <ul className="project-card__highlights">
                {p.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <div className="project-card__stack">
                {p.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="project-card__links">
                <a className="project-card__link" href={p.github} target="_blank" rel="noopener noreferrer">
                  GitHub
                  <svg viewBox="0 0 12 12" fill="none">
                    <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </a>
                {p.live && (
                  <a className="project-card__link" href={p.live} target="_blank" rel="noopener noreferrer">
                    Live
                    <svg viewBox="0 0 12 12" fill="none">
                      <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <ProjectMedia project={p} />
          </article>
        ))}
      </div>
    </section>
  )
}

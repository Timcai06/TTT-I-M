import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { revealWords } from '../lib/wordReveal'
import { facts } from '../content'
import AboutDecryptReveal from './effects/AboutDecryptReveal'
import CountUp from './CountUp'

/** Split a fact value like `'10+'` into its leading number and trailing suffix. */
function parseFact(value: string): { to: number; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/)
  if (!match) return { to: 0, suffix: value }
  return { to: Number(match[1] ?? 0), suffix: match[2] ?? '' }
}

/**
 * @description About 章节 —— 首屏身份档案由 Canvas UI Decrypt Reveal 解码，
 *   下方真实 DOM 承担 Vision / Tech Stack / Manifesto / Facts 的连续阅读。
 *
 *   Manifesto 段落使用 `revealWords` 做逐字模糊→清晰 scrub reveal（CJK 感知 tokenizer），
 *   其余段落使用 GSAP fromTo 渐现。双向回退 (`toggleActions: 'play none none reverse'`)
 *   确保用户向上滚动时动画自然撤消。
 *
 * @dependencies
 *   - GSAP + ScrollTrigger + useGSAP (动画生命周期管理)
 *   - `revealWords` (CJK 感知 word-by-word blur→clear scrub)
 *   - App 级静态 grain（About 不持有独立 WebGL 背景）
 *   - Tech 竖线使用自定义贝塞尔路径 (C 1,2,3,4...) strokeDashoffset scrubbing
 *
 * @performance / @caveats
 *   - 身份档案保持静态布局，避免 capture 期间同时运行标题位移与肖像 border-radius repaint
 *   - Tech 竖线使用 `strokeDashoffset` 驱动（非 filter/blur），仅操作 SVG 描边，GPU 友好
 *   - About 不再挂载独立 TextParticles canvas，避免与全局 Continuum 形成双 WebGL 粒子负载
 *
 * @steps Decrypt 首屏保持稳定 capture；下方段落、统计与 Tech 路径独立进入。
 */
export default function About() {
  const root = useRef<HTMLElement>(null)
  const techPathRef = useRef<SVGPathElement>(null)

  useGSAP(() => {
    if (!root.current) return
      // Independent paragraph blocks reveal. The manifesto is excluded here —
      // it gets a word-level blur→clear reveal instead (see below).
      gsap.utils
        .toArray<HTMLElement>('.about__block:not(.about__block--manifesto)')
        .forEach((block) => {
          gsap.fromTo(
            block,
            { y: 32, opacity: 0 },
            {
              scrollTrigger: {
                trigger: block,
                start: 'top 90%',
                toggleActions: 'play none none reverse', // 双向回退触发
              },
              y: 0,
              opacity: 1,
              duration: 1.6,
              ease: 'expo.out',
            }
          )
        })

      // Manifesto: scrubbed word-by-word de-blur as the line crosses the band.
      revealWords(root.current, '.about__block--manifesto p')

      // Stats reveal
      gsap.from('.about__fact', {
        scrollTrigger: {
          trigger: '.about__facts',
          start: 'top 92%',
          toggleActions: 'play none none reverse', // 双向回退触发
        },
        y: 32,
        opacity: 0,
        duration: 1.8,
        stagger: 0.15,
        ease: 'expo.out',
      })

      // Tech scroll line animation (draws custom bezier curve progressively until the chapter ends)
      const path = techPathRef.current
      if (path) {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
        gsap.to(path, {
          strokeDashoffset: 0,
          scrollTrigger: {
            trigger: '.about__block--tech',
            endTrigger: '.about__grid',
            start: 'top 80%',
            end: 'bottom 80%',
            scrub: 1.0,
          },
        })
      }
  }, { scope: root })

  return (
    <section className="section about" id="about" ref={root}>
      <AboutDecryptReveal>
        <div className="about__dossier">
          <div className="about__dossier-header">
            <div className="section__label">About — 自述</div>
            <div className="about__dossier-kicker">IDENTITY DOSSIER / 00—06</div>
          </div>

          <div className="about__dossier-copy">
            <h2 className="about__lead">
              <span>上海大一在读，</span>
              <span>我把模型、数据和交互</span>
              <span><em>做成能运行、能复盘的</em></span>
              <span><em>系统。</em></span>
            </h2>
            <p className="about__dossier-summary">
              我关心的不只是模型有没有跑通，而是证据从哪来、运行时发生了什么，以及别人能不能复现。
            </p>
          </div>

          <div className="about__portrait-frame">
            <div className="about__portrait-glow" />
            <img className="about__portrait-img" src="/portrait/about_me.jpg" alt="Tim's Portrait" />
            <div className="about__portrait-vignette" />
            <div className="about__portrait-meta">PROFILE CAPTURE → V3.0</div>
          </div>

          <dl className="about__dossier-meta">
            <div><dt>PROFILE</dt><dd>TIM CAI</dd></div>
            <div><dt>FOCUS</dt><dd>AI SYSTEMS × INTERACTION</dd></div>
            <div><dt>BASE</dt><dd>SHANGHAI / CN</dd></div>
          </dl>

          <div className="about__decrypt-hint" aria-hidden="true">
            <span>MOVE TO DECRYPT</span>
            <span>移动以解密</span>
          </div>
        </div>
      </AboutDecryptReveal>

      <div className="about__grid about__grid--evidence">
        <div className="about__left">
          <div className="about__content-flow">
            {/* Block 1: Vision / Background (Large Serif, Left-aligned) */}
            <div className="about__block about__block--vision">
              <p>
                大一这一年，我没有只把模型跑通。
                <span className="highlight-text"> PulseGraph</span> 把模型图、训练遥测和推理结果留在同一次运行里；
                <span className="highlight-text"> SciScope</span> 把近 16 万篇论文接进检索与论断核查。
                结果好不好是一件事，我更想知道：
                <span className="highlight-text font-italic">“证据从哪来，运行时发生了什么，别人能不能复现”</span>。
              </p>
            </div>

            {/* Block 2: Tech Specs (Indented/Right aligned, Small Mono/Sans) */}
            <div className="about__block about__block--tech">
              <div className="about__tech-line-container">
                <svg className="about__tech-svg" viewBox="0 0 40 180" fill="none" preserveAspectRatio="none">
                  {/* Guide Track line */}
                  <path
                    d="M 20,0 C 20,40 2,60 2,90 C 2,120 38,140 38,180"
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                  {/* Flowing active line */}
                  <path
                    ref={techPathRef}
                    d="M 20,0 C 20,40 2,60 2,90 C 2,120 38,140 38,180"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="about__block-label">// TECHNICAL STACK</span>
              <p>
                界面：React / Next.js / TypeScript / GSAP / R3F<br />
                AI Runtime：PyTorch / FastAPI / LangGraph / DeepSeek / SSE<br />
                Data & Systems：PostgreSQL / pgvector / Go / Python / Linux
              </p>
            </div>

            {/* Block 3: Manifesto (Medium Serif, Indented Left, Accent Highlight) */}
            <div className="about__block about__block--manifesto">
              <p>
                “能跑”不是完成。数据口径、运行记录、失败边界和
                <span className="highlight-code">复现命令</span>，应该跟界面一起交付。
              </p>
            </div>
          </div>

          <div className="about__facts">
            {facts.map((f) => {
              const { to, suffix } = parseFact(f.value)
              return (
                <div className="about__fact" key={f.label}>
                  <span className="about__fact-value">
                    <CountUp to={to} suffix={suffix} duration={1.8} />
                  </span>
                  {f.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className="about__right">
          <div className="about__evidence-aside">
            <span className="about__evidence-index">METHOD / TRACE / PROOF</span>
            <div className="about__block about__block--philosophy">
              <p>
                这个站也不是一张静态简历。GSAP、R3F 和自定义 GLSL 串起代码、项目与证据，<br />
                也留下一点我在镜头外的生活。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { useRef, useState, type CSSProperties } from 'react'
import { WORK_TRANSITION_NARRATIVE } from '../core/narrative/index.ts'
import { useMobileExperience } from '../lib/device'
import { gsap, useGSAP } from '../lib/gsap'
import { getLenis } from '../lib/lenis'
import { useReducedMotion } from '../lib/motion'
import { requestScrollRefresh } from '../lib/scroll/requestRefresh'
import { dispatchWorkHandoff } from '../lib/workHandoff'
import { LiquidMetalButton } from '../shaders/liquid-metal-button/LiquidMetalButton'
import { preloadLiquidMetalButtonSource } from '../shaders/liquid-metal-button/liquidMetalSource'
import { SparkBadge } from '../shaders/spark-badge/SparkBadge'
import sparkBadgeUrl from '../shaders/spark-badge/spark-badge-portfolio.html?url'

type SparkControls = {
  speed: number
  particleAmount: number
  rainAmount: number
  turbulence: number
  spread: number
}

const WORK_GATE_PROGRESS = WORK_TRANSITION_NARRATIVE.gate.progress

interface WorkTransitionStyle extends CSSProperties {
  '--work-transition-height-desktop': string
  '--work-transition-height-mobile': string
}

const WORK_TRANSITION_STYLE: WorkTransitionStyle = {
  '--work-transition-height-desktop': WORK_TRANSITION_NARRATIVE.desktopHeight,
  '--work-transition-height-mobile': WORK_TRANSITION_NARRATIVE.mobileHeight,
}

const mix = (from: number, to: number, progress: number) => from + (to - from) * progress

function controlsForProgress(progress: number, mobile: boolean): SparkControls {
  const formation = Math.min(1, progress / 0.58)
  const release = Math.max(0, Math.min(1, (progress - 0.88) / 0.1))
  const intensity = formation * (1 - release * 0.9)

  return {
    speed: mix(mobile ? 0.32 : 0.42, mobile ? 0.58 : 0.76, intensity),
    particleAmount: mix(mobile ? 0.4 : 0.5, mobile ? 0.5 : 0.68, intensity),
    rainAmount: mix(mobile ? 0.06 : 0.12, mobile ? 0.3 : 0.52, intensity),
    turbulence: mix(0.36, mobile ? 0.7 : 0.92, intensity),
    spread: mix(0.68, mobile ? 0.88 : 1.02, intensity),
  }
}

/**
 * Stack → Work 的无导航叙事桥。Spark Badge 只在这一章形成浏览器轮廓，
 * 三段文案由同一条滚动时间轴连续驱动；Liquid Metal Button 是唯一交互终点。
 * 两个 ThreeUI renderer 都保留原始 iframe 隔离、offscreen unmount 和源码算法。
 */
export default function WorkTransition() {
  const root = useRef<HTMLElement>(null)
  const ctaMountedRef = useRef(false)
  const gateLockedRef = useRef(false)
  const gateReleasedRef = useRef(false)
  const gateBypassRef = useRef(false)
  const gateScrollRef = useRef(0)
  const metalSourceRequestedRef = useRef(false)
  const observedHashRef = useRef('')
  const timelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
  const [ctaMounted, setCtaMounted] = useState(false)
  const [gateLocked, setGateLocked] = useState(false)
  const reducedMotion = useReducedMotion()
  const mobile = useMobileExperience()

  useGSAP(() => {
    const section = root.current
    if (!section || reducedMotion) {
      requestScrollRefresh()
      return
    }

    let lastControlPost = 0
    let focusFrame = 0
    observedHashRef.current = window.location.hash
    gateBypassRef.current = observedHashRef.current === '#projects'
      || observedHashRef.current === '#contact'

    const clampToGate = () => {
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(gateScrollRef.current, { immediate: true, force: true })
      else window.scrollTo({ top: gateScrollRef.current, behavior: 'auto' })
    }
    const preventForwardScroll = (event: WheelEvent) => {
      if (!gateLockedRef.current || event.deltaY <= 0) return
      event.preventDefault()
      clampToGate()
    }
    const preventForwardKey = (event: globalThis.KeyboardEvent) => {
      if (!gateLockedRef.current) return
      const forwardKey = event.key === 'ArrowDown'
        || event.key === 'PageDown'
        || event.key === 'End'
        || (event.key === ' ' && !event.shiftKey)
      if (!forwardKey) return
      event.preventDefault()
      clampToGate()
    }
    window.addEventListener('wheel', preventForwardScroll, { passive: false, capture: true })
    window.addEventListener('keydown', preventForwardKey, { capture: true })

    const postSparkControls = (progress: number) => {
      const now = performance.now()
      if (now - lastControlPost < 34 && progress > 0 && progress < 1) return
      lastControlPost = now
      const frame = section.querySelector<HTMLIFrameElement>('.spark-badge__frame')
      frame?.contentWindow?.postMessage({
        type: 'spark-badge-controls',
        controls: controlsForProgress(progress, mobile),
      }, '*')
    }

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: mobile ? 0.25 : 0.32,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          postSparkControls(self.progress)

          if (!metalSourceRequestedRef.current && self.progress > 0.82) {
            metalSourceRequestedRef.current = true
            void preloadLiquidMetalButtonSource().catch(() => {
              metalSourceRequestedRef.current = false
            })
          }

          const currentHash = window.location.hash
          if (currentHash !== observedHashRef.current) {
            observedHashRef.current = currentHash
            gateBypassRef.current = currentHash === '#projects' || currentHash === '#contact'
          }
          if (self.direction < 0 && self.progress < 0.94) {
            gateReleasedRef.current = false
            gateBypassRef.current = false
          }
          const deliberateChapterJump = gateBypassRef.current
          if (
            gateLockedRef.current
            && deliberateChapterJump
          ) {
            gateLockedRef.current = false
            setGateLocked(false)
          } else if (
            gateLockedRef.current
            && self.direction < 0
            && self.progress < WORK_GATE_PROGRESS - 0.006
          ) {
            gateLockedRef.current = false
            setGateLocked(false)
          } else if (
            gateLockedRef.current
            && self.direction > 0
            && self.progress > WORK_GATE_PROGRESS + 0.001
          ) {
            clampToGate()
          }

          const shouldMountCta = ctaMountedRef.current ? self.progress > 0.86 : self.progress > 0.9
          if (shouldMountCta !== ctaMountedRef.current) {
            ctaMountedRef.current = shouldMountCta
            setCtaMounted(shouldMountCta)
          }

          if (
            !mobile
            && !gateReleasedRef.current
            && !gateLockedRef.current
            && !deliberateChapterJump
            && self.direction > 0
            && self.progress >= WORK_GATE_PROGRESS
          ) {
            gateScrollRef.current = self.start + (self.end - self.start) * WORK_GATE_PROGRESS
            gateLockedRef.current = true
            setGateLocked(true)
            clampToGate()
            focusFrame = window.requestAnimationFrame(() => {
              section.querySelector<HTMLIFrameElement>('.liquid-metal-button__frame')?.focus()
            })
          }
        },
      },
    })
    timelineRef.current = timeline

    timeline
      .addLabel('potential', 0.02)
      .addLabel('system', 0.32)
      .addLabel('breath', 0.665)
      .addLabel('proof', 0.7)
      .addLabel('cta', 0.93)
      .addLabel('handoff', WORK_GATE_PROGRESS)
      .fromTo(
        '.work-transition__spark',
        { autoAlpha: 0.16, scale: 1.075, xPercent: 4 },
        { autoAlpha: 0.96, scale: 1, xPercent: 0, duration: 0.5, ease: 'power1.out' },
        'potential',
      )
      .to('.work-transition__spark', { autoAlpha: 1, scale: 0.975, duration: 0.16, ease: 'power1.inOut' }, 'breath-=0.045')
      .to('.work-transition__spark', { autoAlpha: 0.08, scale: 1.085, xPercent: 7, duration: 0.09, ease: 'power2.in' }, 'cta')
      .to('.work-transition__kicker', { autoAlpha: 0.2, y: -12, duration: 0.08, ease: 'power1.inOut' }, 'cta-=0.02')
      .fromTo('.work-transition__cta', { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power3.out' }, 'cta+=0.01')
      .to('.work-transition__cta', { autoAlpha: 1, duration: 0.02 }, 0.98)

    const addTrackedPhase = (selector: string, enterAt: number, exitAt: number) => {
      timeline.fromTo(
        `${selector} .work-transition__phase-content`,
        { y: 72, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.08,
          ease: 'power1.out',
          immediateRender: true,
        },
        enterAt,
      )
      timeline.to(
        `${selector} .work-transition__phase-content`,
        {
          y: -72,
          autoAlpha: 0,
          duration: 0.08,
          ease: 'power1.in',
        },
        exitAt,
      )
    }

    const [potentialPhase, systemPhase, proofPhase] = WORK_TRANSITION_NARRATIVE.phases
    addTrackedPhase('.work-transition__phase--one', potentialPhase.enter, potentialPhase.exit)
    addTrackedPhase('.work-transition__phase--two', systemPhase.enter, systemPhase.exit)
    addTrackedPhase('.work-transition__phase--three', proofPhase.enter, proofPhase.exit)

    postSparkControls(0)
    requestScrollRefresh()

    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('wheel', preventForwardScroll, { capture: true })
      window.removeEventListener('keydown', preventForwardKey, { capture: true })
      gateLockedRef.current = false
      timelineRef.current = null
    }
  }, { scope: root, dependencies: [mobile, reducedMotion], revertOnUpdate: true })

  const enterWork = () => {
    const work = document.getElementById('projects')
    if (!work) return
    gateReleasedRef.current = true
    gateLockedRef.current = false
    setGateLocked(false)
    timelineRef.current?.scrollTrigger?.getTween(true)?.kill()
    timelineRef.current?.scrollTrigger?.getTween()?.kill()
    dispatchWorkHandoff()
    window.history.replaceState(null, '', '#projects')
    const lenis = getLenis()
    if (lenis) {
      lenis.start()
      lenis.scrollTo(work, { offset: -48, force: true })
    }
    else work.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const initialControls = controlsForProgress(0, mobile)

  return (
    <section
      className="work-transition"
      id="work-transition"
      ref={root}
      aria-label="From stack to selected work"
      data-gate={gateLocked ? 'locked' : 'open'}
      style={WORK_TRANSITION_STYLE}
    >
      <div className="work-transition__sticky">
        {!reducedMotion && (
          <div className="work-transition__spark" aria-hidden="true">
            <SparkBadge
              variant="browser"
              sourceUrl={sparkBadgeUrl}
              speed={initialControls.speed}
              particleAmount={initialControls.particleAmount}
              rainAmount={initialControls.rainAmount}
              turbulence={initialControls.turbulence}
              spread={initialControls.spread}
            />
          </div>
        )}

        <div className="work-transition__veil" aria-hidden="true" />

        <div className="work-transition__copy">
          <p className="work-transition__kicker">From stack to a working system · 从技术栈到能用的系统</p>

          <div className="work-transition__phase work-transition__phase--one" data-work-phase="potential">
            <div className="work-transition__phase-content">
              <span className="work-transition__index">01 / PARTS</span>
              <h2><span>A stack is still</span><span><em>a list of parts.</em></span></h2>
              <p>React、PyTorch、PostgreSQL 单独列出来，只是一张清单。难的是让它们交换数据、暴露错误，最后真的帮到一个人。</p>
            </div>
          </div>

          <div className="work-transition__phase work-transition__phase--two" data-work-phase="system">
            <div className="work-transition__phase-content">
              <span className="work-transition__index">02 / SEAMS</span>
              <h2><span>Connect the parts.</span><span>Then test <em>the seams.</em></span></h2>
              <p>界面得讲清一次运行，数据也要追得到来源。漂亮结果不能替失败遮羞。到这里，技术栈才算长成产品。</p>
            </div>
          </div>

          <div className="work-transition__phase work-transition__phase--three" data-work-phase="proof">
            <div className="work-transition__phase-content">
              <span className="work-transition__index">03 / WORK</span>
              <h2><span>Six projects.</span><span>See what <em>held.</em></span></h2>
              <p>下面六个项目都留着输入、运行记录和没解决的问题。你会看到它们做成了什么，也会看到我在哪些地方停住。</p>
            </div>
          </div>
        </div>

        <div className="work-transition__cta-shell">
          <div className="work-transition__cta">
            {(reducedMotion || ctaMounted) && (
              <LiquidMetalButton
                text="ENTER THE WORK"
                variant="pill"
                rendering="colored"
                onClick={enterWork}
              />
            )}
            <span className="work-transition__gate-hint" aria-live="polite">
              {gateLocked ? 'Click to continue · 点击进入作品' : 'Scroll narrative / 03'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

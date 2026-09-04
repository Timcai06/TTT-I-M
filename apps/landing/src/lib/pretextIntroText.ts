import { useEffect, type RefObject } from 'react'
import { useReducedMotion } from './motion'

const FONT_READY_INTERACTION_TIMEOUT_MS = 1600
const MIN_FIELD_RADIUS = 150
const GLYPH_HIT_PADDING = 18
type PretextModule = typeof import('@chenglou/pretext')
let pretextPromise: Promise<PretextModule> | null = null

/**
 * @description 单个字符在鼠标扰动场里的运行时状态，绑定 DOM 实测位置和当前动画插值值
 * @dependencies 依赖浏览器 DOMRect、PointerEvent 坐标和 requestAnimationFrame 手写循环
 * @performance 字段会在每帧被读写，保持扁平数值结构，避免在高频 pointermove 中创建临时对象
 */
interface GlyphState {
  /** 字符命中盒底边，来自最近一次 DOMRect 测量 */
  bottom: number
  /** 实际要写入 transform/opacity 的字符节点 */
  el: HTMLElement
  /** 字符命中盒高度，用于计算悬停 padding */
  height: number
  /** 字符稳定位置的屏幕 X 坐标，不直接等于 DOMRect 中心，可能经过 Pretext 自然宽度校正 */
  homeX: number
  /** 字符稳定位置的屏幕 Y 坐标 */
  homeY: number
  /** 字符命中盒左边界 */
  left: number
  /** 每个字符的相位偏移，用来制造轻微错落的扰动脉冲 */
  phase: number
  /** 字符命中盒右边界 */
  right: number
  /** 当前旋转角度，单位为 deg */
  rotation: number
  /** 当前缩放比例，正常状态为 1 */
  scale: number
  /** 字符命中盒顶边 */
  top: number
  /** 字符命中盒宽度，用于悬停命中扩展 */
  width: number
  /** 当前相对稳定位置的 X 位移 */
  x: number
  /** 当前相对稳定位置的 Y 位移 */
  y: number
}

/**
 * @description Pretext 字符扰动 hook 的调用配置，控制是否启用、选择哪些 glyph、以及动画强度
 */
interface PretextTextInteractionOptions {
  /** 当前交互是否挂载；关闭时会清空所有字符的 transform/opacity */
  enabled: boolean
  /** 字符节点选择器，Intro 与普通 Pretext 文案可复用同一套扰动逻辑 */
  glyphSelector?: string
  /** 外部布局变化信号；变化后重新测量字符位置 */
  refreshKey?: number
  /** 位移、旋转和缩放的整体倍率，默认 1 */
  strength?: number
  /** 原始文本，用于 Pretext 自然宽度测量的兜底输入 */
  text: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * @description 懒加载 Pretext 包，避免首屏 JS 解析阶段同步拉入字符测量工具
 * @dependencies 依赖 @chenglou/pretext 的 prepareWithSegments / measureNaturalWidth
 * @performance 使用模块级 Promise 缓存，多个文本实例共享同一次动态 import
 */
function loadPretext() {
  if (!pretextPromise) {
    const request = import('@chenglou/pretext').catch((error: unknown) => {
      if (pretextPromise === request) pretextPromise = null
      throw error
    })
    pretextPromise = request
  }
  return pretextPromise
}

/**
 * @description 等字体可用后再测量字符，防止 TimCai/Intro 强刷后因 fallback 字体导致字符槽忽大忽小
 * @dependencies 依赖 document.fonts.ready；不支持 Font Loading API 时直接放行
 * @caveats 最多等待 1600ms，避免字体网络异常把交互初始化永久卡住
 */
function waitForFontsBeforePretext() {
  if (!document.fonts) return Promise.resolve()

  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(finish, FONT_READY_INTERACTION_TIMEOUT_MS)
    void document.fonts.ready.then(finish, finish)
  })
}

/**
 * @description 从当前文本节点提取 Pretext 可用的字体字符串，保持测量宽度和真实渲染字体一致
 * @dependencies 依赖 getComputedStyle 的 fontWeight、fontSize、fontFamily、letterSpacing
 * @caveats letter-spacing 可能返回 normal，必须转成 0，避免传入 NaN 影响自然宽度计算
 */
function fontFromElement(el: HTMLElement) {
  const style = window.getComputedStyle(el)
  const size = Number.parseFloat(style.fontSize) || 120
  const spacing = Number.parseFloat(style.letterSpacing)

  return {
    font: `${style.fontWeight} ${size}px ${style.fontFamily}`,
    fontSize: size,
    letterSpacing: Number.isFinite(spacing) ? spacing : 0,
  }
}

/**
 * @description 测量单个字符在当前字体下的自然宽度，用于重建一条稳定的字符中心线
 * @dependencies 依赖 Pretext prepareWithSegments / measureNaturalWidth
 * @caveats 空格没有可见轮廓，使用 fontSize 的固定比例兜底，避免字符游标坍缩
 */
function measureGlyphWidth(
  pretext: PretextModule,
  char: string,
  font: string,
  fontSize: number,
  letterSpacing: number
) {
  if (char === ' ') return fontSize * 0.32

  const prepared = pretext.prepareWithSegments(char, font, {
    letterSpacing,
    whiteSpace: 'pre-wrap',
  })

  return Math.max(1, pretext.measureNaturalWidth(prepared))
}

/**
 * @description 在 Pretext 测量失败或容器尺寸不可用时，直接用 DOMRect 中心创建字符状态
 * @dependencies 依赖浏览器布局后的 getBoundingClientRect 结果
 * @performance 只在初始化、resize 或 fallback 路径执行，不放进每帧循环
 */
function createGlyphStateFromRect(el: HTMLElement, index: number, rect: DOMRect): GlyphState {
  return {
    bottom: rect.bottom,
    el,
    height: rect.height,
    homeX: rect.left + rect.width / 2,
    homeY: rect.top + rect.height / 2,
    left: rect.left,
    phase: index * 0.68,
    right: rect.right,
    rotation: 0,
    scale: 1,
    top: rect.top,
    width: rect.width,
    x: 0,
    y: 0,
  }
}

/**
 * @description 计算鼠标是否真正进入某个字符的扩展命中区域，避免整段文字被远距离鼠标整体拉扯
 * @dependencies 依赖字符 DOMRect 边界和 GLYPH_HIT_PADDING
 * @performance 仅做数值计算，不读取布局；可安全放进每帧 glyph 遍历
 */
function pointerInfluenceForGlyph(glyph: GlyphState, mouseX: number, mouseY: number) {
  const padding = Math.max(GLYPH_HIT_PADDING, Math.min(glyph.width, glyph.height) * 0.24)
  const left = glyph.left - padding
  const right = glyph.right + padding
  const top = glyph.top - padding
  const bottom = glyph.bottom + padding

  if (mouseX < left || mouseX > right || mouseY < top || mouseY > bottom) return 0

  const closestX = clamp(mouseX, glyph.left, glyph.right)
  const closestY = clamp(mouseY, glyph.top, glyph.bottom)
  const edgeDistance = Math.hypot(mouseX - closestX, mouseY - closestY)
  return clamp(1 - edgeDistance / padding, 0, 1)
}

/**
 * @description 生成所有字符的稳定中心点，让 Pretext 视觉字符槽和真实字体宽度对齐
 * @dependencies 依赖 @chenglou/pretext、DOMRect、data-final 字符数据和当前 CSS 字体
 * @performance 该函数会读取布局并动态 import Pretext，只在启用、字体 ready、resize 或 refreshKey 变化时调用
 * @steps
 * step1: 收集 glyph 节点和文本容器的 DOMRect，缺少尺寸时走 DOMRect 兜底
 * step2: 使用当前 CSS 字体测量整段文本自然宽度和每个字符宽度
 * step3: 将自然宽度中的字符中心映射回真实渲染容器宽度，得到稳定 homeX/homeY
 */
async function createGlyphStates(
  textEl: HTMLElement,
  text: string,
  glyphSelector: string
): Promise<GlyphState[]> {
  const glyphs = Array.from(textEl.querySelectorAll<HTMLElement>(glyphSelector))
  const rect = textEl.getBoundingClientRect()
  if (glyphs.length === 0) return []

  const fallbackStates = () => glyphs.map((el, index) => {
    const glyphRect = el.getBoundingClientRect()
    return createGlyphStateFromRect(el, index, glyphRect)
  })

  if (rect.width <= 0 || rect.height <= 0) return fallbackStates()

  const pretext = await loadPretext()
  const { font, fontSize, letterSpacing } = fontFromElement(textEl)
  const glyphChars = glyphs.map((glyph) => glyph.dataset.final ?? glyph.textContent ?? '')
  const measuredText = glyphChars.join('') || text
  const prepared = pretext.prepareWithSegments(measuredText, font, {
    letterSpacing,
    whiteSpace: 'pre-wrap',
  })
  const naturalWidth = Math.max(1, pretext.measureNaturalWidth(prepared))
  const glyphWidths = glyphChars.map((char) =>
    measureGlyphWidth(pretext, char, font, fontSize, letterSpacing)
  )
  const widthSum = glyphWidths.reduce((sum, width) => sum + width, 0) || naturalWidth
  const scaleToNatural = naturalWidth / widthSum
  let cursor = -naturalWidth / 2

  return glyphs.map((el, index) => {
    const width = (glyphWidths[index] ?? fontSize * 0.32) * scaleToNatural
    const center = cursor + width / 2
    cursor += width
    const glyphRect = el.getBoundingClientRect()

    return {
      bottom: glyphRect.bottom,
      el,
      height: glyphRect.height,
      homeX: rect.left + rect.width / 2 + (center / naturalWidth) * rect.width,
      homeY: rect.top + rect.height / 2,
      left: glyphRect.left,
      phase: index * 0.68,
      right: glyphRect.right,
      rotation: 0,
      scale: 1,
      top: glyphRect.top,
      width: glyphRect.width,
      x: 0,
      y: 0,
    }
  })
}

/**
 * @description 为 Pretext 拆分后的字符提供鼠标悬停跟随、轻扰动和按压脉冲，服务 Intro 与正文文字动效
 * @dependencies 依赖 React effect、@chenglou/pretext、Font Loading API、PointerEvent、requestAnimationFrame
 * @performance 交互采用“有指针活动才启动，静止后自动停机”的 rAF 策略；每帧只写 transform/opacity，避免反复读布局
 * @caveats prefers-reduced-motion 时完全跳过动画；enabled 关闭和组件卸载都会清空内联样式，避免残留遮挡真实文字
 * @steps
 * step1: 等待字体 ready 或超时后测量字符稳定位置
 * step2: 监听 pointer/resize，指针移动时启动 rAF 动画循环
 * step3: 每帧根据字符距离、命中 padding、按压状态计算目标位移/旋转/缩放
 * step4: 字符回到稳定状态后停止 rAF，释放空闲帧预算
 */
export function usePretextTextInteraction(
  textRef: RefObject<HTMLElement | null>,
  {
    enabled,
    glyphSelector = '.pretext-glyph',
    refreshKey = 0,
    strength = 1,
    text,
  }: PretextTextInteractionOptions
) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!enabled || reducedMotion) {
      textRef.current
        ?.querySelectorAll<HTMLElement>(glyphSelector)
        .forEach((glyph) => {
          glyph.style.transform = ''
          glyph.style.opacity = ''
        })
      return
    }

    const textEl = textRef.current
    if (!textEl) return

    let cancelled = false
    let frame = 0
    let running = false
    let interactionActive = false
    let listenersAttached = false
    let measurementVersion = 0
    let glyphs: GlyphState[] = []
    let mouseX = Number.POSITIVE_INFINITY
    let mouseY = Number.POSITIVE_INFINITY
    let lastMove = 0
    let fieldRadius = MIN_FIELD_RADIUS
    let hasPointer = false
    let press = 0
    let measuredScrollX = window.scrollX
    let measuredScrollY = window.scrollY

    const scheduleAnimation = () => {
      if (running || cancelled) return
      running = true
      frame = window.requestAnimationFrame(animate)
    }

    const resetGlyphs = () => {
      glyphs.forEach(({ el }) => {
        el.style.transform = ''
        el.style.opacity = ''
      })
    }

    const prepareGlyphs = () => {
      const version = ++measurementVersion
      const rect = textEl.getBoundingClientRect()
      fieldRadius = Math.max(MIN_FIELD_RADIUS, rect.width * 0.5)
      measuredScrollX = window.scrollX
      measuredScrollY = window.scrollY
      void createGlyphStates(textEl, text, glyphSelector).then((nextGlyphs) => {
        if (cancelled || version !== measurementVersion) return
        glyphs = nextGlyphs
      }).catch(() => {
        if (cancelled || version !== measurementVersion) return
        glyphs = Array.from(textEl.querySelectorAll<HTMLElement>(glyphSelector)).map((el, index) => {
          const glyphRect = el.getBoundingClientRect()
          return createGlyphStateFromRect(el, index, glyphRect)
        })
      })
    }

    const syncScrollCoordinates = () => {
      const dx = window.scrollX - measuredScrollX
      const dy = window.scrollY - measuredScrollY
      if (dx === 0 && dy === 0) return
      glyphs.forEach((glyph) => {
        glyph.left -= dx
        glyph.right -= dx
        glyph.homeX -= dx
        glyph.top -= dy
        glyph.bottom -= dy
        glyph.homeY -= dy
      })
      measuredScrollX = window.scrollX
      measuredScrollY = window.scrollY
    }

    const onPointerMove = (event: PointerEvent) => {
      syncScrollCoordinates()
      hasPointer = true
      mouseX = event.clientX
      mouseY = event.clientY
      lastMove = performance.now()
      scheduleAnimation()
    }

    const onPointerLeave = () => {
      hasPointer = false
      mouseX = Number.POSITIVE_INFINITY
      mouseY = Number.POSITIVE_INFINITY
      press = 0
      scheduleAnimation()
    }

    const onPointerDown = () => {
      press = 1
      scheduleAnimation()
    }

    const onPointerUp = () => {
      press = 0
    }

    const animate = (time: number) => {
      if (cancelled || !interactionActive || document.visibilityState === 'hidden') {
        running = false
        frame = 0
        return
      }

      const inactive = !hasPointer || performance.now() - lastMove > 1400
      press += (0 - press) * 0.045
      let needsNextFrame = !inactive || press > 0.002

      glyphs.forEach((glyph) => {
        let targetX = 0
        let targetY = 0
        let targetRotation = 0
        let targetScale = 1
        let eased = 0

        if (!inactive) {
          const dx = glyph.homeX - mouseX
          const dy = glyph.homeY - mouseY
          const distance = Math.hypot(dx, dy)
          const proximity = pointerInfluenceForGlyph(glyph, mouseX, mouseY)
          const influence = proximity * clamp(1 - distance / fieldRadius, 0, 1)
          eased = influence * influence * (3 - 2 * influence)
          const safeDistance = Math.max(distance, 1)
          const pulse = Math.sin(time * 0.0024 + glyph.phase)
          const push = eased * (62 + press * 42) * strength
          const ambient = pulse * eased * 4.5 * strength
          const tangent = Math.cos(time * 0.002 + glyph.phase) * eased * 7 * strength
          targetX = (dx / safeDistance) * push + tangent
          targetY = (dy / safeDistance) * push + ambient
          targetRotation = (targetX / 58) * 10 + press * pulse * 6
          targetScale = 1 + eased * 0.055 + press * 0.035
        }

        glyph.x += (targetX - glyph.x) * 0.2
        glyph.y += (targetY - glyph.y) * 0.2
        glyph.rotation += (targetRotation - glyph.rotation) * 0.16
        glyph.scale += (targetScale - glyph.scale) * 0.15
        if (
          Math.abs(glyph.x) > 0.05 ||
          Math.abs(glyph.y) > 0.05 ||
          Math.abs(glyph.rotation) > 0.05 ||
          Math.abs(glyph.scale - 1) > 0.002
        ) {
          needsNextFrame = true
        }

        glyph.el.style.transform = `translate3d(${glyph.x.toFixed(2)}px, ${glyph.y.toFixed(2)}px, 0px) rotate(${glyph.rotation.toFixed(2)}deg) scale(${glyph.scale.toFixed(3)})`
        glyph.el.style.opacity = String(1 - eased * 0.1)
      })

      if (needsNextFrame) {
        frame = window.requestAnimationFrame(animate)
        return
      }

      running = false
      frame = 0
    }

    const attachListeners = () => {
      if (listenersAttached) return
      listenersAttached = true
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
      window.addEventListener('resize', prepareGlyphs, { passive: true })
    }
    const detachListeners = () => {
      if (!listenersAttached) return
      listenersAttached = false
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', prepareGlyphs)
    }
    const pauseInteraction = () => {
      interactionActive = false
      hasPointer = false
      press = 0
      measurementVersion += 1
      window.cancelAnimationFrame(frame)
      frame = 0
      running = false
      detachListeners()
      resetGlyphs()
    }
    const resumeInteraction = () => {
      if (interactionActive || cancelled || document.visibilityState === 'hidden') return
      interactionActive = true
      prepareGlyphs()
      attachListeners()
    }

    let intersects = false
    const syncActivity = () => {
      if (intersects && document.visibilityState !== 'hidden') resumeInteraction()
      else pauseInteraction()
    }
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
        intersects = entry?.isIntersecting ?? false
        syncActivity()
      }, { rootMargin: '15% 0px', threshold: 0.01 })
    const onVisibilityChange = () => syncActivity()

    void waitForFontsBeforePretext().then(() => {
      if (cancelled) return
      document.addEventListener('visibilitychange', onVisibilityChange)
      if (observer) observer.observe(textEl)
      else {
        intersects = true
        syncActivity()
      }
    })

    return () => {
      cancelled = true
      measurementVersion += 1
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.cancelAnimationFrame(frame)
      detachListeners()
      resetGlyphs()
    }
  }, [enabled, glyphSelector, reducedMotion, refreshKey, strength, text, textRef])
}

/**
 * @description Intro 标题 Tim Cai. 的专用 Pretext 交互封装，固定选择 intro 字符节点和文本内容
 * @dependencies 复用 usePretextTextInteraction；字符 DOM 由 Intro 组件中的 .intro__char-glyph 提供
 * @caveats 这里不要改变 text 文案，否则 Pretext 测量中心线会和 Intro 实际字符不一致
 */
export function useIntroPretextInteraction(
  textRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  usePretextTextInteraction(textRef, {
    enabled,
    glyphSelector: '.intro__char-glyph',
    strength: 1,
    text: 'Tim Cai.',
  })
}

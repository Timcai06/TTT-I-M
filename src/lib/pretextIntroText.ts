import { useEffect, type RefObject } from 'react'

const FONT_READY_INTERACTION_TIMEOUT_MS = 1600
const MIN_FIELD_RADIUS = 150
type PretextModule = typeof import('@chenglou/pretext')
let pretextPromise: Promise<PretextModule> | null = null

interface GlyphState {
  el: HTMLElement
  homeX: number
  homeY: number
  phase: number
  rotation: number
  scale: number
  x: number
  y: number
}

interface PretextTextInteractionOptions {
  enabled: boolean
  glyphSelector?: string
  strength?: number
  text: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function loadPretext() {
  pretextPromise ??= import('@chenglou/pretext')
  return pretextPromise
}

function waitForFontsBeforePretext() {
  if (!document.fonts) return Promise.resolve()

  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, FONT_READY_INTERACTION_TIMEOUT_MS)),
  ])
}

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

async function createGlyphStates(
  textEl: HTMLElement,
  text: string,
  glyphSelector: string
): Promise<GlyphState[]> {
  const pretext = await loadPretext()
  const glyphs = Array.from(textEl.querySelectorAll<HTMLElement>(glyphSelector))
  const rect = textEl.getBoundingClientRect()
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

    return {
      el,
      homeX: rect.left + rect.width / 2 + (center / naturalWidth) * rect.width,
      homeY: rect.top + rect.height / 2,
      phase: index * 0.68,
      rotation: 0,
      scale: 1,
      x: 0,
      y: 0,
    }
  })
}

export function usePretextTextInteraction(
  textRef: RefObject<HTMLElement | null>,
  {
    enabled,
    glyphSelector = '.pretext-glyph',
    strength = 1,
    text,
  }: PretextTextInteractionOptions
) {
  useEffect(() => {
    if (!enabled) {
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    let cancelled = false
    let frame = 0
    let glyphs: GlyphState[] = []
    let mouseX = Number.POSITIVE_INFINITY
    let mouseY = Number.POSITIVE_INFINITY
    let lastMove = 0
    let fieldRadius = MIN_FIELD_RADIUS
    let press = 0

    const resetGlyphs = () => {
      glyphs.forEach(({ el }) => {
        el.style.transform = ''
        el.style.opacity = ''
      })
    }

    const prepareGlyphs = () => {
      const rect = textEl.getBoundingClientRect()
      fieldRadius = Math.max(MIN_FIELD_RADIUS, rect.width * 0.5)
      void createGlyphStates(textEl, text, glyphSelector).then((nextGlyphs) => {
        if (cancelled) return
        glyphs = nextGlyphs
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
      lastMove = performance.now()
    }

    const onPointerLeave = () => {
      mouseX = Number.POSITIVE_INFINITY
      mouseY = Number.POSITIVE_INFINITY
      press = 0
    }

    const onPointerDown = () => {
      press = 1
    }

    const onPointerUp = () => {
      press = 0
    }

    const animate = (time: number) => {
      if (cancelled) return

      const inactive = performance.now() - lastMove > 1400
      press += (0 - press) * 0.045
      glyphs.forEach((glyph) => {
        const dx = glyph.homeX - mouseX
        const dy = glyph.homeY - mouseY
        const distance = Math.hypot(dx, dy)
        const influence = inactive ? 0 : clamp(1 - distance / fieldRadius, 0, 1)
        const eased = influence * influence * (3 - 2 * influence)
        const safeDistance = Math.max(distance, 1)
        const pulse = Math.sin(time * 0.0024 + glyph.phase)
        const push = eased * (58 + press * 42) * strength
        const ambient = (pulse * eased * 5.5 + Math.sin(time * 0.0014 + glyph.phase) * 1.2) * strength
        const tangent = Math.cos(time * 0.002 + glyph.phase) * eased * 7 * strength
        const targetX = (dx / safeDistance) * push + tangent
        const targetY = (dy / safeDistance) * push + ambient
        const targetRotation = (targetX / 58) * 10 + press * pulse * 6
        const targetScale = 1 + eased * 0.055 + press * 0.035

        glyph.x += (targetX - glyph.x) * 0.2
        glyph.y += (targetY - glyph.y) * 0.2
        glyph.rotation += (targetRotation - glyph.rotation) * 0.16
        glyph.scale += (targetScale - glyph.scale) * 0.15

        glyph.el.style.transform = `translate3d(${glyph.x.toFixed(2)}px, ${glyph.y.toFixed(2)}px, 0) rotate(${glyph.rotation.toFixed(2)}deg) scale(${glyph.scale.toFixed(3)})`
        glyph.el.style.opacity = String(1 - eased * 0.1)
      })

      frame = window.requestAnimationFrame(animate)
    }

    void waitForFontsBeforePretext().then(() => {
      if (cancelled) return
      prepareGlyphs()
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
      window.addEventListener('resize', prepareGlyphs, { passive: true })
      frame = window.requestAnimationFrame(animate)
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', prepareGlyphs)
      resetGlyphs()
    }
  }, [enabled, glyphSelector, strength, text, textRef])
}

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

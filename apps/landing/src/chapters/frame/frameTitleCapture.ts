const REVEAL_TRANSIENT_PROPERTIES = ['opacity', 'transform', 'filter'] as const

/**
 * The semantic title may be mid-GSAP reveal when it is cloned. Remove only
 * reveal-owned inline paint state from the inert copy so the capture always
 * contains the same text and layout without mutating the readable heading.
 */
export function clearFrameTitleRevealStyles(capture: HTMLElement): void {
  capture.querySelectorAll<HTMLElement>('.word').forEach((word) => {
    for (const property of REVEAL_TRANSIENT_PROPERTIES) {
      word.style.removeProperty(property)
    }
  })
}

export function cloneStaticFrameTitleCapture(target: HTMLElement): HTMLElement {
  const capture = target.cloneNode(true) as HTMLElement
  capture.removeAttribute('id')
  capture.setAttribute('aria-hidden', 'true')
  capture.setAttribute('inert', '')
  capture.setAttribute('data-frame-title-particle-capture', '')
  capture.style.margin = '0'
  clearFrameTitleRevealStyles(capture)
  return capture
}

export function pixelBufferHasVisibleAlpha(pixels: ArrayLike<number>): boolean {
  for (let index = 3; index < pixels.length; index += 4) {
    if ((pixels[index] ?? 0) > 0) return true
  }
  return false
}

/** Read the staging canvas before the vendor uploads and clears it. */
export function frameTitleCaptureHasVisiblePixels(source: HTMLCanvasElement): boolean {
  if (source.width < 1 || source.height < 1) return false
  const probe = document.createElement('canvas')
  probe.width = 32
  probe.height = 16
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context) return false

  try {
    context.drawImage(source, 0, 0, probe.width, probe.height)
    return pixelBufferHasVisibleAlpha(
      context.getImageData(0, 0, probe.width, probe.height).data,
    )
  } catch {
    return false
  }
}

export function canPromoteFrameTitleCapture({
  handleAccepted,
  pixelsReady,
  live,
}: {
  handleAccepted: boolean
  pixelsReady: boolean
  live: boolean
}): boolean {
  return handleAccepted && pixelsReady && live
}

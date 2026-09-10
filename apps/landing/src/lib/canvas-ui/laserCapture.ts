const SVG_REFERENCE_ATTRIBUTES = [
  'mask',
  'clip-path',
  'filter',
  'fill',
  'stroke',
  'marker-start',
  'marker-mid',
  'marker-end',
  'style',
] as const

let captureSequence = 0

function nextCaptureNamespace(): string {
  captureSequence += 1
  return `project-laser-capture-${captureSequence}`
}

export function rewriteLocalSvgReference(
  value: string,
  idMap: ReadonlyMap<string, string>,
): string {
  return value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match, _quote, id: string) => {
    const replacement = idMap.get(id)
    return replacement ? `url(#${replacement})` : match
  })
}

export function stableMaskedHeadingMediaTransform(transform: string): string {
  const scale3d = transform.match(/scale3d\(([^)]+)\)/)
  if (scale3d?.[1]) return `scale3d(${scale3d[1]})`
  const scale = transform.match(/scale\(([^)]+)\)/)
  if (scale?.[1]) return `scale(${scale[1]})`

  const matrix = transform.match(/matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),/)
  if (matrix) {
    const values = matrix.slice(1, 5).map(Number)
    const [a = 0, b = 0, c = 0, d = 0] = values
    if ([a, b, c, d].every(Number.isFinite)) {
      const scaleX = Math.hypot(a, b)
      const scaleY = Math.hypot(c, d)
      return `scale(${scaleX}, ${scaleY})`
    }
  }
  return 'none'
}

function namespaceCloneReferences(clone: HTMLElement, namespace: string): void {
  const idMap = new Map<string, string>()
  clone.querySelectorAll<HTMLElement>('[id]').forEach((element, index) => {
    const originalId = element.getAttribute('id')
    if (!originalId) return
    const safeId = originalId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const nextId = `${namespace}-${index}-${safeId}`
    idMap.set(originalId, nextId)
    element.setAttribute('id', nextId)
  })

  const referenceSelector = SVG_REFERENCE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(',')
  clone.querySelectorAll<HTMLElement>(referenceSelector).forEach((element) => {
    for (const attribute of SVG_REFERENCE_ATTRIBUTES) {
      const value = element.getAttribute(attribute)
      if (value) element.setAttribute(attribute, rewriteLocalSvgReference(value, idMap))
    }
  })

  clone.querySelectorAll<HTMLElement>('[href],[xlink\\:href]').forEach((element) => {
    for (const attribute of ['href', 'xlink:href']) {
      const value = element.getAttribute(attribute)
      if (!value?.startsWith('#')) continue
      const replacement = idMap.get(value.slice(1))
      if (replacement) element.setAttribute(attribute, `#${replacement}`)
    }
  })
}

function revealStaticMaskedHeading(clone: HTMLElement): void {
  const stage = clone.querySelector<HTMLElement>('.masked-heading__stage')
  stage?.style.setProperty('opacity', '1')
  stage?.style.setProperty('visibility', 'visible')
  stage?.style.setProperty('clip-path', 'inset(0% 0% 0% 0%)')

  const media = clone.querySelector<HTMLElement>('.masked-heading__media')
  if (!media) return
  const stableTransform = stableMaskedHeadingMediaTransform(media.style.transform)
  media.style.setProperty('transform', stableTransform)
  media.style.setProperty('transform-origin', '50% 50%')
}

export function cloneProjectLaserCapture(
  capture: HTMLElement,
  namespace = nextCaptureNamespace(),
): HTMLElement {
  const clone = capture.cloneNode(true) as HTMLElement
  clone.setAttribute('drawable', '')
  clone.setAttribute('aria-hidden', 'true')
  clone.setAttribute('inert', '')
  clone.setAttribute('data-project-laser-capture', '')
  namespaceCloneReferences(clone, namespace)
  revealStaticMaskedHeading(clone)
  clone.querySelectorAll<HTMLElement>('a, button, input, select, textarea, video').forEach((element) => {
    element.setAttribute('tabindex', '-1')
  })
  return clone
}

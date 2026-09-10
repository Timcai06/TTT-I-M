/** Fail closed when a native HTML capture cannot prove that it has pixels. */
export function captureHasUsablePixels(hasVisibleCapture?: () => boolean): boolean {
  if (!hasVisibleCapture) return true
  try {
    return hasVisibleCapture()
  } catch {
    return false
  }
}

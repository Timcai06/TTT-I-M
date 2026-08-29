/** Chromium experimental HTML-in-Canvas proposal. Absent in stable browsers. */
interface CanvasRenderingContext2D {
  drawElementImage?: (element: Element, x: number, y: number) => void
}

interface HTMLCanvasElement {
  requestPaint?: () => void
  captureElementImage?: (element: Element) => unknown
}

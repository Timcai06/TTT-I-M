import 'react'

declare global {
  /** Chromium experimental HTML-in-Canvas proposal. Absent in stable browsers. */
  interface CanvasRenderingContext2D {
    drawElementImage?: (element: Element, x: number, y: number) => void
  }

  interface HTMLCanvasElement {
    requestPaint?: () => void
    captureElementImage?: (element: Element) => unknown
  }
}

declare module 'react' {
  interface CanvasHTMLAttributes<T> {
    /** Opts a canvas into Chromium's experimental HTML-in-Canvas layout tree. */
    layoutsubtree?: T extends HTMLCanvasElement ? string : never
  }
}

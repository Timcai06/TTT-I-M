import { DataUtils, HalfFloatType, Vector3, type Object3D, type PerspectiveCamera, type WebGLRenderer } from 'three'
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'

/** Once per prepared room, use the displayed paper under the actual window light.
 * Read the output pass, never linear albedo or a repeatedly changing screen average.
 */
export function calibrateRoomPaper(renderer: WebGLRenderer, composer: EffectComposer, model: Object3D, camera: PerspectiveCamera) {
  const corners = ['TL', 'TR', 'BL'].map(s => model.getObjectByName(`AboutReading_${s}`)?.getWorldPosition(new Vector3()))
  const [tl, tr, bl] = corners
  if (!tl || !tr || !bl) throw new Error('Cannot calibrate missing book paper')
  const wasScreen = composer.renderToScreen
  try {
    composer.renderToScreen = false
    composer.render()
    const target = composer.readBuffer
    const samples: number[][] = []
    // Blank outer paper margin; avoid the portrait and printed text in the model.
    for (const u of [.035, .06, .085]) for (const v of [.16, .28, .4, .64, .78]) {
      const p = tl.clone().lerp(tr, u).add(bl.clone().sub(tl).multiplyScalar(v)).project(camera)
      const x = Math.round((p.x + 1) * .5 * (target.width - 1))
      const y = Math.round((p.y + 1) * .5 * (target.height - 1))
      if (x < 0 || y < 0 || x >= target.width || y >= target.height) continue
      const half = target.texture.type === HalfFloatType
      const pixel = half ? new Uint16Array(4) : new Uint8Array(4)
      renderer.readRenderTargetPixels(target, x, y, 1, 1, pixel)
      const rgb = [0, 1, 2].map(i => half ? DataUtils.fromHalfFloat(pixel[i]!) : pixel[i]! / 255)
      if (rgb.every(c => Number.isFinite(c) && c > .03 && c <= 1)) samples.push(rgb)
    }
    if (samples.length < 3) throw new Error('Room paper output was not readable')
    const rgb = [0, 1, 2].map(i => {
      const values = samples.map(s => s[i]!).sort((a, b) => a - b)
      return Math.round(values[Math.floor(values.length / 2)]! * 255)
    })
    const color = `rgb(${rgb.join(' ')})`
    const root = document.documentElement
    root.style.setProperty('--room-paper', color)
    root.dataset.roomPaper = color
    root.dataset.roomPaperSource = 'lit-book-output'
  } finally {
    composer.renderToScreen = wasScreen
    renderer.setRenderTarget(null)
  }
}

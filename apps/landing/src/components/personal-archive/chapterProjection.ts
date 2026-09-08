import { Vector3, type Camera, type Object3D } from 'three'
import { pageMatrix } from './pageProjection'

/** Project exported anchors after the animation mixer has sampled its pose. */
export function projectReadingSurface(model: Object3D, name: string, camera: Camera, width: number, height: number, flatten: number) {
  const endpoints = [[0, 0], [width, 0], [width, height], [0, height]]
  const points = ['TL', 'TR', 'BR', 'BL'].map((corner, i) => {
    const node = model.getObjectByName(`${name}_${corner}`)
    if (!node) return null
    const p = node.getWorldPosition(new Vector3()).project(camera)
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1) return null
    const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2
    return { x: x + (endpoints[i]![0]! - x) * flatten, y: y + (endpoints[i]![1]! - y) * flatten }
  })
  if (points.some(point => !point)) return null
  return pageMatrix(points as { x: number; y: number }[], width, height)
}

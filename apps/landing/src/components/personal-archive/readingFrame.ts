import { Matrix4, Mesh, Object3D, PlaneGeometry, Quaternion, Vector3, type Material, type PerspectiveCamera } from 'three'

/** Contact's stationery lives on the desk, in world coordinates like every other carrier. */
export function addContactReadingPlane(model: Object3D) {
  let paper: Material | undefined
  model.traverse(object => {
    if (!(object instanceof Mesh)) return
    const materials = (Array.isArray(object.material) ? object.material : [object.material]) as Material[]
    for (const material of materials) {
      if (material.name === 'Paper_fiber') paper = material
    }
  })
  if (!paper) throw new Error('Archive paper material is missing')
  const sheet = new Mesh(new PlaneGeometry(.48, .30), paper)
  sheet.name = 'ContactReadingSurface'
  sheet.rotation.x = -Math.PI / 2
  sheet.position.set(.55, .827, -.70)
  sheet.receiveShadow = true
  for (const [suffix, x, y] of [['TL', -.24, .15], ['TR', .24, .15], ['BR', .24, -.15], ['BL', -.24, -.15]] as const) {
    const corner = new Object3D(); corner.name = `ContactReading_${suffix}`; corner.position.set(x, y, .001)
    sheet.add(corner)
  }
  model.add(sheet)
  return () => { sheet.removeFromParent(); sheet.geometry.dispose() }
}

export function readingFrame(model: Object3D, surface: string, camera: PerspectiveCamera) {
  const points = ['TL', 'TR', 'BR', 'BL'].map(suffix => model.getObjectByName(`${surface}_${suffix}`)?.getWorldPosition(new Vector3()))
  if (points.some(p => !p)) return null
  const [tl, tr, br, bl] = points as Vector3[]
  if (!tl || !tr || !br || !bl) return null
  const right = tr.clone().sub(tl).normalize()
  const up = tl.clone().sub(bl).normalize()
  const normal = right.clone().cross(up).normalize()
  const center = tl.clone().add(br).multiplyScalar(.5)
  const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, normal))
  // Fit the whole physical rectangle before the small final viewport-aspect adjustment.
  const tangent = Math.tan(camera.fov * Math.PI / 360)
  const distance = Math.max(tl.distanceTo(bl), tl.distanceTo(tr) / camera.aspect) / (2 * tangent)
  return { center, normal, rotation, distance, points: points as Vector3[] }
}

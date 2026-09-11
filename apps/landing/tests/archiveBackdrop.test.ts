import assert from 'node:assert/strict'
import test from 'node:test'
import { BufferAttribute, BufferGeometry, Mesh, Object3D, Vector3, Box3 } from 'three'
import { createArchiveBackdrop } from '../src/components/personal-archive/archiveBackdrop.ts'

/** Both panorama nodes sit at translation (0,0,0) with the offset baked into their
 *  geometry, exactly as personal-space.glb authors them. */
function panel(name: string, min: [number, number, number], max: [number, number, number]) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([...min, ...max]), 3))
  geometry.computeBoundingBox()
  const mesh = new Mesh(geometry)
  mesh.name = name
  return mesh
}

function scene() {
  const root = new Object3D()
  root.add(panel('WindowPanorama_Rear', [-5, -2, -7], [5, 4.6667, -7]))
  root.add(panel('WindowPanorama_Side', [-7, -3, -7], [-7, 5.6667, 6]))
  return root
}

const centreOf = (root: Object3D, name: string) => {
  const node = root.getObjectByName(name)!
  node.updateWorldMatrix(true, true)
  return new Box3().setFromObject(node).getCenter(new Vector3())
}

void test('places the panorama centre on the camera-to-window ray, not at its own offset', () => {
  const root = scene()
  const backdrop = createArchiveBackdrop(root)!
  assert.ok(backdrop)

  const windowCentre = new Vector3(.2, 1.67, -1.515)
  const magnification = 3.4

  // Every authored camera eye, including the two that broke the naive version:
  // Life sits 0.42m from the glass, home sits 5m in front of it.
  for (const eye of [
    new Vector3(-0.58, 1.84, 3.45), new Vector3(-0.58, 1.701, -0.88),
    new Vector3(-1.19, 1.403, -1.09), new Vector3(1.151, 1.6, -0.89),
    new Vector3(0.48, 1.25, -0.267), new Vector3(0.955, 0.568, -0.008),
  ]) {
    backdrop.update(eye)
    const expected = windowCentre.clone().sub(eye).multiplyScalar(magnification).add(eye)
    const actual = centreOf(root, 'WindowPanorama_Rear')
    // The regression this pins: setting position directly stacked the node delta on
    // top of the baked geometry offset, putting the panel ~6.5m further out and off
    // axis, so the window framed bare scene background instead of the landscape.
    assert.ok(actual.distanceTo(expected) < 1e-3,
      `panorama centre ${actual.toArray().map(n => n.toFixed(2)).join(',')} should be ${expected.toArray().map(n => n.toFixed(2)).join(',')}`)
    assert.ok(actual.z < -1.515, 'the panorama must stay behind the glass')
  }
})

void test('leaves the side panel at authored size, because shrinking it opened a hole', () => {
  const root = scene()
  const before = centreOf(root, 'WindowPanorama_Side')
  const side = root.getObjectByName('WindowPanorama_Side')!
  const beforeBox = new Box3().setFromObject(side)

  createArchiveBackdrop(root)

  const after = centreOf(root, 'WindowPanorama_Side')
  const afterBox = new Box3().setFromObject(side)
  // Rescaling this panel to match the rear's world size per pixel shrank it from
  // z[-7,6] to z[-5.5,4.5] and 33 rays that used to land on it escaped instead,
  // which is the patch of bare background that appeared on the left. Coverage is
  // not tradeable for apparent scale; the rear panel's follow absorbs the rays.
  assert.ok(after.distanceTo(before) < 1e-6, 'the side panel must not move')
  assert.ok(Math.abs((afterBox.max.z - afterBox.min.z) - (beforeBox.max.z - beforeBox.min.z)) < 1e-6,
    'the side panel must keep its authored extent')
})

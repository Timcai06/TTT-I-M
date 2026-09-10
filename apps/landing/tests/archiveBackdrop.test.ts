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

void test('matches the side panel to the rear world size per pixel without moving it off axis', () => {
  const root = scene()
  const before = centreOf(root, 'WindowPanorama_Side')
  createArchiveBackdrop(root)
  const after = centreOf(root, 'WindowPanorama_Side')
  // Scaling happens about a node origin far from this geometry, so without the
  // correction the panel slides sideways as it shrinks.
  assert.ok(after.distanceTo(before) < 1e-3, `side panel moved ${after.distanceTo(before).toFixed(3)}m while rescaling`)

  const side = root.getObjectByName('WindowPanorama_Side')!
  const box = new Box3().setFromObject(side)
  const height = box.max.y - box.min.y
  assert.ok(Math.abs(height - 6.667) < .05, `side height ${height.toFixed(2)} should match the rear panel's 6.67m`)
})

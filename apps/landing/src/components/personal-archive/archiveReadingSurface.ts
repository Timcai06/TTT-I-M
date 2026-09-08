import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial, Vector3, type Object3D, type PerspectiveCamera } from 'three'
import { phase } from './chapterTracks'
import type { SpatialShot } from './archiveDirector'
import { pageMatrix } from './pageProjection'

/** One set of paper corners drives the native sheets and the full About document. */
export function createArchiveReadingSurface(model: Object3D) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(12), 3))
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2))
  geometry.setIndex([0, 2, 1, 0, 3, 2])
  const textures = new Map<SpatialShot, CanvasTexture>()
  const uniforms = { ink: { value: new Color('#29251f') }, paper: { value: new Color('#c6bba3') }, text: { value: null as CanvasTexture | null }, alpha: { value: 0 } }
  const material = new ShaderMaterial({ uniforms, side: DoubleSide, transparent: true, depthTest: true, depthWrite: true,
    vertexShader: 'varying vec2 pageUv; void main(){ pageUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 pageUv; uniform sampler2D text; uniform vec3 paper,ink; uniform float alpha;
      void main(){ gl_FragColor=vec4(mix(paper,ink,texture2D(text,pageUv).a),alpha); }`,
  })
  const mesh = new Mesh(geometry, material); mesh.name = 'ArchiveReadingSheet'; mesh.frustumCulled = false; mesh.visible = false
  let active = false
  const positions = geometry.getAttribute('position')
  const point = new Vector3(), normal = new Vector3(), right = new Vector3(), down = new Vector3()
  const anchors = ['TL', 'TR', 'BR', 'BL'], ndc = [[-1.002, 1.002], [1.002, 1.002], [1.002, -1.002], [-1.002, -1.002]] as const
  const paper = new Color('#c6bba3'), dark = new Color('#000000'), ink = new Color('#29251f'), light = new Color('#eee9df')

  function prepare(shot: SpatialShot, page: HTMLElement) {
    // The opening uses the actual About component; never approximate it with text.
    if (shot === 'entry') return
    const existing = textures.get(shot)
    const canvas = existing?.image ?? document.createElement('canvas')
    const height = Math.round(2048 * innerHeight / innerWidth)
    if (existing && canvas.height === height) return
    canvas.width = 2048; canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Archive reading texture is unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px "JetBrains Mono", monospace'
    ctx.fillText(page.querySelector('p')?.textContent?.trim() || 'PERSONAL ARCHIVE / TIM CAI', 170, canvas.height * .15)
    ctx.font = '72px "Noto Serif SC", serif'
    const title = page.querySelector('h2')?.textContent?.trim().replace(/\s+/g, ' ') || 'Tim Cai'
    let line = '', y = canvas.height * .34
    for (const character of title) {
      if (ctx.measureText(line + character).width > 1630) { ctx.fillText(line, 170, y); line = ''; y += 115 }
      line += character
    }
    ctx.fillText(line, 170, y)
    ctx.globalAlpha = .35; ctx.fillRect(170, canvas.height * .82, 1708, 2)
    ctx.font = '23px "JetBrains Mono", monospace'; ctx.fillText('TIM CAI  /  PERSONAL ARCHIVE', 170, canvas.height * .88)
    const texture = existing ?? new CanvasTexture(canvas); texture.needsUpdate = true; textures.set(shot, texture)
  }
  return { mesh, textures, prepare, get active() { return active },
    update(shot: SpatialShot, p: number, surface: string, camera: PerspectiveCamera, page: HTMLElement | null) {
      if (page) { page.style.opacity = '0'; page.style.transform = 'none' }
      mesh.visible = false; active = false
      const texture = textures.get(shot)
      if (shot !== 'entry' && !texture) return
      const contact = shot === 'work-contact'
      const reveal = phase(p, shot === 'entry' ? .46 : .62, shot === 'entry' ? .58 : .76)
      const expand = phase(p, .78, .94)
      if (reveal === 0 || contact && p < .94) return
      const points = anchors.map(suffix => model.getObjectByName(`${surface}_${suffix}`)?.getWorldPosition(new Vector3()))
      if (points.some(value => !value)) return
      const [tl, tr, , bl] = points
      if (!tl || !tr || !bl) return
      normal.copy(right.copy(tr).sub(tl)).cross(down.copy(bl).sub(tl)).normalize()
      if (normal.dot(point.copy(camera.position).sub(tl)) < 0) normal.negate()
      const projected: number[][] = []
      for (let i = 0; i < 4; i++) {
        const world = points[i], corner = ndc[i]
        if (!world || !corner) return
        world.addScaledVector(normal, .0015)
        const view = world.clone().applyMatrix4(camera.matrixWorldInverse)
        if (!contact && expand < 1 && view.z >= -camera.near * 2) return
        // Expand toward a plane inside the camera frustum, never through the eye.
        const halfHeight = Math.tan(camera.fov * Math.PI / 360) * .03
        // About must land exactly on its DOM viewport, without overscan or a final jump.
        const edge = shot === 'entry' ? 1 / 1.002 : 1
        point.set(corner[0] * edge * halfHeight * camera.aspect, corner[1] * edge * halfHeight, -.03).applyMatrix4(camera.matrixWorld)
        world.lerp(point, contact ? 1 : expand)
        positions.setXYZ(i, world.x, world.y, world.z)
        projected.push(world.clone().project(camera).toArray())
      }
      positions.needsUpdate = true
      const merge = phase(p, .945, .995)
      mesh.userData.archiveSurface = { shot, expand, merge, depthTest: material.depthTest, projected }
      if (shot === 'entry') {
        if (!page) return
        const width = page.clientWidth, height = page.clientHeight
        if (projected.some(point => point[2]! < -1 || point[2]! > 1)) return
        const matrix = pageMatrix(projected.map(point => ({ x: (point[0]! + 1) * width / 2, y: (1 - point[1]!) * height / 2 })), width, height)
        if (!matrix) return
        page.style.transform = `matrix3d(${matrix.join(',')})`
        page.style.setProperty('--paper-merge', `${merge * 100}%`)
        page.style.setProperty('--paper-hint', String(merge))
        page.style.opacity = String(reveal)
        active = true
        return
      }
      // The dark site palette starts only after the sheet covers the whole viewport.
      uniforms.paper.value.copy(paper).lerp(contact ? new Color('#f5f2ea') : dark, merge)
      uniforms.ink.value.copy(ink).lerp(contact ? ink : light, merge)
      uniforms.alpha.value = contact ? phase(p, .94, .995) : reveal
      uniforms.text.value = texture!; mesh.visible = true; active = true
    },
    dispose() { geometry.dispose(); material.dispose(); for (const texture of textures.values()) texture.dispose() },
  }
}

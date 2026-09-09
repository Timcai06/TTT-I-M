import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Object3D } from 'three'

/** The distant photograph remains still except for its small central lake. */
export function createArchiveAtmosphere(root: Object3D) {
  const time = { value: 0 }
  const materials: MeshBasicMaterial[] = []
  root.traverse(object => {
    if (!(object instanceof Mesh) || !object.userData.archive_panorama) return
    const original = object.material as MeshStandardMaterial
    const map = original.emissiveMap ?? original.map
    const material = new MeshBasicMaterial({ map, side: DoubleSide, toneMapped: false })
    material.onBeforeCompile = shader => {
      shader.uniforms.archiveTime = time
      shader.fragmentShader = 'uniform float archiveTime;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 uv = vMapUv;
          float lake = smoothstep(.25,.32,uv.y) * (1.0-smoothstep(.41,.48,uv.y));
          lake *= smoothstep(.24,.42,uv.x) * (1.0-smoothstep(.88,.99,uv.x));
          uv.x += lake * sin(uv.y*220.0 + archiveTime*.65) * .00065;
          uv.y += lake * sin(uv.x*65.0 + archiveTime*.43) * .0002;
          vec4 sampledDiffuseColor = texture2D(map, uv);
          diffuseColor *= sampledDiffuseColor;
        #endif
      `)
    }
    material.customProgramCacheKey = () => 'archive-lake-v1'
    object.material = material
    object.castShadow = false; object.receiveShadow = false
    original.dispose()
    materials.push(material)
  })
  return { update(seconds: number) { time.value = seconds }, dispose() { materials.forEach(material => material.dispose()) } }
}

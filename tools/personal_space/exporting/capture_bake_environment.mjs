// Run in the local Vite browser. Capture the actual PMREM, not an invented HDRI.
import { WebGLRenderer, Scene, PMREMGenerator, WebGLRenderTarget, FloatType, ShaderMaterial, PlaneGeometry, Mesh, Camera, Color } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function captureBakeEnvironment() {
  const renderer = new WebGLRenderer(), room = new RoomEnvironment(), generator = new PMREMGenerator(renderer)
  const environment = generator.fromScene(room, .05)
  const width = 512, height = 256, target = new WebGLRenderTarget(width, height, { type: FloatType })
  const material = new ShaderMaterial({
    defines: { ENVMAP_TYPE_CUBE_UV: '', CUBEUV_MAX_MIP: '8.0', CUBEUV_TEXEL_WIDTH: String(1 / environment.width), CUBEUV_TEXEL_HEIGHT: String(1 / environment.height) },
    uniforms: { env: { value: environment.texture }, sky: { value: new Color('#9fb8d2') }, ground: { value: new Color('#8a5f34') } },
    vertexShader: 'varying vec2 tex; void main(){tex=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D env; uniform vec3 sky,ground; varying vec2 tex;
      #include <common>
      #include <cube_uv_reflection_fragment>
      void main(){
        float phi=(.5-tex.x)*2.*PI, theta=(1.-tex.y)*PI;
        // Blender environment convention: u=.5 along +X, v=1 at +Z.
        vec3 blenderDirection=vec3(cos(phi)*sin(theta),sin(phi)*sin(theta),cos(theta));
        vec3 direction=vec3(blenderDirection.x,blenderDirection.z,-blenderDirection.y);
        vec3 radiance=textureCubeUV(env,direction,0.).rgb*.52;
        // First-order radiance whose cosine integral equals the hemisphere light.
        radiance += max(vec3(0.),mix(ground,sky,.5+.75*direction.y))*.58/PI;
        gl_FragColor=vec4(radiance,1.);
      }`,
  })
  const geometry = new PlaneGeometry(2, 2), scene = new Scene(); scene.add(new Mesh(geometry, material))
  renderer.setRenderTarget(target); renderer.render(scene, new Camera())
  const pixels = new Float32Array(width * height * 4); renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)
  target.dispose(); geometry.dispose(); material.dispose(); environment.dispose(); generator.dispose(); room.dispose(); renderer.dispose(); renderer.forceContextLoss()
  const bytes = new Uint8Array(pixels.buffer); let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return { width, height, rgbaFloat32: btoa(binary), orientation: 'blender-negative-longitude-v1', method: 'three r182 RoomEnvironment PMREM sigma=.05 intensity=.52 plus hemisphere .58; linear radiance' }
}

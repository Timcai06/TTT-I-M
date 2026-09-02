import type { ParticlePortalMode } from '../particlePortal'
import { getGLQualityProfile } from '../webgl/quality'
import { calculateImagePlacement, type ImagePlacement } from './particlePortalMath'

export type { ImagePlacement } from './particlePortalMath'

export interface ParticlePortalHandle {
  setProgress(progress: number): void
  setTarget(target: ImagePlacement): void
  resize(): void
  destroy(): void
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uViewport;
uniform vec2 uGrid;
uniform vec4 uSourceRect;
uniform vec4 uTargetRect;
uniform vec4 uSourceUv;
uniform vec4 uTargetUv;
uniform float uProgress;
uniform float uPointSize;
uniform float uDpr;
uniform float uMode;

out vec4 vColor;
out float vAlpha;
out float vSoftness;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + vec2(19.19, 73.73)));
}

float insideUv(vec2 uv, vec4 bounds) {
  vec2 low = step(bounds.xy, uv);
  vec2 high = step(uv, bounds.zw);
  return low.x * low.y * high.x * high.y;
}

vec2 imagePosition(vec2 uv, vec4 rect, vec4 bounds) {
  vec2 span = max(bounds.zw - bounds.xy, vec2(0.0001));
  vec2 local = clamp((uv - bounds.xy) / span, 0.0, 1.0);
  return rect.xy + local * rect.zw;
}

void main() {
  float id = float(gl_VertexID);
  vec2 cell = vec2(mod(id, uGrid.x), floor(id / uGrid.x));
  vec2 uv = (cell + 0.5) / uGrid;
  float h1 = hash(cell);
  float h2 = hash(cell + vec2(7.7, 31.3));
  float h3 = hash(cell + vec2(53.1, 11.9));

  vec2 source = imagePosition(uv, uSourceRect, uSourceUv);
  vec2 target = imagePosition(uv, uTargetRect, uTargetUv);
  float sourceVisible = insideUv(uv, uSourceUv);
  float targetVisible = insideUv(uv, uTargetUv);

  float t = clamp(uProgress, 0.0, 1.0);
  float travel = t * t * (3.0 - 2.0 * t);
  vec2 delta = target - source;
  float distancePx = length(delta);
  vec2 direction = distancePx > 0.1 ? delta / distancePx : vec2(1.0, 0.0);
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 randomDir = normalize(hash2(cell) - 0.5 + vec2(0.001, 0.0));
  float envelope = sin(t * 3.14159265);
  float depth = envelope * envelope;

  float spread = min(max(uViewport.x, uViewport.y) * 0.22, 310.0);
  vec2 field = randomDir * spread * (0.18 + h1 * 0.82);

  // Each Frame world inherits one coherent motion grammar without becoming a
  // recoloured copy: architecture is rectilinear, cuisine convects, scenery
  // stretches along the horizon. Case studies stay precise and shallow.
  if (uMode < 0.5) {
    field = vec2(sign(randomDir.x) * spread * (0.22 + h1 * 0.78), randomDir.y * spread * 0.26);
    field += normal * (h2 - 0.5) * 72.0;
  } else if (uMode < 1.5) {
    vec2 centre = mix(
      uSourceRect.xy + uSourceRect.zw * 0.5,
      uTargetRect.xy + uTargetRect.zw * 0.5,
      travel
    );
    vec2 radial = normalize(mix(source, target, travel) - centre + vec2(0.001));
    field = vec2(-radial.y, radial.x) * spread * (0.25 + h2 * 0.75);
    field += radial * spread * (h1 - 0.5) * 0.3;
  } else if (uMode < 2.5) {
    field = vec2(randomDir.x * spread * 1.18, randomDir.y * spread * 0.22);
    field += direction * (h2 - 0.5) * 92.0;
  } else {
    field *= 0.46;
    field += normal * (h2 - 0.5) * 48.0;
  }

  vec2 pos = mix(source, target, travel);
  pos += field * depth;
  pos += normal * (h3 - 0.5) * min(distancePx * 0.18, 140.0) * envelope;

  // A small perspective swell creates depth without throwing particles at the
  // viewer. Stable UV hashes prevent the cloud from flickering frame to frame.
  vec2 viewportCentre = uViewport * 0.5;
  float perspective = 1.0 + depth * (0.035 + h3 * 0.075);
  pos = viewportCentre + (pos - viewportCentre) * perspective;

  vec4 sampled = texture(uTexture, vec2(uv.x, 1.0 - uv.y));
  float luminance = dot(sampled.rgb, vec3(0.2126, 0.7152, 0.0722));
  float anchor = step(h1, 0.11);
  float sourceGate = mix(smoothstep(0.02, 0.34, t), 1.0, sourceVisible);
  float targetGate = mix(1.0 - smoothstep(0.74, 0.98, t), 1.0, targetVisible);
  float edgeFade = sourceGate * targetGate;

  vColor = vec4(sampled.rgb, sampled.a);
  vAlpha = sampled.a * edgeFade * mix(0.76, 1.0, anchor);
  vSoftness = mix(0.12, 0.36, depth);
  float size = uPointSize * mix(0.78, 1.34, luminance) * mix(1.0, 1.42, depth);
  gl_PointSize = max(1.0, size * uDpr);
  gl_Position = vec4(
    pos.x / uViewport.x * 2.0 - 1.0,
    1.0 - pos.y / uViewport.y * 2.0,
    0.0,
    1.0
  );
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 vColor;
in float vAlpha;
in float vSoftness;
out vec4 outColor;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float distanceToCentre = length(point);
  float mask = 1.0 - smoothstep(0.5 - vSoftness, 0.5, distanceToCentre);
  float alpha = vAlpha * mask;
  if (alpha < 0.012) discard;
  outColor = vec4(vColor.rgb, alpha);
}`

function modeNumber(mode: ParticlePortalMode): number {
  if (mode === 'frame-building') return 0
  if (mode === 'frame-cuisine') return 1
  if (mode === 'frame-scenery') return 2
  return 3
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to allocate Particle Portal shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown Particle Portal shader error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function link(gl: WebGL2RenderingContext): {
  program: WebGLProgram
  vertex: WebGLShader
  fragment: WebGLShader
} {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to allocate Particle Portal program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown Particle Portal link error'
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    throw new Error(message)
  }
  return { program, vertex, fragment }
}

function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name)
  if (!location) throw new Error(`Particle Portal uniform missing: ${name}`)
  return location
}

function parsePositionToken(token: string | undefined, axis: 'x' | 'y'): number {
  if (!token || token === 'center') return 0.5
  if (token === 'left' || token === 'top') return 0
  if (token === 'right' || token === 'bottom') return 1
  const percentage = Number.parseFloat(token)
  if (token.endsWith('%') && Number.isFinite(percentage)) return percentage / 100
  // Pixel object-position is uncommon in this site. Treat it as centred rather
  // than inventing a viewport-dependent crop that would stretch the handoff.
  return axis === 'x' ? 0.5 : 0.5
}

/**
 * Converts CSS object-fit/object-position into a common full-image UV space.
 * This is the contract that prevents preview covers from stretching into the
 * contain-fitted Frame and Case Study hero images.
 */
export function measureImagePlacement(image: HTMLImageElement): ImagePlacement | null {
  const rect = image.getBoundingClientRect()
  const style = getComputedStyle(image)
  const [xToken, yToken = xToken] = style.objectPosition.trim().split(/\s+/)
  return calculateImagePlacement({
    bounds: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    fit: style.objectFit || 'fill',
    positionX: parsePositionToken(xToken, 'x'),
    positionY: parsePositionToken(yToken, 'y'),
  })
}

let cachedWebGL2Support: boolean | null = null

export function canRenderParticlePortal(): boolean {
  if (typeof document === 'undefined') return false
  if (cachedWebGL2Support !== null) return cachedWebGL2Support
  const probe = document.createElement('canvas')
  const gl = probe.getContext('webgl2')
  cachedWebGL2Support = Boolean(gl)
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  return cachedWebGL2Support
}

/**
 * Canvas UI ParticleScroll source adaptation for a finite source→target portal.
 * The renderer keeps particle state entirely in stable UVs and updates only a
 * progress uniform, so one draw call covers the whole transition.
 */
export function createParticlePortal({
  canvas,
  image,
  mode,
  source,
  target,
  onContextLost,
}: {
  canvas: HTMLCanvasElement
  image: HTMLImageElement
  mode: ParticlePortalMode
  source: ImagePlacement
  target: ImagePlacement
  onContextLost: () => void
}): ParticlePortalHandle | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  })
  if (!gl || gl.isContextLost()) return null
  const releaseGL = () => gl.getExtension('WEBGL_lose_context')?.loseContext()

  let linked: ReturnType<typeof link>
  try {
    linked = link(gl)
  } catch {
    releaseGL()
    return null
  }

  const { program, vertex, fragment } = linked
  const vao = gl.createVertexArray()
  const texture = gl.createTexture()
  if (!vao || !texture) {
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    releaseGL()
    return null
  }

  const uniforms = {
    texture: uniform(gl, program, 'uTexture'),
    viewport: uniform(gl, program, 'uViewport'),
    grid: uniform(gl, program, 'uGrid'),
    sourceRect: uniform(gl, program, 'uSourceRect'),
    targetRect: uniform(gl, program, 'uTargetRect'),
    sourceUv: uniform(gl, program, 'uSourceUv'),
    targetUv: uniform(gl, program, 'uTargetUv'),
    progress: uniform(gl, program, 'uProgress'),
    pointSize: uniform(gl, program, 'uPointSize'),
    dpr: uniform(gl, program, 'uDpr'),
    mode: uniform(gl, program, 'uMode'),
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
  } catch {
    gl.deleteTexture(texture)
    gl.deleteVertexArray(vao)
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    releaseGL()
    return null
  }

  const quality = getGLQualityProfile()
  const particleBudget = quality.tier === 'high' ? 44000 : quality.tier === 'medium' ? 26000 : 14000
  const imageAspect = Math.max(0.25, Math.min(4, image.naturalWidth / Math.max(1, image.naturalHeight)))
  const gridX = Math.max(24, Math.round(Math.sqrt(particleBudget * imageAspect)))
  const gridY = Math.max(24, Math.round(particleBudget / gridX))
  const count = gridX * gridY
  let currentTarget = target
  let progress = 0
  let destroyed = false
  let dpr = 1

  const handleContextLost = (event: Event) => {
    event.preventDefault()
    onContextLost()
  }
  canvas.addEventListener('webglcontextlost', handleContextLost, { once: true })

  const render = () => {
    if (destroyed || gl.isContextLost()) return
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(program)
    gl.bindVertexArray(vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.texture, 0)
    gl.uniform2f(uniforms.viewport, window.innerWidth, window.innerHeight)
    gl.uniform2f(uniforms.grid, gridX, gridY)
    gl.uniform4f(uniforms.sourceRect, source.rect.left, source.rect.top, source.rect.width, source.rect.height)
    gl.uniform4f(
      uniforms.targetRect,
      currentTarget.rect.left,
      currentTarget.rect.top,
      currentTarget.rect.width,
      currentTarget.rect.height,
    )
    gl.uniform4f(uniforms.sourceUv, source.uvMin.x, source.uvMin.y, source.uvMax.x, source.uvMax.y)
    gl.uniform4f(
      uniforms.targetUv,
      currentTarget.uvMin.x,
      currentTarget.uvMin.y,
      currentTarget.uvMax.x,
      currentTarget.uvMax.y,
    )
    gl.uniform1f(uniforms.progress, progress)
    gl.uniform1f(uniforms.pointSize, quality.tier === 'low' ? 2.25 : 1.85)
    gl.uniform1f(uniforms.dpr, dpr)
    gl.uniform1f(uniforms.mode, modeNumber(mode))
    gl.drawArrays(gl.POINTS, 0, count)
    gl.bindVertexArray(null)
  }

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, quality.dprMax)
    const width = Math.max(1, Math.round(window.innerWidth * dpr))
    const height = Math.max(1, Math.round(window.innerHeight * dpr))
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    render()
  }

  resize()

  return {
    setProgress(next) {
      progress = Math.min(1, Math.max(0, next))
      render()
    },
    setTarget(next) {
      currentTarget = next
      render()
    },
    resize,
    destroy() {
      if (destroyed) return
      destroyed = true
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.deleteTexture(texture)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      releaseGL()
    },
  }
}

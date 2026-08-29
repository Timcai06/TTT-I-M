import { markDrawableSubtree, resizeCanvasToDisplaySize, supportsHtmlInCanvas } from './runtime'
import { bendEdgeStrengths, type HorizontalBendState } from './horizontalBendMath'
import type { EffectLifecycle } from '../../shared/effects/contracts.ts'

export interface HorizontalBendHandle extends EffectLifecycle {
  setScrollState(state: HorizontalBendState): void
  invalidate(): void
  resize(): void
  destroy(): void
}

export const HORIZONTAL_BEND_CONFIG = {
  zone: 180,
  angle: 46,
  rounding: 130,
  perspective: 1250,
  ease: 180,
  smoothing: 0.14,
  tumble: 0,
  tilt: 0,
} as const

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

// Faithful horizontal port of Canvas UI Bend's rounded fold solver. The
// original solves top/bottom folds along Y; this version exchanges the fold
// axis only, keeping the 40-sample rounded crease and perspective projection.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_content;
uniform float u_zone;
uniform float u_angle;
uniform float u_perspective;
uniform float u_direction;
uniform float u_left_amount;
uniform float u_right_amount;
uniform float u_pixel_x;
uniform float u_pixel_y;
uniform float u_rounding;

vec3 foldEdge(float screenX, float amount) {
  float foldStart = 1.0 - u_zone;
  if (amount < 1e-4) return vec3(screenX, 0.0, 1.0);
  float theta = u_angle * amount;

  if (u_rounding < 1e-4) {
    float sine = sin(theta) * u_direction;
    float cosine = cos(theta);
    float denominator = max(cosine * u_perspective + sine * (0.5 - screenX), 1e-5);
    float raw = u_perspective * (screenX - foldStart) / denominator;
    float along = clamp(raw, 0.0, u_zone);
    float depth = max(along * sine, -0.85 * u_perspective);
    float alpha = 1.0 - smoothstep(u_zone, u_zone + 2.0 * u_pixel_x, raw);
    return vec3(foldStart + along, depth, alpha);
  }

  if (screenX <= foldStart) return vec3(screenX, 0.0, 1.0);
  float radiusBudget = min(u_rounding, u_zone);
  float radius = radiusBudget / theta;
  float cosine = cos(theta);
  float sine = sin(theta);
  float arcX = radius * sine;
  float arcZ = radius * (1.0 - cosine);
  float previousScreen = foldStart;
  float previousDepth = 0.0;
  float previousAlong = 0.0;
  float bestAlong = -1.0;
  float bestDepth = 0.0;
  float maximumScreen = foldStart;
  float stepSize = u_zone / 40.0;

  for (int index = 1; index <= 40; index++) {
    float along = stepSize * float(index);
    float localX;
    float localZ;
    if (along <= radiusBudget) {
      float arcAngle = along / radius;
      localX = radius * sin(arcAngle);
      localZ = radius * (1.0 - cos(arcAngle));
    } else {
      localX = arcX + (along - radiusBudget) * cosine;
      localZ = arcZ + (along - radiusBudget) * sine;
    }
    localX += foldStart;
    float depth = max(localZ * u_direction, -0.85 * u_perspective);
    float projected = 0.5 + (localX - 0.5) * u_perspective / (u_perspective + depth);
    if ((previousScreen - screenX) * (projected - screenX) <= 0.0 && abs(projected - previousScreen) > 1e-7) {
      float fraction = clamp((screenX - previousScreen) / (projected - previousScreen), 0.0, 1.0);
      bestAlong = mix(previousAlong, along, fraction);
      bestDepth = mix(previousDepth, depth, fraction);
      if (u_direction > 0.0) break;
    }
    maximumScreen = max(maximumScreen, projected);
    previousScreen = projected;
    previousDepth = depth;
    previousAlong = along;
  }

  if (bestAlong < 0.0) {
    float alpha = 1.0 - smoothstep(maximumScreen - u_pixel_x, maximumScreen + u_pixel_x, screenX);
    return vec3(1.0, previousDepth, alpha);
  }
  return vec3(foldStart + bestAlong, bestDepth, 1.0);
}

void main() {
  vec2 uv = v_uv;
  float inRight = step(1.0 - u_zone, uv.x);
  float inLeft = step(uv.x, u_zone);
  vec3 rightFold = foldEdge(uv.x, u_right_amount);
  vec3 leftFold = foldEdge(1.0 - uv.x, u_left_amount);

  float sourceX = uv.x;
  sourceX = mix(sourceX, rightFold.x, inRight);
  sourceX = mix(sourceX, 1.0 - leftFold.x, inLeft);
  float depth = inRight * rightFold.y + inLeft * leftFold.y;
  float alpha = mix(1.0, rightFold.z, inRight) * mix(1.0, leftFold.z, inLeft);
  float sourceY = 0.5 + (uv.y - 0.5) * (u_perspective + depth) / u_perspective;

  alpha *= smoothstep(-2.0 * u_pixel_x, 0.0, sourceX);
  alpha *= 1.0 - smoothstep(1.0, 1.0 + 2.0 * u_pixel_x, sourceX);
  alpha *= smoothstep(-2.0 * u_pixel_y, 0.0, sourceY);
  alpha *= 1.0 - smoothstep(1.0, 1.0 + 2.0 * u_pixel_y, sourceY);

  vec2 point = vec2(
    clamp(sourceX, 0.0005, 0.9995),
    clamp(sourceY, 0.0005, 0.9995)
  );
  vec4 base = texture(u_content, vec2(point.x, 1.0 - point.y));
  float coverage = alpha * base.a;
  outColor = vec4(mix(vec3(0.0), base.rgb, coverage), 1.0);
}`

function compileProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Unable to allocate Bend shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Bend shader compilation failed'
      gl.deleteShader(shader)
      throw new Error(message)
    }
    return shader
  }
  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to allocate Bend program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Bend program linking failed'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

export function createHorizontalBend(options: {
  canvas: HTMLCanvasElement
  capture: HTMLElement
  viewport: HTMLElement
  onFirstFrame?: () => void
  onFailure?: () => void
}): HorizontalBendHandle | null {
  if (!supportsHtmlInCanvas()) return null

  const { canvas, capture, viewport, onFirstFrame, onFailure } = options
  const source = document.createElement('canvas')
  const context = source.getContext('2d')
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  })
  if (!context?.drawElementImage || !source.requestPaint || !gl) return null
  const drawElementImage = context.drawElementImage.bind(context)

  const drawable = capture.cloneNode(true) as HTMLElement
  drawable.style.transform = 'none'
  drawable.setAttribute('aria-hidden', 'true')
  drawable.setAttribute('inert', '')
  drawable.setAttribute('data-horizontal-bend-capture', '')
  drawable.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))
  drawable.querySelectorAll<HTMLElement>('a, button, input, select, textarea, video').forEach((element) => {
    element.setAttribute('tabindex', '-1')
  })
  drawable.querySelectorAll<HTMLElement>('.archive-slot').forEach((slot) => {
    slot.style.contentVisibility = 'visible'
  })
  const originalImages = capture.querySelectorAll<HTMLImageElement>('img')
  drawable.querySelectorAll<HTMLImageElement>('img').forEach((image, index) => {
    const original = originalImages[index]
    const resolvedSource = original?.currentSrc || original?.src
    if (resolvedSource) {
      image.removeAttribute('srcset')
      image.removeAttribute('sizes')
      image.src = resolvedSource
    }
    image.addEventListener('load', () => source.requestPaint?.(), { once: true })
    void image.decode().then(() => source.requestPaint?.()).catch(() => undefined)
  })
  source.className = 'horizontal-bend__capture'
  source.append(drawable)
  viewport.append(source)
  const unmark = markDrawableSubtree(source, drawable)

  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let texture: WebGLTexture | null = null
  let frame = 0
  let destroyed = false
  let paused = false
  let failed = false
  let firstFrame = false
  let hasUploadedContent = false
  let contentDirty = false
  let targetLeft = 0
  let targetRight = 1
  let currentLeft = 0
  let currentRight = 1
  let previousTime = performance.now()
  let state: HorizontalBendState = { progress: 0, distance: 0, direction: 'right-to-left' }

  try {
    program = compileProgram(gl)
    gl.useProgram(program)
    buffer = gl.createBuffer()
    if (!buffer) throw new Error('Unable to allocate Bend geometry')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    texture = gl.createTexture()
    if (!texture) throw new Error('Unable to allocate Bend texture')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
  } catch {
    unmark()
    source.remove()
    onFailure?.()
    return null
  }

  const uniforms = new Map<string, WebGLUniformLocation | null>()
  const uniform = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name))
    return uniforms.get(name) ?? null
  }

  const drawCapture = () => {
    try {
      const dpr = source.width / Math.max(1, source.clientWidth)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, source.clientWidth, source.clientHeight)
      const captureRect = capture.getBoundingClientRect()
      const viewportRect = viewport.getBoundingClientRect()
      drawElementImage(drawable, captureRect.left - viewportRect.left, captureRect.top - viewportRect.top)
      contentDirty = true
      if (!frame) frame = window.requestAnimationFrame(render)
    } catch {
      if (!firstFrame) {
        failed = true
        onFailure?.()
      }
    }
  }
  source.addEventListener('paint', drawCapture)

  const render = (now: number) => {
    frame = 0
    if (destroyed || failed || paused || document.hidden || !program || !texture) return
    const delta = Math.min((now - previousTime) / 1000, 1 / 30)
    previousTime = now
    const smoothing = HORIZONTAL_BEND_CONFIG.smoothing
    const settle = smoothing <= 0 ? 1 : 1 - Math.exp(-delta / smoothing)
    currentLeft += (targetLeft - currentLeft) * settle
    currentRight += (targetRight - currentRight) * settle
    if (Math.abs(currentLeft - targetLeft) < 0.001) currentLeft = targetLeft
    if (Math.abs(currentRight - targetRight) < 0.001) currentRight = targetRight

    resizeCanvasToDisplaySize(canvas)
    if (resizeCanvasToDisplaySize(source)) source.requestPaint?.()
    if (contentDirty) {
      contentDirty = false
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      hasUploadedContent = true
    }

    const width = Math.max(canvas.clientWidth, 1)
    const height = Math.max(canvas.clientHeight, 1)
    const zone = Math.min(Math.max(HORIZONTAL_BEND_CONFIG.zone, 8) / width, 0.49)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniform('u_content'), 0)
    gl.uniform1f(uniform('u_zone'), zone)
    gl.uniform1f(uniform('u_angle'), HORIZONTAL_BEND_CONFIG.angle * Math.PI / 180)
    gl.uniform1f(uniform('u_perspective'), HORIZONTAL_BEND_CONFIG.perspective / width)
    gl.uniform1f(uniform('u_direction'), -1)
    gl.uniform1f(uniform('u_left_amount'), currentLeft)
    gl.uniform1f(uniform('u_right_amount'), currentRight)
    gl.uniform1f(uniform('u_pixel_x'), 1.5 / width)
    gl.uniform1f(uniform('u_pixel_y'), 1.5 / height)
    gl.uniform1f(uniform('u_rounding'), Math.min(HORIZONTAL_BEND_CONFIG.rounding / width, zone))
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (!firstFrame && hasUploadedContent && gl.getError() === gl.NO_ERROR) {
      firstFrame = true
      onFirstFrame?.()
    }
    if (currentLeft !== targetLeft || currentRight !== targetRight) frame = window.requestAnimationFrame(render)
  }

  const invalidate = () => {
    if (destroyed || failed || paused) return
    source.requestPaint?.()
    if (!frame) {
      previousTime = performance.now()
      frame = window.requestAnimationFrame(render)
    }
  }
  const pause = () => {
    if (destroyed || paused) return
    paused = true
    window.cancelAnimationFrame(frame)
    frame = 0
  }
  const resume = () => {
    if (destroyed || !paused) return
    paused = false
    invalidate()
  }
  const onVisibility = () => {
    if (document.hidden) pause()
    else resume()
  }
  const onContextLost = (event: Event) => {
    event.preventDefault()
    failed = true
    window.cancelAnimationFrame(frame)
    frame = 0
    onFailure?.()
  }
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onContextLost)
  source.requestPaint()
  invalidate()

  return {
    setScrollState(next) {
      state = next
      const strengths = bendEdgeStrengths(state.progress, state.direction, state.distance, HORIZONTAL_BEND_CONFIG.ease)
      targetLeft = strengths.left
      targetRight = strengths.right
      invalidate()
    },
    invalidate,
    pause,
    resume,
    resize: invalidate,
    destroy() {
      if (destroyed) return
      destroyed = true
      window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      source.removeEventListener('paint', drawCapture)
      unmark()
      source.remove()
      if (texture) gl.deleteTexture(texture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

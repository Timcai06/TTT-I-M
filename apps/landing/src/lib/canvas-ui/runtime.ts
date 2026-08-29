import { getGLQualityProfile } from '../webgl/quality'

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  return typeof context?.drawElementImage === 'function'
    && typeof canvas.requestPaint === 'function'
}

export function markDrawableSubtree(canvas: HTMLCanvasElement, element: HTMLElement): () => void {
  canvas.setAttribute('layoutsubtree', '')
  element.setAttribute('drawable', '')
  return () => {
    canvas.removeAttribute('layoutsubtree')
    element.removeAttribute('drawable')
  }
}

export class RectCache {
  private rect: DOMRectReadOnly | null = null

  read(element: Element): DOMRectReadOnly {
    this.rect ??= element.getBoundingClientRect()
    return this.rect
  }

  invalidate(): void {
    this.rect = null
  }
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(window.devicePixelRatio || 1, getGLQualityProfile().dprMax)
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width === width && canvas.height === height) return false
  canvas.width = width
  canvas.height = height
  return true
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Unable to allocate shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed'
      gl.deleteShader(shader)
      throw new Error(message)
    }
    return shader
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to allocate WebGL program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Program linking failed'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

export function bindFullscreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram): WebGLBuffer {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Unable to allocate fullscreen triangle')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  return buffer
}

export const FULLSCREEN_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

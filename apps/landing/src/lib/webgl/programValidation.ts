export function requireWebGLResource<T>(resource: T | null, label: string): T {
  if (resource === null) throw new Error(`${label} could not be allocated.`)
  return resource
}

export function compileWebGLShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = requireWebGLResource(gl.createShader(type), `${label} shader`)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader

  const detail = gl.getShaderInfoLog(shader)?.trim()
  gl.deleteShader(shader)
  throw new Error(`${label} shader compilation failed${detail ? `: ${detail}` : '.'}`)
}

export function linkWebGLProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  label: string,
): WebGLProgram {
  const program = requireWebGLResource(gl.createProgram(), `${label} program`)
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program

  const detail = gl.getProgramInfoLog(program)?.trim()
  gl.deleteProgram(program)
  throw new Error(`${label} program linking failed${detail ? `: ${detail}` : '.'}`)
}

export function assertFramebufferComplete(gl: WebGL2RenderingContext, label: string): void {
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`${label} framebuffer is incomplete (status ${status}).`)
  }
}

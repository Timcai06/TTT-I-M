import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertFramebufferComplete,
  compileWebGLShader,
  linkWebGLProgram,
  requireWebGLResource,
} from '../src/lib/webgl/programValidation.ts'

function shaderContext({ compile = true, link = true, framebuffer = 0x8cd5 } = {}) {
  const deletedShaders: unknown[] = []
  const deletedPrograms: unknown[] = []
  const shader = {}
  const program = {}
  const gl = {
    COMPILE_STATUS: 0x8b81,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    LINK_STATUS: 0x8b82,
    attachShader() {},
    checkFramebufferStatus: () => framebuffer,
    compileShader() {},
    createProgram: () => program,
    createShader: () => shader,
    deleteProgram: (value: unknown) => deletedPrograms.push(value),
    deleteShader: (value: unknown) => deletedShaders.push(value),
    getProgramInfoLog: () => 'link detail',
    getProgramParameter: () => link,
    getShaderInfoLog: () => 'compile detail',
    getShaderParameter: () => compile,
    linkProgram() {},
    shaderSource() {},
  } as unknown as WebGL2RenderingContext
  return { deletedPrograms, deletedShaders, gl, program, shader }
}

void test('resource allocation fails closed instead of propagating a null WebGL handle', () => {
  assert.throws(() => requireWebGLResource(null, 'Glass texture'), /could not be allocated/)
})

void test('a failed shader is deleted and cannot enter a Canvas UI program', () => {
  const { deletedShaders, gl, shader } = shaderContext({ compile: false })
  assert.throws(() => compileWebGLShader(gl, 1, 'void main() {}', 'Glass'), /compile detail/)
  assert.deepEqual(deletedShaders, [shader])
})

void test('a failed program is deleted before the semantic DOM fallback resumes', () => {
  const { deletedPrograms, gl, program, shader } = shaderContext({ link: false })
  assert.throws(() => linkWebGLProgram(gl, shader, shader, 'Decrypt Reveal'), /link detail/)
  assert.deepEqual(deletedPrograms, [program])
})

void test('incomplete render targets fail before an empty first-frame handshake', () => {
  const { gl } = shaderContext({ framebuffer: 0x8cd6 })
  assert.throws(() => assertFramebufferComplete(gl, 'Liquid dye'), /incomplete/)
})

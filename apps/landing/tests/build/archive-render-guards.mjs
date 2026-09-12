import { existsSync, readFileSync } from 'node:fs'
import { read, withoutComments } from './lib/source.mjs'

/**
 * How the room is lit and how its textures are decoded.
 *
 * Split out of experience-effects-guards, which had become the file guards went
 * when they had nowhere else to go. These two belong together: both are about the
 * archive's render path, and both encode a production failure that took a long
 * time to find.
 */

// Ambient fill and the bake are two ways of paying for the same light, and the rig
// must not pay twice. environmentIntensity and the hemisphere fill were raised to
// .52 and .58 while the room had one baked indirect map and everything else was
// lit in realtime; that was a compensation, and compensations outlive their cause
// unless something says so out loud. This reads the shipped model and holds the
// two in agreement in both directions.
{
  const glb = readFileSync('src/assets/personal-archive/personal-space.glb')
  const model = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'))
  const accessor = index => model.accessors[index]
  const trianglesByMaterial = new Map()
  for (const mesh of model.meshes) {
    for (const primitive of mesh.primitives) {
      const source = primitive.indices != null ? accessor(primitive.indices) : accessor(primitive.attributes.POSITION)
      trianglesByMaterial.set(primitive.material, (trianglesByMaterial.get(primitive.material) ?? 0) + source.count / 3)
    }
  }
  let baked = 0, total = 0
  for (const [index, material] of model.materials.entries()) {
    const triangles = trianglesByMaterial.get(index) ?? 0
    total += triangles
    if (material.extras?.archive_lightmap_version === 2) baked += triangles
  }
  const coverage = baked / total
  const lighting = read('src/components/personal-archive/archiveRuntimeLighting.ts')
  const value = name => {
    const match = lighting.match(new RegExp(`${name}\\s*=\\s*(\\.?\\d+(?:\\.\\d+)?)`))
    if (!match) throw new Error(`archiveRuntimeLighting must declare ${name} as a named constant.`)
    return Number(match[1])
  }
  const environment = value('ENVIRONMENT_INTENSITY')
  const hemisphere = value('HEMISPHERE_INTENSITY')
  if (coverage > .8) {
    // The bake carries indirect diffuse with real visibility for most of the room.
    // The environment keeps only its specular job; the hemisphere has none.
    if (environment > .34) throw new Error(`Bake covers ${(coverage * 100).toFixed(1)}% of the room, so ENVIRONMENT_INTENSITY must stay at or below .34, not ${environment}.`)
    if (hemisphere > .22) throw new Error(`Bake covers ${(coverage * 100).toFixed(1)}% of the room, so HEMISPHERE_INTENSITY must stay at or below .22, not ${hemisphere}.`)
  } else if (environment < .45 || hemisphere < .5) {
    throw new Error(`Only ${(coverage * 100).toFixed(1)}% of the room is baked; the ambient terms carry the shadow side and must go back up.`)
  }
  console.log(`[archive-lighting] bake covers ${(coverage * 100).toFixed(1)}% of the room; ambient env ${environment} / hemisphere ${hemisphere}.`)
}

// The KTX2 transcoder runs under its own Content-Security-Policy, and that only
// works while three parts agree. three builds its worker with createObjectURL, and
// a blob: worker inherits the document's policy — under which the Emscripten
// transcoder throws an EvalError inside a promise nothing awaits, so
// renderer:personal-archive never settles and the intro sits at 99 until its 600s
// deadline lets the reader into a room that never loaded. A worker fetched from an
// http(s) URL takes its policy from its own response headers instead, which is the
// whole mechanism. If the loader goes back to a blob, or the path stops matching
// the header rule, or someone "fixes" it by loosening the document, this fails.
{
  const modelLoaderSource = read('src/components/personal-archive/archiveModelLoader.ts')
  const modelLoader = withoutComments(modelLoaderSource)
  const WORKER_PATH = '/archive-basis/ktx2-worker.js'
  if (!modelLoaderSource.includes(WORKER_PATH)) {
    throw new Error(`The KTX2 worker must load from the literal ${WORKER_PATH}; a hashed asset would fall outside its header rule.`)
  }
  if (/createObjectURL|new Blob\(/.test(modelLoader)) {
    throw new Error('The KTX2 worker must not be a blob: a blob worker inherits the document CSP and cannot transcode under it.')
  }
  if (!existsSync('public/archive-basis/ktx2-worker.js')) {
    throw new Error('public/archive-basis/ktx2-worker.js is missing — scripts/emit-ktx2-worker.mjs must run before the build.')
  }
  const vercel = JSON.parse(read('../../vercel.json'))
  const rules = vercel.headers ?? []
  const documentRule = rules.find(rule => rule.source === '/(.*)')
  const documentCsp = documentRule?.headers?.find(header => /content-security-policy/i.test(header.key))?.value ?? ''
  if (documentCsp.includes("'unsafe-eval'")) {
    throw new Error("The document CSP must not allow 'unsafe-eval'. The transcoder has its own policy at /archive-basis/ precisely so the page does not need one.")
  }
  const workerRule = rules.find(rule => rule.source.startsWith('/archive-basis'))
  const workerCsp = workerRule?.headers?.find(header => /content-security-policy/i.test(header.key))?.value ?? ''
  if (!workerCsp.includes("'unsafe-eval'")) {
    throw new Error('/archive-basis/ must carry its own CSP allowing unsafe-eval, or the transcoder cannot start.')
  }
  if (rules.indexOf(workerRule) < rules.indexOf(documentRule)) {
    throw new Error('The /archive-basis/ header rule must come after the catch-all so its policy replaces the document policy.')
  }
  console.log('[ktx2-worker] transcoder runs from its own origin path under its own policy; the document CSP stays strict.')
}

// Fail readable, not black.
//
// data-archive-failed is only set when prepareArchiveRuntime rejects, and a hang
// is not a rejection — the KTX2 transcoder stall never settled its promise, so the
// Index sat at opacity 0 over an empty room for the full ten-minute deadline. The
// chapters already key their fallback on the absence of data-archive-sample-owner,
// which covers failure, hang and a device that never had a room; the hero has to
// use the same signal or it is the one surface that can still go black.
{
  const hero = read('src/styles/components/hero.css')
  if (!/html:not\(\[data-archive-sample-owner\]\)[^{]*\.hero__screen-page/.test(hero)) {
    throw new Error('hero.css must show the Index when no room has committed a frame, not only when one explicitly failed.')
  }
  const archive = read('src/components/personal-archive/personal-archive.css')
  if (!/html:not\(\[data-archive-sample-owner\]\)\s*\[data-archive-live-target\]/.test(archive)) {
    throw new Error('personal-archive.css must keep the chapter fallback on the same signal.')
  }
  console.log('[archive-fallback] the Index and the chapters both stay readable when no room arrives.')
}

// A refused allocation must fail, and a still reader must not be redrawn.
//
// There was briefly a pixel cap on the drawing buffer here, on the theory that
// maximising a window was what broke the room. It was not — the runtime snapshot
// from the machine that showed the fault had 146 tasks fulfilled, none failed,
// none pending — and the cap cost effective pixel ratio on large windows for no
// demonstrated benefit, so it is gone. What survives is the part that is true
// whatever the cause: a driver that refuses does not throw, it drops the context,
// and without the check the preparation promise never settles.
{
  const runtime = withoutComments(read('src/components/personal-archive/archiveRuntime.ts'))
  if (!runtime.includes('isContextLost()')) {
    throw new Error('archiveRuntime must check for a lost context after allocating render targets, or a refused allocation hangs the loader instead of failing it.')
  }
  // The ambient loop ran schedule() every frame for as long as the room was on
  // screen, so sitting still on the Index paid a full pass stack sixty times a
  // second to animate a settled pointer and a sky that drifts over minutes.
  if (!runtime.includes('ATMOSPHERE_INTERVAL_MS') || !runtime.includes('POINTER_SETTLED')) {
    throw new Error('The ambient loop must gate its redraw on something actually changing; an unconditional schedule() per frame is what makes the machine hot.')
  }
  console.log('[archive-render-loop] a refused allocation fails loudly, and a still reader is not redrawn at 60Hz.')
}

import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const root = new URL('../../../', import.meta.url)
const read = async name => JSON.parse(await fs.readFile(new URL(name, root)))
const proof = await read('output/material-optimization/verification.json')
const sourceProof = await read('output/material-optimization/source-verification.json')
const sourceUpdate = await read('output/material-optimization/source-update.json')
const candidate = await fs.readFile(new URL('output/material-optimization/final-quality.glb', root))
const source = await fs.readFile(new URL('art/personal-archive/source/tim-cai-personal-archive.blend', root))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
assert.equal(sha(candidate), proof.sha256, 'Validate the exact candidate before publishing it locally')
assert.equal(sha(source), sourceProof.sha256, 'Source verification is stale')
assert.equal(sha(source), sourceUpdate.afterSha256)
assert.equal(proof.propMaterials, 10); assert.equal(proof.bakedMaterials, 37)
// Existing swatch shaders were independently verified unchanged, so their cache
// can be rebound without regenerating the protected material contents.
const cache = await read('art/personal-archive/textures/web-cinema/manifest.json')
assert.ok([sourceUpdate.beforeSha256, sourceUpdate.afterSha256].includes(cache.sourceSha256))
cache.sourceSha256 = sha(source)
await fs.writeFile(new URL('art/personal-archive/textures/web-cinema/manifest.json', root), JSON.stringify(cache, null, 2) + '\n')
const contract = await read('apps/landing/src/assets/personal-archive/scene-contract.json')
contract.sourceSha256 = sha(source)
contract.materialOptimization = { version: 'sunrise-print-receivers-20260912', modelSha256: sha(candidate),
  baselineCommit: 'f53ea7638b77b4b7cd155fbfc0e87bc2afad7bc3', propMaterials: 10, bakedMaterials: 37,
  textureEncoding: 'KTX2 UASTC quality 4, no RDO; WebP/JPEG base colors retained', visualAcceptance: 'user-owned' }
contract.printLighting = { version: 'print-lighting-20260912', receiverMaterials: ['RoomBake_Walnut_oiled', 'RoomBake_Plaster_warm', 'RoomBake_Paper_fiber'],
  bakeExcludesMovingPrints: true, samples: 256, movingPrintLighting: 'runtime PBR; physical paper casts, ink receives' }
await fs.writeFile(new URL('apps/landing/src/assets/personal-archive/scene-contract.json', root), JSON.stringify(contract, null, 2) + '\n')
await fs.writeFile(new URL('apps/landing/src/assets/personal-archive/personal-space.glb', root), candidate)
console.log(JSON.stringify({ deliveredBytes: candidate.length, sourceSha256: sha(source), modelSha256: sha(candidate) }))

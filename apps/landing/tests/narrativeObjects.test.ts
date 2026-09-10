import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

// The repository's shared loader resolves extensionless imports in packages and
// Studio only. This test-local hook applies the same rule to Landing-authored TS
// so the production content entry can be tested without changing that loader.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
      const hasExtension = /\.[cm]?[jt]sx?$/.test(specifier)
      if (isRelative && !hasExtension && context.parentURL?.startsWith('file:')) {
        const candidate = fileURLToPath(new URL(`${specifier}.ts`, context.parentURL))
        if (existsSync(candidate)) return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
})

const [{ resolveNarrativePhoto }, { photos, archiveThemes }] = await Promise.all([
  import('../src/content/narrativeObjects.ts'),
  import('../src/content/index.ts'),
])

interface GltfTexture {
  source?: number
  extensions?: { EXT_texture_webp?: { source: number } }
}

void test('resolves football content to the unique current content entry without array-position fallback', () => {
  const original = structuredClone(photos)
  const resolved = resolveNarrativePhoto('life-football-action')

  assert.equal(resolved.status, 'resolved')
  if (resolved.status !== 'resolved') return
  assert.equal(resolved.photo, photos.find(photo => photo.src === '/life/football-action.webp'))
  assert.deepEqual(resolved.photo, {
    src: '/life/football-action.webp',
    alt: '球场 · 运球',
    tone: 'dark',
    width: 1280,
    height: 960,
  })
  assert.deepEqual(photos, original)
  assert.ok(Object.isFrozen(resolved))
})

void test('reports missing, duplicate, and unrelated content identities explicitly', () => {
  const football = photos.find(photo => photo.src === '/life/football-action.webp')
  assert.ok(football)
  assert.deepEqual(resolveNarrativePhoto('life-football-action', []), {
    status: 'error',
    contentId: 'life-football-action',
    reason: 'missing',
    matches: 0,
  })
  assert.deepEqual(resolveNarrativePhoto('life-football-action', [football, { ...football }]), {
    status: 'error',
    contentId: 'life-football-action',
    reason: 'duplicate',
    matches: 2,
  })
  const finalHorizon=resolveNarrativePhoto('frame-final-horizon')
  assert.equal(finalHorizon.status,'resolved')
  if(finalHorizon.status==='resolved')assert.deepEqual(finalHorizon.photo,archiveThemes.find(theme=>theme.id==='scenery')?.clusters.find(cluster=>cluster.id==='scenery-close')?.slots.find(slot=>slot.role==='primary')?.image)
  assert.deepEqual(resolveNarrativePhoto('frame-final-horizon', photos, [...archiveThemes].reverse()), finalHorizon)
  assert.deepEqual(resolveNarrativePhoto('frame-final-horizon',photos,[]), {
    status: 'error',
    contentId: 'frame-final-horizon',
    reason: 'missing',
    matches: 0,
  })
  const scenery=archiveThemes.find(theme=>theme.id==='scenery')!
  assert.deepEqual(resolveNarrativePhoto('frame-final-horizon',photos,[scenery,{...structuredClone(scenery)}]), {
    status:'error',contentId:'frame-final-horizon',reason:'duplicate',matches:2,
  })
  assert.deepEqual(resolveNarrativePhoto('toString' as never), {
    status: 'error',
    contentId: 'toString',
    reason: 'unknown-content-id',
    matches: 0,
  })
})

void test('matches both GLB football carriers to the public WebP through EXT_texture_webp', () => {
  const glb = readFileSync(new URL('../src/assets/personal-archive/personal-space.glb', import.meta.url))
  const publicWebp = readFileSync(new URL('../public/life/football-action.webp', import.meta.url))
  const jsonLength = glb.readUInt32LE(12)
  const model = JSON.parse(glb.subarray(20, 20 + jsonLength).toString()) as {
    nodes: Array<{ name?: string; mesh?: number }>
    meshes: Array<{ primitives: Array<{ material: number }> }>
    materials: Array<{ pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }>
    textures: GltfTexture[]
    images: Array<{ bufferView: number; mimeType: string }>
    bufferViews: Array<{ byteOffset?: number; byteLength: number }>
  }
  const sources = ['LifeMemoryPhoto', 'ArchivePhoto_04'].map(name => {
    const node = model.nodes.find(item => item.name === name)
    assert.ok(node?.mesh !== undefined, `${name}: mesh missing`)
    const primitive = model.meshes[node.mesh]?.primitives[0]
    assert.ok(primitive, `${name}: primitive missing`)
    const material = model.materials[primitive.material]
    assert.ok(material, `${name}: material missing`)
    const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index
    assert.ok(typeof textureIndex === 'number', `${name}: base color texture missing`)
    const texture = model.textures[textureIndex]
    assert.ok(texture, `${name}: texture missing`)
    const extensionSource = texture.extensions?.EXT_texture_webp?.source
    assert.ok(typeof extensionSource === 'number', `${name}: EXT_texture_webp source missing`)
    assert.equal(texture.source, undefined)
    const image = model.images[extensionSource]
    assert.ok(image, `${name}: image missing`)
    assert.equal(image.mimeType, 'image/webp')
    const view = model.bufferViews[image.bufferView]
    assert.ok(view, `${name}: image buffer view missing`)
    const offset = 28 + jsonLength + (view.byteOffset ?? 0)
    return {
      textureIndex,
      source: extensionSource,
      bytes: glb.subarray(offset, offset + view.byteLength),
    }
  })

  assert.equal(sources[0].textureIndex, 33)
  assert.equal(sources[1].textureIndex, 33)
  assert.equal(sources[0].source, sources[1].source)
  for (const source of sources) assert.deepEqual(source.bytes, publicWebp)
  assert.equal(
    createHash('sha256').update(publicWebp).digest('hex'),
    'c455f28157c4a10a3b5fe2f809ef7087e940f76884fbc7cb05d165a7de6ee313',
  )
})

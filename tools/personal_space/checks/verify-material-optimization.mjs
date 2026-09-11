import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { readGlb, imageSource } from '../exporting/glb_io.mjs'

const baseline = await readGlb('output/material-optimization/baseline/personal-space.glb')
const candidate = await readGlb(process.argv[2] ?? 'apps/landing/src/assets/personal-archive/personal-space.glb')
const before = baseline.doc, after = candidate.doc
assert.equal(after.nodes.length, before.nodes.length)
assert.deepEqual(after.nodes, before.nodes, 'Node names, hierarchy, transforms and extras must not change')
assert.equal(after.meshes.length, before.meshes.length)
assert.equal(after.materials.length, before.materials.length)
function accessor(model, index) {
  const a = model.doc.accessors[index], v = model.doc.bufferViews[a.bufferView]
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type], size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType]
  const stride = width*size, data = Buffer.alloc(a.count*stride), start = (v.byteOffset ?? 0)+(a.byteOffset ?? 0)
  for (let i=0;i<a.count;i++) model.bin.copy(data,i*stride,start+i*(v.byteStride??stride),start+i*(v.byteStride??stride)+stride)
  return { data, count: a.count, stride, componentType: a.componentType }
}
function indices(model,p) {
  const { data, componentType }=accessor(model,p.indices), width={5125:4,5123:2,5121:1}[componentType], list=[]
  for(let i=0;i<data.length;i+=width) list.push(data.readUIntLE(i,width))
  return list
}
function corners(model,p,name) {
  const {data,stride}=accessor(model,p.attributes[name]), ids=indices(model,p), out=Buffer.alloc(ids.length*stride)
  ids.forEach((v,i)=>data.copy(out,i*stride,v*stride,(v+1)*stride));return out
}
let triangles=0,primitives=0
for(let mi=0;mi<before.meshes.length;mi++) {
  assert.equal(after.meshes[mi].primitives.length,before.meshes[mi].primitives.length)
  for(let pi=0;pi<before.meshes[mi].primitives.length;pi++) {
    const a=before.meshes[mi].primitives[pi],b=after.meshes[mi].primitives[pi]
    assert.equal(a.material,b.material);assert.equal(indices(baseline,a).length,indices(candidate,b).length)
    for(const name of ['POSITION','NORMAL','TEXCOORD_0']) if(a.attributes[name]!==undefined) assert.deepEqual(corners(candidate,b,name),corners(baseline,a,name),`Geometry or primary UV changed: ${mi}/${pi}/${name}`)
    if (/^ArchivePhoto_/.test(after.meshes[mi].name)) {
      for (const name of ['POSITION', 'TEXCOORD_0']) assert.deepEqual(accessor(candidate, b.attributes[name]).data, accessor(baseline, a.attributes[name]).data, 'Photo grid order changed')
    }
    if (/^PhotoMount_/.test(after.meshes[mi].name)) {
      const uv = accessor(candidate, b.attributes.TEXCOORD_0), pos = accessor(candidate, b.attributes.POSITION)
      assert.equal(uv.count % 2, 0)
      for (let v = 0; v < uv.count / 2; v++) {
        const back = v + uv.count / 2
        assert.deepEqual(uv.data.subarray(v * 8, v * 8 + 8), uv.data.subarray(back * 8, back * 8 + 8), 'Photo sheet UV layers lost correspondence')
        assert.notDeepEqual(pos.data.subarray(v * 12, v * 12 + 12), pos.data.subarray(back * 12, back * 12 + 12), 'Photo sheet thickness collapsed')
      }
    }
    triangles+=indices(candidate,b).length/3;primitives++
  }
}
for(let i=0;i<before.animations.length;i++) {
  const a=before.animations[i],b=after.animations[i]
  assert.equal(a.name,b.name);assert.deepEqual(a.channels,b.channels)
  for(let s=0;s<a.samplers.length;s++) for(const key of ['input','output']) assert.deepEqual(accessor(baseline,a.samplers[s][key]).data,accessor(candidate,b.samplers[s][key]).data,'Animation data changed')
}
await fs.mkdir('output/material-optimization/decoded',{recursive:true})
async function pixels(model,info,tag) {
  const image=model.doc.images[imageSource(model.doc.textures[info.index])],v=model.doc.bufferViews[image.bufferView]
  let bytes=model.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)
  if(image.mimeType==='image/ktx2') {
    const file=`output/material-optimization/decoded/${tag}.ktx2`,png=`output/material-optimization/decoded/${tag}.png`
    await fs.writeFile(file,bytes)
    execFileSync(process.env.KTX??'ktx',['extract','--transcode','rgba8',file,png],{stdio:'pipe'})
    bytes=await fs.readFile(png)
  }
  return sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true})
}
const quality=[]
for(let i=0;i<before.materials.length;i++) {
  const a=before.materials[i],b=after.materials[i]
  assert.equal(a.name,b.name);assert.deepEqual(a.pbrMetallicRoughness?.baseColorFactor,b.pbrMetallicRoughness?.baseColorFactor)
  assert.deepEqual(a.extensions,b.extensions,'Existing physical material extensions changed')
  if(a.normalTexture && a.pbrMetallicRoughness?.metallicRoughnessTexture) {
    assert.equal(a.pbrMetallicRoughness.roughnessFactor,b.pbrMetallicRoughness.roughnessFactor)
    assert.equal(a.pbrMetallicRoughness.metallicFactor,b.pbrMetallicRoughness.metallicFactor)
    for(const kind of ['normal','roughness']) {
      const old=await pixels(baseline,kind==='normal'?a.normalTexture:a.pbrMetallicRoughness.metallicRoughnessTexture,`${i}-${kind}-old`)
      const next=await pixels(candidate,kind==='normal'?b.normalTexture:b.pbrMetallicRoughness.metallicRoughnessTexture,`${i}-${kind}-new`)
      assert.equal(old.info.width,next.info.width);assert.equal(old.info.height,next.info.height)
      let sum=0,max=0,n=0
      for(let p=0;p<old.data.length;p++) if(kind==='normal'||p%old.info.channels===1) {const error=Math.abs(old.data[p]-next.data[p]);sum+=error*error;max=Math.max(max,error);n++}
      const rmse=Math.sqrt(sum/n)/255;quality.push({material:a.name,kind,rmse,maxByteError:max})
      assert.ok(rmse<(kind==='normal'?.012:.025),`${a.name} ${kind} compression error ${rmse}`)
    }
  }
  if(b.extras?.archive_prop_surface) assert.ok(b.normalTexture&&b.pbrMetallicRoughness.metallicRoughnessTexture)
  if(/ink|monitor|screen|bulb|glass|standby|panorama/i.test(a.name)&&!a.normalTexture) assert.ok(!b.normalTexture,'Flat surface gained a normal map')
  if(b.extras?.archive_lightmap_version===2) {
    assert.equal(b.occlusionTexture.index,b.pbrMetallicRoughness.metallicRoughnessTexture.index)
    assert.notEqual(b.occlusionTexture.index,b.extras.archiveLightTexture.index)
  }
}
const result={triangles,primitives,meshes:after.meshes.length,nodes:after.nodes.length,materials:after.materials.length,
  bytes:candidate.bytes.length,sha256:createHash('sha256').update(candidate.bytes).digest('hex'),propMaterials:after.materials.filter(m=>m.extras?.archive_prop_surface).length,
  bakedMaterials:after.materials.filter(m=>m.extras?.archive_bake).length,protectedQuality:quality}
await fs.writeFile('output/material-optimization/verification.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({...result,protectedQuality:quality.length+' comparisons'}))

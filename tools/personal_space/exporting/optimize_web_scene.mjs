// Re-encode color images only; normal and packed PBR data remain lossless.
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const file=fileURLToPath(new URL('../../../apps/landing/src/assets/personal-archive/personal-space.glb',import.meta.url))
const source=await fs.readFile(file)
const length=source.readUInt32LE(12)
const doc=JSON.parse(source.subarray(20,20+length).toString())
const binary=source.subarray(28+length)
const colors=new Set(),data=new Set()
const imageIndex=t=>doc.textures[t.index].source??doc.textures[t.index].extensions?.EXT_texture_webp?.source
for(const m of doc.materials??[]){
  for(const t of [m.pbrMetallicRoughness?.baseColorTexture,m.emissiveTexture])if(t)colors.add(imageIndex(t))
  for(const t of [m.normalTexture,m.occlusionTexture,m.pbrMetallicRoughness?.metallicRoughnessTexture])if(t)data.add(imageIndex(t))
}
const replacements=new Map()
for(const index of colors){
  if(index===undefined||data.has(index))continue
  const image=doc.images[index],view=doc.bufferViews[image.bufferView]
  if(image.mimeType==='image/jpeg')continue
  const bytes=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength)
  const metadata=await sharp(bytes).metadata()
  if(metadata.hasAlpha&&doc.materials.some(m=>m.alphaMode&&m.alphaMode!=='OPAQUE'&&m.pbrMetallicRoughness?.baseColorTexture&&imageIndex(m.pbrMetallicRoughness.baseColorTexture)===index))continue
  const encoded=await sharp(bytes).removeAlpha().jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer()
  if(encoded.length>=bytes.length)continue
  replacements.set(image.bufferView,encoded);image.mimeType='image/jpeg'
  for(const texture of doc.textures){if(texture.extensions?.EXT_texture_webp?.source===index){texture.source=index;delete texture.extensions.EXT_texture_webp}}
}
// Occlusion is only the glTF transport slot. Restore the complete RGB irradiance
// image because exporters may repack the occlusion input as a red-only channel.
const lightMaterials=(doc.materials??[]).filter(m=>m.extras?.archive_lightmap)
if(lightMaterials.length){
  // Do not overwrite the transport image: glTF can share it with packed
  // roughness/metallic data. Give irradiance its own image and texture instead.
  const irradiance=await fs.readFile(new URL('../../../art/personal-archive/textures/web-cinema/static-indirect.png',import.meta.url))
  const encoded=await sharp(irradiance).png({compressionLevel:9}).toBuffer()
  const existing=doc.images.findIndex(image=>image.name==='ArchiveIndirectRGB')
  const imageIndex=existing>=0?existing:doc.images.length
  const viewIndex=existing>=0?doc.images[existing].bufferView:doc.bufferViews.length
  if(existing<0){
    doc.bufferViews.push({buffer:0,byteLength:encoded.length})
    doc.images.push({name:'ArchiveIndirectRGB',bufferView:viewIndex,mimeType:'image/png'})
  }
  replacements.set(viewIndex,encoded)
  let textureIndex=doc.textures.findIndex(texture=>texture.source===imageIndex)
  if(textureIndex<0){textureIndex=doc.textures.length;doc.textures.push({source:imageIndex})}
  for(const material of lightMaterials)material.occlusionTexture.index=textureIndex
}
// Remove the now-unused occlusion transport texture/image and its large buffer.
function visit(value, callback){
  if(!value||typeof value!=='object')return
  for(const [key,child] of Object.entries(value)){callback(key,child,value);visit(child,callback)}
}
const textureInfos=[]
visit(doc.materials,(key,value)=>{if(key.endsWith('Texture')&&Number.isInteger(value?.index))textureInfos.push(value)})
const usedTextures=new Set(textureInfos.map(info=>info.index)),textureMap=new Map()
doc.textures=doc.textures.filter((_,index)=>{if(!usedTextures.has(index))return false;textureMap.set(index,textureMap.size);return true})
for(const info of textureInfos)info.index=textureMap.get(info.index)
const usedImages=new Set(doc.textures.map(texture=>texture.source??texture.extensions?.EXT_texture_webp?.source)),imageMap=new Map()
doc.images=doc.images.filter((_,index)=>{if(!usedImages.has(index))return false;imageMap.set(index,imageMap.size);return true})
for(const texture of doc.textures){
  if(texture.source!==undefined)texture.source=imageMap.get(texture.source)
  if(texture.extensions?.EXT_texture_webp)texture.extensions.EXT_texture_webp.source=imageMap.get(texture.extensions.EXT_texture_webp.source)
}
const usedViews=new Set(),viewMap=new Map()
visit(doc,(key,value)=>{if(key==='bufferView'&&Number.isInteger(value))usedViews.add(value)})
let offset=0;const chunks=[]
for(let i=0;i<doc.bufferViews.length;i++){
  if(!usedViews.has(i))continue
  viewMap.set(i,viewMap.size)
  const view=doc.bufferViews[i]
  const bytes=replacements.get(i)??binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength)
  view.byteOffset=offset;view.byteLength=bytes.length
  chunks.push(bytes);offset+=bytes.length
  const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding}
}
doc.bufferViews=doc.bufferViews.filter((_,index)=>usedViews.has(index))
visit(doc,(key,value,parent)=>{if(key==='bufferView'&&Number.isInteger(value))parent[key]=viewMap.get(value)})
doc.buffers[0].byteLength=offset
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)])
const bin=Buffer.concat(chunks),header=Buffer.alloc(20),binHeader=Buffer.alloc(8)
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8)
header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16)
binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4)
const result=Buffer.concat([header,json,binHeader,bin])
// Record size; art quality is not constrained by the former 20 MiB cap.
await fs.writeFile(file,result)
console.log(JSON.stringify({before:source.length,after:result.length,meshes:doc.meshes.length,colorImagesOptimized:replacements.size}))

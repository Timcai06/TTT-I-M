import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { AnimationClip, Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Object3D, QuaternionKeyframeTrack, Ray, Texture, Triangle, VectorKeyframeTrack, Vector3 } from 'three'
import { createArchivePhotoTransfer, photoPointAtUV } from '../src/components/personal-archive/archivePhotoTransfer.ts'
import { createArchiveAnimationRig } from '../src/components/personal-archive/archiveAnimationRig.ts'
import { createArchiveExecution } from '../src/components/personal-archive/archiveExecution.ts'
import { PERSONAL_ARCHIVE_SCENE_BINDINGS } from '../src/components/personal-archive/sceneBindings.ts'
import { sampleStory } from '../src/core/narrative/sampleStory.ts'
import { PERSONAL_ARCHIVE_SAMPLE_STORY as spec } from '../src/core/narrative/specs.ts'
import { solveArchiveCamera } from '../src/components/personal-archive/archiveCameraRig.ts'
import { projectArchiveQuad } from '../src/components/personal-archive/archiveReadingSurface.ts'
import { addContactReadingPlane } from '../src/components/personal-archive/readingFrame.ts'
import type { SampleSegment } from '../src/core/narrative/types.ts'

type Accessor = { bufferView:number; byteOffset?:number; componentType:number; count:number; type:string }
type RawNode = { name:string; mesh?:number; children?:number[]; translation?:number[]; rotation?:number[]; scale?:number[]; matrix?:number[] }
type Primitive = { attributes:Record<string,number>; indices:number; material:number }
type Raw = { nodes:RawNode[]; scenes:{nodes:number[]}[]; scene:number; meshes:{primitives:Primitive[]}[]; accessors:Accessor[]; bufferViews:{byteOffset?:number;byteStride?:number;byteLength:number}[]; animations:{name:string;samplers:{input:number;output:number}[];channels:{sampler:number;target:{node:number;path:string}}[]}[]; textures:{source:number}[]; images:{bufferView:number}[]; materials:{name?:string;pbrMetallicRoughness?:{baseColorTexture?:{index:number}}}[] }
const bytes=readFileSync(new URL('../src/assets/personal-archive/personal-space.glb',import.meta.url))
const jsonLength=bytes.readUInt32LE(12), raw=JSON.parse(bytes.subarray(20,20+jsonLength).toString()) as Raw
function accessor(index:number) {
  const a=raw.accessors[index], view=raw.bufferViews[a.bufferView]
  const width=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4} as Record<string,number>)[a.type]
  const size=a.componentType===5123 ? 2 : 4
  const values=[]
  for(let i=0;i<a.count;i++) for(let k=0;k<width;k++) {
    const offset=jsonLength+28+(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??width*size)+k*size
    values.push(a.componentType===5126?bytes.readFloatLE(offset):size===2?bytes.readUInt16LE(offset):bytes.readUInt32LE(offset))
  }
  return values
}
function model(includeWalnutPrimitive=false) {
  const texture=new Texture({width:1280,height:960})
  const nodes=raw.nodes.map(n=>{
    let object:Object3D
    if(n.mesh!==undefined) {
      const primitives=raw.meshes[n.mesh].primitives,p=primitives[0], geometry=new BufferGeometry()
      for(const [key,name,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]] as const) if(p.attributes[key]!==undefined) geometry.setAttribute(name,new Float32BufferAttribute(accessor(p.attributes[key]),size))
      geometry.setIndex(accessor(p.indices))
      const material = new MeshBasicMaterial({map:texture,side:DoubleSide})
      material.name = raw.materials[p.material].name ?? ''
      object=new Mesh(geometry,material)
      if(includeWalnutPrimitive) primitives.slice(1).forEach((primitive,index)=>{
        if(raw.materials[primitive.material].name!=='RoomBake_Walnut_oiled') return
        const childGeometry=new BufferGeometry()
        for(const [key,name,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]] as const) if(primitive.attributes[key]!==undefined) childGeometry.setAttribute(name,new Float32BufferAttribute(accessor(primitive.attributes[key]),size))
        childGeometry.setIndex(accessor(primitive.indices))
        const childMaterial=new MeshBasicMaterial({side:DoubleSide})
        childMaterial.name=raw.materials[primitive.material].name??''
        const child=new Mesh(childGeometry,childMaterial)
        child.name=`${n.name}/primitive_${index+1}/${childMaterial.name}`
        object.add(child)
      })
    } else object=new Object3D()
    object.name=n.name
    if(n.matrix) new Matrix4().fromArray(n.matrix).decompose(object.position,object.quaternion,object.scale)
    else { if(n.translation)object.position.fromArray(n.translation);if(n.rotation)object.quaternion.fromArray(n.rotation);if(n.scale)object.scale.fromArray(n.scale) }
    return object
  })
  raw.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])))
  const scene=new Object3D();raw.scenes[raw.scene??0].nodes.forEach(i=>scene.add(nodes[i]))
  addContactReadingPlane(scene)
  const clips=new Set(PERSONAL_ARCHIVE_SCENE_BINDINGS.map(b=>b.clip))
  const animations=raw.animations.filter(a=>clips.has(a.name)).map(a=>new AnimationClip(a.name,-1,a.channels.map(c=>{
    const sampler=a.samplers[c.sampler], node=nodes[c.target.node], times=accessor(sampler.input), values=accessor(sampler.output)
    return c.target.path==='rotation'?new QuaternionKeyframeTrack(`${node.name}.quaternion`,times,values):new VectorKeyframeTrack(`${node.name}.${c.target.path==='translation'?'position':'scale'}`,times,values)
  })))
  scene.updateMatrixWorld(true)
  return {scene,animations}
}
function storyFrame(segment:SampleSegment,progress:number) { return sampleStory({position:{segment,progress},storyVersion:spec.storyVersion,contentVersion:spec.contentVersion}) }
function frame(progress:number) { return storyFrame('life-frame',progress) }
const close=(a:number[],b:number[],tolerance=1e-5)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<=tolerance,`${i}: ${v} != ${b[i]}`))}

void test('real source and wall use the exact football image bytes and the authored full UV domain',()=>{
  const hashes=[]
  for(const name of ['LifeMemoryPhoto','ArchivePhoto_04']) {
    const n=raw.nodes.find(n=>n.name===name)!, p=raw.meshes[n.mesh!].primitives[0]
    const texture=raw.materials[p.material].pbrMetallicRoughness!.baseColorTexture!.index
    assert.ok(Number.isInteger(texture) && texture >= 0)
    const entry=raw.textures[texture] as {source?:number;extensions?:{EXT_texture_webp:{source:number}}}
    const image=raw.images[entry.source??entry.extensions!.EXT_texture_webp.source],view=raw.bufferViews[image.bufferView],start=jsonLength+28+(view.byteOffset??0)
    hashes.push(createHash('sha256').update(bytes.subarray(start,start+view.byteLength)).digest('hex'))
    const uv=accessor(p.attributes.TEXCOORD_0)
    assert.equal(Math.min(...uv),0);assert.equal(Math.max(...uv),1)
  }
  const original=readFileSync(new URL('../public/life/football-action.webp',import.meta.url))
  assert.deepEqual(hashes,[0,1].map(()=>createHash('sha256').update(original).digest('hex')))
})

void test('all nine UV probes and every target paper vertex fit real nonuniform source and curved target endpoints',()=>{
  const m=model(),rig=createArchiveAnimationRig(m),token=rig.claim('sample')
  assert.equal(rig.sample(token,frame(.4).world).status,'applied')
  const transfer=createArchivePhotoTransfer(m.scene)
  transfer.apply({kind:'life'})
  let read=transfer.readback()
  read.actual.forEach((p,i)=>close(p,read.source[i]))
  transfer.apply({kind:'frame-wall'})
  read=transfer.readback()
  read.actual.forEach((p,i)=>close(p,read.target[i]))
  const mount=m.scene.getObjectByName('PhotoMount_04') as Mesh
  for(let i=0;i<read.paper.length;i+=3)close(read.paper.slice(i,i+3),new Vector3().fromArray(read.paperTarget,i).applyMatrix4(mount.matrixWorld).toArray())
  const wall=m.scene.getObjectByName('ArchivePhoto_04') as Mesh
  assert.equal(wall.geometry.getAttribute('position').count,85)
  const middle=photoPointAtUV(wall.geometry,.5,.5),flat=photoPointAtUV(wall.geometry,.5,0).lerp(photoPointAtUV(wall.geometry,.5,1),.5)
  assert.ok(middle.distanceTo(flat)>.00039,'actual center has curvature that four corners cannot describe')
  assert.equal(read.texture.sameSource,true);assert.equal(read.texture.proxySameMap,true)
  transfer.dispose();rig.dispose()
})

void test('real GLB animations and solver keep the opening and all six bridges continuous, projected, and clear of exported walnut and monitor geometry',()=>{
  const m=model(true),rig=createArchiveAnimationRig(m),execution=createArchiveExecution(m.scene,rig)
  const viewports=[{width:1280,height:720},{width:1440,height:900}] as const
  const obstacleNames=['Monitor screen','StackScreenSurface']
  const obstacles=obstacleNames.map(name=>{
    const object=m.scene.getObjectByName(name)
    assert.ok(object,`missing real GLB obstacle ${name}`)
    return {name,bounds:new Box3().setFromObject(object).expandByScalar(.011)}
  })
  const walnutMeshes:Mesh<BufferGeometry,MeshBasicMaterial>[]=[]
  m.scene.traverse(object=>{if(object instanceof Mesh&&object.name.includes('RoomBake_Walnut_oiled')) walnutMeshes.push(object as Mesh<BufferGeometry,MeshBasicMaterial>)})
  assert.equal(walnutMeshes.length,1,'real GLB walnut geometry was not loaded exactly once')
  const walnut=walnutMeshes[0],walnutPosition=walnut.geometry.getAttribute('position'),walnutIndex=walnut.geometry.index
  assert.ok(walnutIndex,'real GLB walnut geometry has no index')
  const walnutTriangles:Triangle[]=[]
  for(let index=0;index<walnutIndex.count;index+=3) walnutTriangles.push(new Triangle(...([0,1,2].map(offset=>new Vector3().fromBufferAttribute(walnutPosition,walnutIndex.getX(index+offset)).applyMatrix4(walnut.matrixWorld)) as [Vector3,Vector3,Vector3])))
  // 'index' is the opening pull-back, and it belongs in this sweep for the same
  // reason the bridges do: it is now the longest single camera move on the site,
  // it starts closer to the monitor than anything else ever gets, and it crosses
  // the whole room. Walnut clearance and the .17m-per-percent continuity bound are
  // exactly the things that could go wrong with it.
  const bridges=['index','entry','about-life','life-frame','frame-stack','stack-work','work-contact'] as const
  let requestId=0
  let minimumWalnutClearance=Infinity,maximumOnePercentStep=0,maximumPhotoNdcExtent=0
  let walnutClearanceChecks=0,monitorClearanceChecks=0,activeSurfaceProjectionChecks=0,lineOfSightChecks=0
  for(const viewport of viewports) for(const segment of bridges) {
    const pageLayout={width:viewport.width,height:viewport.height,pageWidth:viewport.width*.8333,pageHeight:viewport.height*.8444,originX:viewport.width*.0833,originY:viewport.height*.0778}
    let previous:readonly number[]|null=null
    for(let index=0;index<=100;index++) {
      const progress=index/100,sampled=storyFrame(segment,progress)
      const world=execution.sample(execution.begin('sample','foreground',++requestId,1),sampled)
      const camera=solveArchiveCamera(sampled,world.anchors,viewport)
      const position=new Vector3().fromArray(camera.position)
      for(const obstacle of obstacles) {
        monitorClearanceChecks++
        assert.equal(obstacle.bounds.containsPoint(position),false,`${segment} camera entered ${obstacle.name} at ${progress}`)
      }
      if(index%5===0) {
        const nearest=new Vector3()
        let clearance=Infinity
        for(const triangle of walnutTriangles) {
          const distance=triangle.closestPointToPoint(position,nearest).distanceTo(position)
          if(Number.isFinite(distance)) clearance=Math.min(clearance,distance)
        }
        walnutClearanceChecks++
        minimumWalnutClearance=Math.min(minimumWalnutClearance,clearance)
        assert.ok(clearance>=.03,`${segment} camera is ${clearance}m from visible walnut at ${progress}`)
        const lifeVisible=(sampled.presentation.targetSurface==='LifeReading'&&sampled.presentation.targetReveal>0)||(sampled.presentation.sourceSurface==='LifeReading'&&sampled.presentation.sourceReveal>0)
        if(lifeVisible) {
          const corners=world.anchors.LifeReading.map(point=>new Vector3().fromArray(point))
          const sightPoints=[...corners,corners.reduce((sum,point)=>sum.add(point),new Vector3()).multiplyScalar(.25)]
          for(const point of sightPoints) {
            lineOfSightChecks++
            const direction=point.clone().sub(position),targetDistance=direction.length(),ray=new Ray(position,direction.normalize()),intersection=new Vector3()
            let obstruction=Infinity
            for(const triangle of walnutTriangles) if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,intersection)) obstruction=Math.min(obstruction,intersection.distanceTo(position))
            assert.ok(obstruction>=targetDistance-.002,`${segment} walnut blocks LifeReading at ${progress}: ${obstruction}m of ${targetDistance}m`)
          }
        }
      }
      if(previous) {
        const step=position.distanceTo(new Vector3().fromArray(previous))
        maximumOnePercentStep=Math.max(maximumOnePercentStep,step)
        assert.ok(step<.17,`${segment} real camera jumped ${step}m at ${progress}: ${JSON.stringify(previous)} -> ${JSON.stringify(camera.position)}`)
      }
      previous=camera.position
      if(segment==='life-frame') {
        const projected=world.anchors.FootballTransfer.slice(0,4).map(point=>new Vector3().fromArray(point).applyMatrix4(new Matrix4().fromArray(camera.view)).applyMatrix4(new Matrix4().fromArray(camera.projection)))
        for(const ndc of projected) {
          maximumPhotoNdcExtent=Math.max(maximumPhotoNdcExtent,Math.abs(ndc.x),Math.abs(ndc.y))
          assert.ok(ndc.z>=-1&&ndc.z<=1,`moving photo left camera depth at ${progress}: ${ndc.z}`)
          assert.ok(Math.abs(ndc.x)<=1.001&&Math.abs(ndc.y)<=1.001,`moving photo left the readable view at ${progress}: ${ndc.x},${ndc.y}`)
        }
      }
      if(sampled.presentation.sourceReveal>0&&sampled.presentation.sourceSurface) { projectArchiveQuad(world.anchors[sampled.presentation.sourceSurface],camera,pageLayout,sampled.presentation.sourceExpand,.0018);activeSurfaceProjectionChecks++ }
      if(sampled.presentation.targetReveal>0) { projectArchiveQuad(world.anchors[sampled.presentation.targetSurface],camera,pageLayout,sampled.presentation.targetExpand,.0015);activeSurfaceProjectionChecks++ }
    }
  }
  for(const viewport of viewports) {
    const entryStartWorld=execution.sample(execution.begin('sample','foreground',++requestId,1),storyFrame('entry',0))
    const entryStart=solveArchiveCamera(storyFrame('entry',0),entryStartWorld.anchors,viewport)
    // Pinned at 1, not mid-segment: the index camera is no longer static, so the
    // seam is its endpoint rather than any point on it.
    const indexStart=solveArchiveCamera(storyFrame('index',1),entryStartWorld.anchors,viewport)
    close([...entryStart.position],[...indexStart.position]);close([...entryStart.quaternion],[...indexStart.quaternion]);assert.equal(entryStart.fov,indexStart.fov)
    const entryEndWorld=execution.sample(execution.begin('sample','foreground',requestId+1,1),storyFrame('entry',1))
    const entryEnd=solveArchiveCamera(storyFrame('entry',1),entryEndWorld.anchors,viewport)
    const aboutReading=solveArchiveCamera(storyFrame('about-reading',.5),entryEndWorld.anchors,viewport)
    close([...entryEnd.position],[...aboutReading.position]);close([...entryEnd.quaternion],[...aboutReading.quaternion]);assert.equal(entryEnd.fov,aboutReading.fov)
  }
  mkdirSync('../../output/pm/VR-01',{recursive:true})
  writeFileSync('../../output/pm/VR-01/runtime-geometry.json',JSON.stringify({
    status:'PASS',samples:viewports.length*bridges.length*101,viewports,bridges,
    checks:{monitorClearanceChecks,walnutClearanceChecks,lineOfSightChecks,activeSurfaceProjectionChecks,entryEndpointPairs:viewports.length},
    thresholds:{minimumWalnutClearance:.03,maximumOnePercentStep:.17,maximumPhotoNdcExtent:1.001},
    observed:{minimumWalnutClearance,maximumOnePercentStep,maximumPhotoNdcExtent},
    fingerprints:{camera:createHash('sha256').update(readFileSync(new URL('../src/components/personal-archive/archiveCameraRig.ts',import.meta.url))).digest('hex'),spec:createHash('sha256').update(readFileSync(new URL('../src/core/narrative/specs.ts',import.meta.url))).digest('hex'),glb:createHash('sha256').update(bytes).digest('hex')},
    limits:'Headless geometry only; no renderer materials, browser screenshots, or human visual acceptance.',
  },null,2))
  execution.dispose();rig.dispose()
})

void test('forward reverse random seeks and resource reconstruction have one carrier and identical geometry',()=>{
  const m=model(),rig=createArchiveAnimationRig(m),execution=createArchiveExecution(m.scene,rig)
  for (const name of ['LifeMemoryPhoto', 'Life_PhotoPaper']) {
    const mesh = m.scene.getObjectByName(name) as Mesh
    mesh.castShadow = name === 'Life_PhotoPaper'; mesh.receiveShadow = true
  }
  const material=(m.scene.getObjectByName('LifeMemoryPhoto') as Mesh).material as MeshBasicMaterial
  const baseline={opacity:material.opacity,transparent:material.transparent,map:material.map}
  for(const p of [.24,.4,.56,.49,.26,.4,.56,.24,.4]) {
    const read=execution.sample(execution.begin('sample','foreground',1,1),frame(p)).photo
    assert.equal(Number(read.sourceVisible)+Number(read.wallVisible)+Number(read.transferVisible),1)
    const fresh=model(),freshRig=createArchiveAnimationRig(fresh),freshExecution=createArchiveExecution(fresh.scene,freshRig)
    const direct=freshExecution.sample(freshExecution.begin('sample','foreground',1,1),frame(p)).photo
    assert.deepEqual(read,direct)
    freshExecution.dispose();freshRig.dispose()
  }
  const before=execution.sample(execution.begin('sample','foreground',1,1),frame(.4)).photo
  const old=m.scene.getObjectByName('ArchiveFootballTransfer') as Mesh
  execution.invalidate(true)
  assert.equal(m.scene.getObjectByName('ArchiveFootballTransfer'),undefined)
  const after=execution.sample(execution.begin('sample','foreground',1,1),frame(.4)).photo
  assert.deepEqual(after,before);assert.notEqual(m.scene.getObjectByName('ArchiveFootballTransfer'),old)
  for (const name of ['ArchiveFootballTransfer', 'ArchiveFootballTransferPaper']) {
    const proxy = m.scene.getObjectByName(name) as Mesh
    assert.ok(proxy, name)
    assert.equal(proxy.castShadow, name === 'ArchiveFootballTransferPaper')
    assert.equal(proxy.receiveShadow, true)
  }
  assert.deepEqual({opacity:material.opacity,transparent:material.transparent,map:material.map},baseline)
  execution.dispose();rig.dispose()
})

void test('every source paper proxy vertex lies on the authored beveled paper and near-zero thickness is continuous',()=>{
  const m=model(),rig=createArchiveAnimationRig(m),token=rig.claim('sample')
  assert.equal(rig.sample(token,frame(.24).world).status,'applied')
  const transfer=createArchivePhotoTransfer(m.scene)
  transfer.apply({kind:'life'})
  const start=transfer.readback(),source=m.scene.getObjectByName('Life_PhotoPaper') as Mesh,wall=m.scene.getObjectByName('PhotoMount_04') as Mesh
  const positions=source.geometry.getAttribute('position'),index=source.geometry.index!
  const distances=[]
  for(let i=0;i<start.paperStart.length;i+=3) {
    const p=new Vector3().fromArray(start.paperStart,i),nearest=new Vector3()
    let distance=Infinity
    for(let j=0;j<index.count;j+=3) {
      const corners=[0,1,2].map(k=>new Vector3().fromBufferAttribute(positions,index.getX(j+k)))
      new Triangle(corners[0],corners[1],corners[2]).closestPointToPoint(p,nearest)
      distance=Math.min(distance,p.distanceTo(nearest))
    }
    distances.push(distance)
    assert.ok(distance<=1e-5,`source paper vertex ${i/3} outside authored bevel: ${distance}`)
  }
  assert.ok(start.edgeProjections>0,'rounded corners must not use a bounding-box fallback')
  const wallPosition=wall.geometry.getAttribute('position'),wallNormal=wall.geometry.getAttribute('normal')
  const layerVertices=wallPosition.count/2
  assert.ok(Number.isInteger(layerVertices) && layerVertices >= 85)
  for(let i=0;i<layerVertices;i++) {
    const thickness=new Vector3().fromBufferAttribute(wallPosition,i+layerVertices).sub(new Vector3().fromBufferAttribute(wallPosition,i))
    assert.ok(thickness.dot(new Vector3().fromBufferAttribute(wallNormal,i))<0,'first grid is the outward front surface')
    assert.ok(Math.abs(thickness.length()-.0008)<1e-5)
  }
  transfer.apply({kind:'life-to-frame',progress:1e-7})
  const near=transfer.readback(),jumps=[]
  for(let i=0;i<start.paper.length;i+=3) {
    const distance=new Vector3().fromArray(start.paper,i).distanceTo(new Vector3().fromArray(near.paper,i))
    jumps.push(distance);assert.ok(distance<1e-5)
  }
  const thickness=[]
  for(let i=0;i<layerVertices;i++) {
    const a=new Vector3().fromArray(start.paper,i*3).distanceTo(new Vector3().fromArray(start.paper,(i+layerVertices)*3))
    const b=new Vector3().fromArray(near.paper,i*3).distanceTo(new Vector3().fromArray(near.paper,(i+layerVertices)*3))
    thickness.push({start:a,near:b});assert.ok(Math.abs(a-b)<1e-5)
  }
  mkdirSync('../../output/pm/NR-03',{recursive:true})
  writeFileSync('../../output/pm/NR-03/source-paper-endpoint.json',JSON.stringify({vertices:distances.length,maxSurfaceDistance:Math.max(...distances),edgeProjections:start.edgeProjections,maxNearZeroJump:Math.max(...jumps),thickness},null,2))
  transfer.dispose();rig.dispose()
})

void test('what the reader sees never steps, even where the camera barely moves', () => {
  // The existing sweep measures camera travel per 1% of progress against a .17m
  // limit. That is a world-space quantity, and close to a reading surface a
  // camera move far under the limit is a large change on screen. The Frame
  // handoff proved it: at progress .8014 the projected page went from 1016.2px
  // wide to 826.0px in one step -- the chapter's black background visibly
  // shrinking as it opened -- while the camera step stayed inside .17m and this
  // file passed. `align` is progressRange(.5, .8), and the carrier block that
  // owns the life-frame camera was gated on `align < 1`, so it stopped at exactly
  // that sample and handed back to a room path that had completed 64% of its
  // dolly. This measures the projection instead, which is the thing with an
  // audience.
  const m = model(true), rig = createArchiveAnimationRig(m), execution = createArchiveExecution(m.scene, rig)
  const viewports = [{ width: 1280, height: 720 }, { width: 1440, height: 900 }] as const
  const bridges = ['entry','about-life','life-frame','frame-stack','stack-work','work-contact'] as const
  let requestId = 900_000
  let worst = { segment: '', progress: 0, jump: 0 }
  for (const viewport of viewports) {
    const pageLayout = { width: viewport.width, height: viewport.height,
      pageWidth: viewport.width * .8333, pageHeight: viewport.height * .8444,
      originX: viewport.width * .0833, originY: viewport.height * .0778 }
    for (const segment of bridges) {
      let previous: { w: number; h: number } | null = null
      for (let index = 0; index <= 100; index++) {
        const progress = index / 100
        const sampled = storyFrame(segment, progress)
        if (sampled.presentation.targetReveal <= 0) { previous = null; continue }
        const world = execution.sample(execution.begin('sample','foreground',++requestId,1), sampled)
        const points = world.anchors[sampled.presentation.targetSurface]
        if (!points) { previous = null; continue }
        const camera = solveArchiveCamera(sampled, world.anchors, viewport)
        const quad = projectArchiveQuad(points, camera, pageLayout, sampled.presentation.targetExpand, .0015)
        const xs = quad.corners.map(c => c.x), ys = quad.corners.map(c => c.y)
        const current = { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
        if (previous) {
          const jump = Math.max(Math.abs(current.w - previous.w) / viewport.width,
                                Math.abs(current.h - previous.h) / viewport.height)
          if (jump > worst.jump) worst = { segment, progress, jump }
          assert.ok(jump <= .08,
            `${segment} projected page jumped ${(jump * 100).toFixed(1)}% of the viewport between ${(progress - .01).toFixed(2)} and ${progress.toFixed(2)}`)
        }
        previous = current
      }
    }
  }
  console.log(`  [projection continuity] worst step ${(worst.jump * 100).toFixed(2)}% at ${worst.segment} ${worst.progress.toFixed(2)}`)
})

void test('the Index page box is shaped like the monitor it is projected onto',()=>{
  // projectArchiveQuad maps the page's rect corner-to-corner onto the reading
  // quad, with no aspect preservation - the fixture at the top of
  // archiveCameraProjection.test.ts maps a 640x300 page onto a 500x250 rect and
  // pins exactly that. So a page box shaped like the viewport is stretched by
  // quadAspect / viewportAspect on its way to the monitor: about 1.22x wide on a
  // 1512x982 window. Invisible while the Index sat small and angled across the
  // room; plainly wrong once the opening shot put it square and at three
  // quarters of the frame.
  //
  // hero.css sizes the panel from --index-quad-aspect so the mapping is a
  // uniform scale. That literal is a fact about the GLB, so it is pinned here
  // rather than trusted: re-export the room with a different monitor and this
  // fails instead of silently distorting the Index again.
  const m=model(),rig=createArchiveAnimationRig(m),execution=createArchiveExecution(m.scene,rig)
  const world=execution.sample(execution.begin('sample','foreground',1,1),storyFrame('index',0))
  const [tl,tr,,bl]=world.anchors.StackReading.map(point=>new Vector3().fromArray(point))
  const measured=new Vector3().subVectors(tr,tl).length()/new Vector3().subVectors(tl,bl).length()
  const css=readFileSync(new URL('../src/styles/components/hero.css',import.meta.url),'utf8')
  const declared=Number(/--index-quad-aspect:\s*([\d.]+)/.exec(css)?.[1])
  assert.ok(Number.isFinite(declared),'hero.css declares no --index-quad-aspect')
  assert.ok(Math.abs(declared-measured)<.002,`hero.css says --index-quad-aspect: ${declared}, the real StackReading quad is ${measured}`)
})

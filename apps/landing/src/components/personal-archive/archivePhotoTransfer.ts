import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, Quaternion, Ray, Triangle, Vector3, type Material, type Object3D, type Texture } from 'three'
import type { PhotoPlacement } from '../../core/narrative/types.ts'

const probes = [[0,0],[1,0],[1,1],[0,1],[.5,.5],[.5,0],[1,.5],[.5,1],[0,.5]] as const

/** Read a point from the authored triangles, not a planar corner approximation. */
export function photoPointAtUV(geometry: BufferGeometry, u: number, v: number): Vector3 {
  const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), index = geometry.index
  if (!positions || !uv) throw new Error('Sample unavailable:photo-geometry')
  const count = index?.count ?? positions.count
  const point = new Vector3(u, v, 0), barycentric = new Vector3()
  for (let i = 0; i < count; i += 3) {
    const ids = [0,1,2].map(k => index ? index.getX(i+k) : i+k)
    const corners = ids.map(id => new Vector3(uv.getX(id), uv.getY(id), 0)) as [Vector3,Vector3,Vector3]
    if (!Triangle.getBarycoord(point, corners[0], corners[1], corners[2], barycentric)) continue
    if (Math.min(barycentric.x, barycentric.y, barycentric.z) < -1e-6) continue
    return ids.reduce((p,id,k) => p.addScaledVector(new Vector3().fromBufferAttribute(positions,id), barycentric.getComponent(k)), new Vector3())
  }
  throw new Error(`Sample unavailable:photo-uv:${u}:${v}`)
}

function materialOf(mesh: Mesh): Material {
  if (Array.isArray(mesh.material)) throw new Error(`Sample unavailable:photo-material:${mesh.name}`)
  return mesh.material
}

/** One execution-owned proxy; original meshes and shared textures are never moved or edited. */
export function createArchivePhotoTransfer(root: Object3D) {
  function mesh(name: string): Mesh<BufferGeometry, Material | Material[]> {
    const node = root.getObjectByName(name)
    if (!(node instanceof Mesh)) throw new Error(`Sample unavailable:missing-mesh:${name}`)
    return node as Mesh<BufferGeometry, Material | Material[]>
  }
  const source = mesh('LifeMemoryPhoto'), wall = mesh('ArchivePhoto_04')
  const sourcePaper = mesh('Life_PhotoPaper'), wallPaper = mesh('PhotoMount_04')
  const sourceMaterial = materialOf(source), wallMaterial = materialOf(wall)
  const sourceMap = 'map' in sourceMaterial ? sourceMaterial.map as Texture : null
  const wallMap = 'map' in wallMaterial ? wallMaterial.map as Texture : null
  if (!sourceMap?.source.data || !wallMap || sourceMap.source !== wallMap.source) throw new Error('Sample unavailable:photo-texture-identity')
  const imageGeometry = wall.geometry.clone(), paperGeometry = wallPaper.geometry.clone()
  const imageStart = new Float32Array(imageGeometry.getAttribute('position').count * 3)
  const imageEnd = Float32Array.from(imageGeometry.getAttribute('position').array)
  const imageUV = imageGeometry.getAttribute('uv')
  for (let i=0; i<imageUV.count; i++) photoPointAtUV(source.geometry, imageUV.getX(i), imageUV.getY(i)).toArray(imageStart,i*3)

  // The mount is a closed curved sheet. Keep its real front/back/edge topology
  // and map its UV chart onto the actual source paper, including its bevel.
  const paperEnd = Float32Array.from(paperGeometry.getAttribute('position').array)
  const paperStart = new Float32Array(paperEnd.length)
  sourcePaper.geometry.computeBoundingBox()
  const box = sourcePaper.geometry.boundingBox!
  const paperUV = paperGeometry.getAttribute('uv'), paperPosition = paperGeometry.getAttribute('position')
  const sourcePosition = sourcePaper.geometry.getAttribute('position'), sourceIndex = sourcePaper.geometry.index
  const ray = new Ray(), intersection = new Vector3()
  if (paperPosition.count % 2 !== 0) throw new Error('Sample unavailable:paper-layers')
  for (let i=0;i<paperPosition.count/2;i++) {
    const back=i+paperPosition.count/2
    if (Math.abs(paperUV.getX(i)-paperUV.getX(back))>1e-6 || Math.abs(paperUV.getY(i)-paperUV.getY(back))>1e-6 || new Vector3().fromBufferAttribute(paperPosition,i).distanceTo(new Vector3().fromBufferAttribute(paperPosition,back))<1e-5) throw new Error('Sample unavailable:paper-layer-correspondence')
  }
  let edgeProjections=0
  for (let i=0; i<paperPosition.count; i++) {
    const u=paperUV.getX(i), v=paperUV.getY(i)
    const x=box.min.x+(box.max.x-box.min.x)*u, z=box.min.z+(box.max.z-box.min.z)*v
    // Two grids are authored front then back (same UVs); retain their thickness.
    const front = i < paperPosition.count/2
    ray.origin.set(x, front ? box.max.y+1 : box.min.y-1, z)
    ray.direction.set(0,front ? -1 : 1,0)
    let closest=Infinity, y=front ? box.max.y : box.min.y
    for(let j=0;j<(sourceIndex?.count ?? sourcePosition.count);j+=3) {
      const triangle=[0,1,2].map(k=>new Vector3().fromBufferAttribute(sourcePosition,sourceIndex ? sourceIndex.getX(j+k) : j+k)) as [Vector3,Vector3,Vector3]
      if(ray.intersectTriangle(triangle[0],triangle[1],triangle[2],false,intersection)) {
        const distance=intersection.distanceTo(ray.origin)
        if(distance<closest) { closest=distance; y=intersection.y }
      }
    }
    const mapped=new Vector3(x,y,z)
    if (!Number.isFinite(closest)) {
      // Bounding-box corners lie outside the rounded source paper. Project onto
      // its authored bevel triangles instead of manufacturing a square corner.
      let distance=Infinity
      const query=mapped.clone(),candidate=new Vector3()
      for(let j=0;j<(sourceIndex?.count ?? sourcePosition.count);j+=3) {
        const triangle=[0,1,2].map(k=>new Vector3().fromBufferAttribute(sourcePosition,sourceIndex ? sourceIndex.getX(j+k) : j+k))
        new Triangle(triangle[0],triangle[1],triangle[2]).closestPointToPoint(query,candidate)
        const d=candidate.distanceToSquared(query)
        if(d<distance){distance=d;mapped.copy(candidate)}
      }
      if(!Number.isFinite(distance))throw new Error('Sample unavailable:paper-source-surface')
      edgeProjections++
    }
    mapped.toArray(paperStart,i*3)
  }
  imageGeometry.setAttribute('position',new Float32BufferAttribute(imageStart.slice(),3))
  paperGeometry.setAttribute('position',new Float32BufferAttribute(paperStart.slice(),3))
  const image = new Mesh(imageGeometry,sourceMaterial.clone()), paper = new Mesh(paperGeometry,materialOf(sourcePaper).clone())
  image.name='ArchiveFootballTransfer'; paper.name='ArchiveFootballTransferPaper'
  image.visible=false; paper.visible=false
  image.frustumCulled=false; paper.frustumCulled=false
  root.add(image,paper)
  let progress=0
  const rootInverse = new Matrix4(), point=new Vector3(), end=new Vector3()
  function surfaceFrame(mesh:Mesh) {
    const at=(u:number,v:number)=>photoPointAtUV(mesh.geometry,u,v).applyMatrix4(mesh.matrixWorld)
    const origin=at(.5,.5),tl=at(0,0),right=at(1,0).sub(tl).normalize(),up=tl.clone().sub(at(0,1)).normalize()
    const normal=right.clone().cross(up).normalize()
    up.crossVectors(normal,right).normalize()
    return {origin,rotation:new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal))}
  }
  let fromFrame=surfaceFrame(source),toFrame=surfaceFrame(wall)
  const orientation=new Quaternion(),center=new Vector3()
  function deform(geometry: BufferGeometry, start: Float32Array, finish: Float32Array, from: Mesh, to: Mesh, p: number) {
    const out=geometry.getAttribute('position')
    for(let i=0;i<out.count;i++) {
      point.fromArray(start,i*3).applyMatrix4(from.matrixWorld).sub(fromFrame.origin).applyQuaternion(fromFrame.rotation.clone().invert())
      end.fromArray(finish,i*3).applyMatrix4(to.matrixWorld).sub(toFrame.origin).applyQuaternion(toFrame.rotation.clone().invert())
      // One common orientation for image and backing prevents different aspect
      // ratios from shearing their planes through one another during rotation.
      point.lerp(end,p).applyQuaternion(orientation).add(center)
      const arc=Math.sin(Math.PI*p)
      point.y+=.26*arc; point.z+=.28*arc+4.2*p*(1-p)**3
      point.applyMatrix4(rootInverse)
      out.setXYZ(i,point.x,point.y,point.z)
    }
    out.needsUpdate=true; geometry.computeVertexNormals()
  }
  function apply(placement: PhotoPlacement) {
    progress=placement.kind==='life' ? 0 : placement.kind==='frame-wall' ? 1 : placement.progress
    if(!Number.isFinite(progress)||progress<0||progress>1) throw new Error('Sample unavailable:photo-progress')
    rootInverse.copy(root.matrixWorld).invert()
    fromFrame=surfaceFrame(source);toFrame=surfaceFrame(wall)
    orientation.copy(fromFrame.rotation).slerp(toFrame.rotation,progress)
    center.copy(fromFrame.origin).lerp(toFrame.origin,progress)
    center.x=fromFrame.origin.x+(toFrame.origin.x-fromFrame.origin.x)*progress*progress
    deform(imageGeometry,imageStart,imageEnd,source,wall,progress)
    deform(paperGeometry,paperStart,paperEnd,sourcePaper,wallPaper,progress)
    source.visible=sourcePaper.visible=progress===0
    wall.visible=wallPaper.visible=progress===1
    image.visible=paper.visible=progress>0&&progress<1
    image.updateMatrixWorld(true); paper.updateMatrixWorld(true)
  }
  function readback() {
    const points=(geometry: BufferGeometry,matrix: Matrix4)=>probes.map(([u,v])=>photoPointAtUV(geometry,u,v).applyMatrix4(matrix).toArray())
    return { contentId:'life-football-action', progress, owner:progress===0?'source':progress===1?'wall':'transfer',
      sourceVisible:source.visible, wallVisible:wall.visible, transferVisible:image.visible, paperVisible:paper.visible,
      uv:Array.from(imageUV.array), source:points(source.geometry,source.matrixWorld), target:points(wall.geometry,wall.matrixWorld), actual:points(imageGeometry,image.matrixWorld),
      paper:Array.from(paperGeometry.getAttribute('position').array as ArrayLike<number>), paperTarget:Array.from(paperEnd), paperStart:Array.from(paperStart), paperSourceMatrix:sourcePaper.matrixWorld.toArray(), edgeProjections,
      texture:{sameSource:sourceMap!.source===wallMap!.source, proxySameMap:('map' in image.material)&&image.material.map===sourceMap, flipY:sourceMap!.flipY},
    }
  }
  return { apply, readback, hide(){image.visible=paper.visible=false}, dispose(){image.removeFromParent();paper.removeFromParent();imageGeometry.dispose();paperGeometry.dispose();image.material.dispose();paper.material.dispose()} }
}

"""Bake a transport scene from the exact shipping geometry; export UV sidecars.

Never round-trip the production GLB through Blender's exporter. The assembler
retains its node/animation contract and only adds UV seam vertices when needed.
"""
from pathlib import Path
import sys, json, struct, math, base64, hashlib
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
sys.path.insert(0,str(Path(__file__).parent))
from bake_prop_surfaces import is_prop, make_maps, detail_uv
from bake_light_falloff import finite_falloff

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT/'output/material-optimization'
OUT = WORK/'bake'; OUT.mkdir(parents=True,exist_ok=True)
source = WORK/'baseline/personal-space.glb'
raw = source.read_bytes(); size = struct.unpack_from('<I',raw,12)[0]
doc = json.loads(raw[20:20+size]); binary = raw[28+size:]
TYPES = {5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
WIDTH = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(index):
    a=doc['accessors'][index]; v=doc['bufferViews'][a['bufferView']]
    dtype=np.dtype(TYPES[a['componentType']]); width=WIDTH[a['type']]
    return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,
        offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*dtype.itemsize),dtype.itemsize)).copy()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.engine='CYCLES'
scene.cycles.device='GPU';scene.cycles.samples=64;scene.cycles.use_adaptive_sampling=False
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='METAL'
scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
scene.render.bake.margin=8;scene.render.image_settings.color_depth='16'
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=math.log2(1.02)
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def world(index,parent=Matrix.Identity(4)):
    n=doc['nodes'][index]
    if 'matrix' in n:local=Matrix(np.array(n['matrix']).reshape(4,4).T.tolist())
    else:
        q=n.get('rotation',[0,0,0,1]);local=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
    result=parent@local;worlds[index]=result
    for child in n.get('children',[]):world(child,result)
worlds={}
for index in doc['scenes'][doc.get('scene',0)]['nodes']:world(index)

images={}
def texture(info,mat,noncolor=False):
    t=doc['textures'][info['index']];i=t.get('source',t.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
    if (i,noncolor) not in images:
        d=doc['images'][i];v=doc['bufferViews'][d['bufferView']]
        p=OUT/('input-%d%s.%s'%(i,'-data' if noncolor else '',d['mimeType'].split('/')[-1]))
        p.write_bytes(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
        image=bpy.data.images.load(str(p),check_existing=False)
        if noncolor:image.colorspace_settings.name='Non-Color'
        images[(i,noncolor)]=image
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    node=nodes.new('ShaderNodeTexImage');node.image=images[(i,noncolor)]
    uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UV'+str(info.get('texCoord',0))
    links.new(uv.outputs['UV'],node.inputs['Vector'])
    assert not info.get('extensions',{}).get('KHR_texture_transform'),'Implement texture transform before bake'
    return node

materials=[];maps={};receivers={};excluded={}
for mi,d in enumerate(doc['materials']):
    mat=bpy.data.materials.new(d['name']);mat.use_nodes=True;materials.append(mat)
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    bs=nodes.get('Principled BSDF');p=d.get('pbrMetallicRoughness',{})
    color=p.get('baseColorFactor',[1,1,1,1]);bs.inputs['Base Color'].default_value=color
    bs.inputs['Metallic'].default_value=p.get('metallicFactor',1);bs.inputs['Roughness'].default_value=p.get('roughnessFactor',1)
    if p.get('baseColorTexture'):
        node=texture(p['baseColorTexture'],mat);links.new(node.outputs['Color'],bs.inputs['Base Color'])
    if p.get('metallicRoughnessTexture'):
        node=texture(p['metallicRoughnessTexture'],mat,True);sep=nodes.new('ShaderNodeSeparateColor');links.new(node.outputs['Color'],sep.inputs[0])
        for channel,socket,factor in [('Green','Roughness',p.get('roughnessFactor',1)),('Blue','Metallic',p.get('metallicFactor',1))]:
            mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=factor;links.new(sep.outputs[channel],mul.inputs[0]);links.new(mul.outputs[0],bs.inputs[socket])
    if d.get('normalTexture'):
        node=texture(d['normalTexture'],mat,True);normal=nodes.new('ShaderNodeNormalMap');normal.uv_map='UV'+str(d['normalTexture'].get('texCoord',0));normal.inputs['Strength'].default_value=d['normalTexture'].get('scale',1)
        links.new(node.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    name=d['name'].lower()
    skip=any(x in name for x in ['monitor','screen','display','bulb','panorama','clear window','glass','viewer'])
    if skip:
        excluded[mi]='emissive/interface/glass/panorama: retain authored response'
        if any(x in name for x in ['glass','clear window','panorama']):
            transparent=nodes.new('ShaderNodeBsdfTransparent');links.new(transparent.outputs[0],nodes.get('Material Output').inputs['Surface'])
    else:receivers[mi]=[]
    if is_prop(d['name']):
        maps[mi]=make_maps(d['name'],OUT)
        for kind,img in maps[mi].items():
            node=nodes.new('ShaderNodeTexImage');node.image=img
            uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UV1';links.new(uv.outputs['UV'],node.inputs['Vector'])
            if kind=='normal':
                normal=nodes.new('ShaderNodeNormalMap');normal.uv_map='UV1';links.new(node.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
            else:links.new(node.outputs['Color'],bs.inputs['Roughness'])

records=[]
for ni,n in enumerate(doc['nodes']):
    if 'mesh' not in n:continue
    for pi,p in enumerate(doc['meshes'][n['mesh']]['primitives']):
        assert p.get('mode',4)==4 and not p.get('targets') and 'skin' not in n
        positions=accessor(p['attributes']['POSITION']);triangles=accessor(p['indices']).reshape(-1,3)
        mesh=bpy.data.meshes.new('Primitive_%d_%d'%(n['mesh'],pi));mesh.from_pydata(positions.tolist(),[],triangles.tolist());mesh.update()
        obj=bpy.data.objects.new(n['name']+'__'+str(pi),mesh);scene.collection.objects.link(obj);obj.matrix_world=C@worlds[ni]
        mi=p['material'];mesh.materials.append(materials[mi]);obj['gltf_material']=mi
        if 'NORMAL' in p['attributes']:
            for face in mesh.polygons:face.use_smooth=True
            mesh.normals_split_custom_set_from_vertices(accessor(p['attributes']['NORMAL']).tolist())
        detail=detail_uv(positions,triangles,doc['materials'][mi]['name'].removeprefix('RoomBake_')) if mi in maps else None
        for channel in range(3):
            uv=mesh.uv_layers.new(name='UV'+str(channel))
            values=detail if channel==1 and detail is not None else accessor(p['attributes']['TEXCOORD_'+str(channel)]) if 'TEXCOORD_'+str(channel) in p['attributes'] else np.zeros((len(positions),2))
            # glTF origin is top-left, Blender image/UV origin is bottom-left.
            if not(channel==1 and detail is not None):values[:,1]=1-values[:,1]
            uv.data.foreach_set('uv',values[triangles.ravel()].ravel())
        if mi in receivers:receivers[mi].append(obj)
        # Screens and printed overlays do not shadow in the shipping renderer.
        if any(x in n['name'] for x in ['MonitorState_photo','MonitorPhoto_','StackPhotoViewerSurface']):obj.hide_render=True
        if any(x in n['name'] for x in ['ArchivePhoto_','Monitor','Work_FileTitle_','Work_FileNumber_','About_PageFolio']):obj.visible_shadow=False
        records.append((n['mesh'],pi,obj,triangles,detail))

# The captured environment is linear and already includes intensity .52/.58.
environment=json.loads((WORK/'environment.json').read_text())
pixels=np.frombuffer(base64.b64decode(environment['rgbaFloat32']),dtype='<f4').copy()
if environment.get('orientation')!='blender-negative-longitude-v1':
    # Cycles direction_to_equirectangular uses u=(pi-atan2(y,x))/(2*pi).
    # Correct the initial positive-longitude capture without another browser run.
    pixels=pixels.reshape(environment['height'],environment['width'],4)[:,::-1,:].copy().ravel()
assert np.isfinite(pixels).all() and pixels[::4].max()>0,'Invalid PMREM readback'
image=bpy.data.images.new('Runtime PMREM and hemisphere',width=environment['width'],height=environment['height'],float_buffer=True)
image.colorspace_settings.name='Non-Color';image.pixels.foreach_set(pixels)
scene.world=bpy.data.worlds.new('Runtime sunrise world');scene.world.use_nodes=True
nodes=scene.world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment');env.image=image
scene.world.node_tree.links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=1
def linear(hexcode):
    rgb=[int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def light(name,kind,color,energy,position,target=None,distance=None):
    data=bpy.data.lights.new(name,kind);data.color=linear(color);data.energy=energy
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=C@Vector(position)
    if target:obj.rotation_euler=((C@Vector(target))-obj.location).to_track_quat('-Z','Y').to_euler()
    if kind=='SUN':data.angle=0
    else:
        data.shadow_soft_size=.001
        if distance:finite_falloff(data,distance)
    return data
light('Runtime window','SUN','ffb570',2.75,(4.1,1.95,-5.4),(0,.85,-.8))
task=light('Runtime task','SPOT','ffd09a',2.6*4*math.pi,(1,1.381,-1.14),(.63,.83,-.84),2.5)
task.spot_size=1.70;task.spot_blend=1
light('Runtime shelf','POINT','f6c58e',.08*4*math.pi,(.3,2.37,-1.31),distance=1.5)

manifest={'sourceSha256':hashlib.sha256(raw).hexdigest(),'materials':{},'excluded':excluded,
          'lighting':{'environment':environment['method'],'environmentOrientation':'blender-negative-longitude-v1','sunDirection':[-4.1,-1.1,4.6],'exposureDisplayOnly':1.02,
                      'samples':64,'indirectOnly':True,'aoDistanceMetres':.18,'localLightCalibration':'4*pi intensity; shader finite falloff (1-(d/r)^4)^2; white-reference probes'},'uv':[]}
for mi,objects in receivers.items():
    if not objects:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.hide_set(False);obj.select_set(True);obj.data.uv_layers.active_index=2
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.018);bpy.ops.object.mode_set(mode='OBJECT')
    mat=materials[mi];nodes,links=mat.node_tree.nodes,mat.node_tree.links
    output=nodes.get('Material Output');original=output.inputs['Surface'].links[0].from_socket
    resolution=1024 if mi in (3,4,5,9,20,46,48) else 512
    paths={}
    for kind in ['ao','indirect']:
        path=OUT/('material-%02d-%s.exr'%(mi,kind))
        image=bpy.data.images.new('RoomBake_%02d_%s'%(mi,kind),width=resolution,height=resolution,alpha=False,float_buffer=True)
        image.colorspace_settings.name='Non-Color'
        target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
        ao=emit=None
        if kind=='ao':
            ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.18;ao.samples=32
            emit=nodes.new('ShaderNodeEmission');links.new(ao.outputs['AO'],emit.inputs['Color']);links.new(emit.outputs[0],output.inputs['Surface'])
        else:
            links.new(original,output.inputs['Surface']);scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=False
        print('BAKE_START',mi,mat.name,kind,resolution,flush=True)
        bpy.ops.object.bake(type='EMIT' if kind=='ao' else 'DIFFUSE',use_clear=True)
        image.filepath_raw=str(path);image.file_format='OPEN_EXR';image.save()
        values=np.empty(resolution*resolution*4,np.float32);image.pixels.foreach_get(values)
        if not np.isfinite(values).all():raise ValueError('Non-finite bake '+mat.name)
        paths[kind]={'file':str(path.relative_to(ROOT)),'size':resolution,'min':float(values.reshape(-1,4)[:,:3].min()),'max':float(values.reshape(-1,4)[:,:3].max())}
        nodes.remove(target)
        if emit:nodes.remove(emit);nodes.remove(ao)
        bpy.data.images.remove(image)
        links.new(original,output.inputs['Surface'])
        print('BAKE_DONE',mi,kind,paths[kind],flush=True)
    if mi in maps:paths['prop']={k:str(Path(img.filepath_raw).relative_to(ROOT)) for k,img in maps[mi].items()}
    manifest['materials'][mi]=paths
    (OUT/'manifest.partial.json').write_text(json.dumps(manifest,indent=2))
for mesh,primitive,obj,triangles,detail in records:
    mi=obj['gltf_material']
    if mi not in receivers:continue
    uv=np.empty(len(obj.data.loops)*2,np.float32);obj.data.uv_layers['UV2'].data.foreach_get('uv',uv)
    uv=uv.reshape(-1,2);uv[:,1]=1-uv[:,1]
    name='uv-%d-%d.npz'%(mesh,primitive)
    arrays={'uv':uv,'vertices':triangles.ravel()}
    if detail is not None:detail[:,1]=1-detail[:,1];arrays['detail']=detail
    np.savez(OUT/name,**arrays)
    manifest['uv'].append({'mesh':mesh,'primitive':primitive,'file':str((OUT/name).relative_to(ROOT))})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunrise-bake-workspace.blend'))
print('SUNRISE_BAKE_COMPLETE',flush=True)

"""Export the refined source to staging, with actual-surface PBR atlases.

Never saves the editable source. Scene irradiance is rebuilt in the next stage.
"""
from pathlib import Path
import bpy,sys,json,hashlib,math
ROOT=Path(__file__).resolve().parents[3]
SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
WORK=ROOT/'output/web-refinement';OUT=WORK/'pbr';OUT.mkdir(parents=True,exist_ok=True)
source_sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
previous=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {}
cached=previous.get('groups',{}) if previous.get('sourceSha256')==source_sha else {}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));scene=bpy.context.scene;scene.frame_set(1)
for obj in list(scene.objects):
    if obj.get('monitor_state') in {'photo','project'}:continue
    if obj.hide_render or obj.hide_get() or obj.get('natural_room_superseded') or obj.get('window_room_superseded') or obj.get('lake_superseded'):
        bpy.data.objects.remove(obj,do_unlink=True)
for obj in scene.objects:
    if obj.get('monitor_state') in {'photo','project'}:
        obj.animation_data_clear();obj.hide_viewport=False;obj.hide_render=False;obj.hide_set(False)
bpy.context.view_layer.update()
for obj in list(scene.objects):
    if obj.type=='FONT':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    if obj.name=='Cinema_Atmosphere' or any(m and m.use_nodes and any(n.type in {'VOLUME_SCATTER','VOLUME_PRINCIPLED'} for n in m.node_tree.nodes) for m in getattr(obj.data,'materials',[])):
        bpy.data.objects.remove(obj,do_unlink=True)
# Earlier swatches remain valid: the three model passes preserved these original
# material graphs. Do not rebind the old source hash or mutate that old manifest.
cache=json.loads((ROOT/'art/personal-archive/textures/web-cinema/manifest.json').read_text())
for name,maps in cache['materials'].items():
    material=bpy.data.materials.get(name)
    if not material:continue
    shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');nodes,links=material.node_tree.nodes,material.node_tree.links
    for channel,target in [('color','Base Color'),('roughness','Roughness'),('normal','Normal')]:
        image=bpy.data.images.load(str(ROOT/maps[channel]),check_existing=True);image.pack()
        if channel!='color':image.colorspace_settings.name='Non-Color'
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        if channel=='normal':
            normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs[0],normal.inputs['Color']);links.new(normal.outputs[0],shader.inputs[target])
        else:links.new(tex.outputs[0],shader.inputs[target])
    material['archive_baked_pbr']=True
for obj in scene.objects:
    if not obj.get('archive_glass'):continue
    mat=bpy.data.materials.get('Web / clear window') or bpy.data.materials.new('Web / clear window');mat.use_nodes=True
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.85,.93,1,1);bs.inputs['Metallic'].default_value=.15;bs.inputs['Roughness'].default_value=.08;bs.inputs['Alpha'].default_value=.055;mat.surface_render_method='BLENDED'
    obj.data.materials.clear();obj.data.materials.append(mat)
scene.render.engine='CYCLES';scene.cycles.device='GPU';scene.cycles.samples=16;scene.cycles.use_adaptive_sampling=False
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='METAL'
scene.render.bake.margin=8;scene.render.bake.use_selected_to_active=False

def group_for(obj):
    names=[m.name for m in obj.data.materials if m]
    if not any(n.startswith(('Plant /','ShelfBook /','Room finish /')) for n in names):return None
    if obj.name.startswith(('PhotoMount_','ArchivePhoto_')):return None
    # Constants (text, thin seams, small metal grains) already export faithfully.
    linked=False
    for m in obj.data.materials:
        if not m or not m.use_nodes:continue
        bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if bs and any(bs.inputs[k].is_linked for k in ['Base Color','Roughness','Normal','Metallic']):linked=True
    if not linked:return None
    if obj.name.startswith('Plant leaf'):return 'foliage'
    if obj.name.startswith('Plant '):return 'plant-container'
    if obj.name.startswith(('Book spine','ShelfBook /')):return 'shelf-books'
    if obj.name.startswith('Floorboard'):return 'floor'
    if any('walnut' in n or 'endgrain' in n for n in names):return 'furniture-wood'
    if obj.name.startswith(('Warm_Linen','BackWindow_Curtain','Warm_Chair','Rug','Cinema_RugFringe')) or any(k in obj.name for k in ['throw ','curtain hem','cushion piping']):return 'textiles'
    if obj.name.startswith(('Life','Room finish /map','Room finish /envelope')):return 'life-paper-ceramic'
    if obj.name.startswith(('Mouse','Keyboard','Signal cable')) or any(k in obj.name for k in ['mouse ','scroll ','cable ','keyboard ']):return 'desktop'
    return 'hardware'

groups={}
for obj in list(scene.objects):
    if obj.type!='MESH':continue
    group=group_for(obj)
    if group:groups.setdefault(group,[]).append(obj)
# Photo mounts need a swatch to preserve their ordered front/back grid and UV0.
mounts=[o for o in scene.objects if o.name.startswith('PhotoMount_')]
if mounts:
    bpy.ops.mesh.primitive_plane_add(size=1);swatch=bpy.context.object;swatch.name='Refine temporary paper swatch'
    for v in swatch.data.vertices:v.co.x+=.5;v.co.y+=.5
    swatch.data.materials.append(mounts[0].data.materials[0]);groups['photo-paper']=[swatch]
report={'sourceSha256':source_sha,'groups':{}}
for group,objects in groups.items():
    print('PBR_GROUP_START',group,len(objects),flush=True)
    for obj in objects:
        if obj.modifiers:
            dg=bpy.context.evaluated_depsgraph_get();old=obj.data
            obj.data=bpy.data.meshes.new_from_object(obj.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg);obj.modifiers.clear()
        # Pin authored UV-dependent shaders (leaf veins) to their source channel.
        if obj.data.uv_layers:
            obj.data.uv_layers.active_index=0;obj.data.uv_layers[0].active_render=True
        uv=obj.data.uv_layers.get('RefinedBakeUV') or obj.data.uv_layers.new(name='RefinedBakeUV')
        obj.data.uv_layers.active=uv
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.05,island_margin=.006);bpy.ops.object.mode_set(mode='OBJECT')
    mats=set(m for o in objects for m in o.data.materials if m)
    outputs={m:next(n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output) for m in mats}
    original={m:outputs[m].inputs['Surface'].links[0].from_socket for m in mats}
    size=2048 if group in ['foliage','shelf-books','furniture-wood','floor','textiles'] else 1024
    if group=='photo-paper':size=512
    images={}
    for channel in ['color','orm','normal']:
        cached_path=ROOT/cached.get(group,{}).get('maps',{}).get(channel,'__missing__')
        if cached_path.is_file() and cached[group]['size']==size and cached[group]['objects']==len(objects):
            image=bpy.data.images.load(str(cached_path),check_existing=False)
            if channel!='color':image.colorspace_settings.name='Non-Color'
            image.pack();images[channel]=image
            print('PBR_CACHE',group,channel,flush=True)
            continue
        image=bpy.data.images.new('WebRefine '+group+' '+channel,width=size,height=size,alpha=False,float_buffer=False)
        if channel!='color':image.colorspace_settings.name='Non-Color'
        temp=[]
        for m in mats:
            nodes,links=m.node_tree.nodes,m.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
            target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target;temp.append((m,target))
            if channel=='normal':links.new(original[m],outputs[m].inputs['Surface']);continue
            emit=nodes.new('ShaderNodeEmission');temp.append((m,emit))
            if channel=='color':
                socket=bs.inputs['Base Color']
                if socket.is_linked:links.new(socket.links[0].from_socket,emit.inputs['Color'])
                else:emit.inputs['Color'].default_value=socket.default_value
            else:
                combine=nodes.new('ShaderNodeCombineColor');combine.mode='RGB';combine.inputs[0].default_value=1;temp.append((m,combine))
                for input_index,name in [(1,'Roughness'),(2,'Metallic')]:
                    socket=bs.inputs[name]
                    if socket.is_linked:links.new(socket.links[0].from_socket,combine.inputs[input_index])
                    else:combine.inputs[input_index].default_value=socket.default_value
                links.new(combine.outputs[0],emit.inputs['Color'])
            links.new(emit.outputs[0],outputs[m].inputs['Surface'])
        print('PBR_BAKE',group,channel,size,flush=True)
        bpy.ops.object.bake(type='NORMAL' if channel=='normal' else 'EMIT',use_clear=True,uv_layer='RefinedBakeUV')
        image.filepath_raw=str(OUT/(group+'-'+channel+'.png'));image.file_format='PNG';image.save();image.pack();images[channel]=image
        for m,node in temp:m.node_tree.nodes.remove(node)
        for m in mats:m.node_tree.links.new(original[m],outputs[m].inputs['Surface'])
    portable=bpy.data.materials.new('WebRefine / '+group);portable.use_nodes=True
    nodes,links=portable.node_tree.nodes,portable.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='UVMap'
    for channel,image in images.items():
        node=nodes.new('ShaderNodeTexImage');node.image=image;links.new(uvnode.outputs[0],node.inputs['Vector'])
        if channel=='color':links.new(node.outputs[0],bs.inputs['Base Color'])
        elif channel=='orm':
            sep=nodes.new('ShaderNodeSeparateColor');links.new(node.outputs[0],sep.inputs[0]);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
        else:
            normal=nodes.new('ShaderNodeNormalMap');normal.uv_map=uvnode.uv_map;links.new(node.outputs[0],normal.inputs['Color']);links.new(normal.outputs[0],bs.inputs['Normal'])
    portable['archive_baked_pbr']=True;portable['archive_refinement']=group
    if group=='foliage':bs.inputs['Specular IOR Level'].default_value=.30
    if group=='photo-paper':
        for obj in mounts:obj.data.materials.clear();obj.data.materials.append(portable)
        bpy.data.objects.remove(objects[0],do_unlink=True)
    else:
        for obj in objects:
            obj.data.materials.clear();obj.data.materials.append(portable)
            for face in obj.data.polygons:face.material_index=0
            # These textures now contain the evaluated source shading. Retain
            # only the atlas, so joining cannot silently change a shader's UV.
            for layer in list(obj.data.uv_layers):
                if layer.name!='RefinedBakeUV':obj.data.uv_layers.remove(layer)
            obj.data.uv_layers[0].name='UVMap';obj.data.uv_layers[0].active_render=True
    report['groups'][group]={'objects':len(objects),'size':size,'maps':{k:str(Path(v.filepath_raw).relative_to(ROOT)) for k,v in images.items()}}
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2))
    print('PBR_GROUP_DONE',group,flush=True)
# UV0 remains the authored photographic/reading coordinate system.
sys.path.insert(0,str(ROOT/'tools/personal_space/modeling'))
from surface_materials import projected_uv
for obj in scene.objects:
    if obj.type=='MESH' and not obj.data.uv_layers:projected_uv(obj,1)
    if obj.type=='MESH' and obj.data.uv_layers:obj.data.uv_layers[0].name='UVMap'
# Match the existing monitor groups, making both hidden states evaluable first.
monitor={}
for state in ['project','photo']:
    o=bpy.data.objects.new('MonitorState_'+state,None);scene.collection.objects.link(o);monitor[state]=o
for obj in list(scene.objects):
    state=obj.get('monitor_state')
    if state in monitor:
        world=obj.matrix_world.copy();obj.parent=monitor[state];obj.matrix_world=world
        obj.animation_data_clear();obj.hide_viewport=False;obj.hide_render=False;obj.hide_set(False)
bpy.context.view_layer.update()
# Flatten only static book assembly parents; nothing in the interaction contract.
for obj in list(scene.objects):
    if obj.parent and obj.parent.name.startswith(('Book spine','Warm_ShelfBook')):
        world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
keep={'Monitor screen','NotebookCover','NotebookReadingSurface','LifeMemoryPhoto','Life_PhotoPaper','LifeEnvelopeFlap','StackScreenSurface','StackPhotoViewerSurface',*[f'ArchivePhoto_{i:02}' for i in range(1,5)],*[f'PhotoMount_{i:02}' for i in range(1,5)]}
batches={}
for obj in list(scene.objects):
    if obj.type!='MESH' or obj.name in keep or obj.children or obj.name.startswith(('Notebook','About_')) or obj.animation_data or obj.get('archive_panorama') or obj.get('archive_glass'):continue
    key=obj.parent.name if obj.parent else ''
    # Join all static room material slots into one draw object, retaining UV names.
    batches.setdefault(key,[]).append(obj)
for parent,objects in batches.items():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='ArchiveArchitecture' if not parent else 'Batch_'+parent
# No shader anisotropy until the runtime's numerical path is separately validated.
for material in bpy.data.materials:
    if material.use_nodes:
        for n in material.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                socket=n.inputs.get('Anisotropic IOR Level') or n.inputs.get('Anisotropic')
                if socket:socket.default_value=0
bpy.ops.export_scene.gltf(filepath=str(WORK/'source-export.glb'),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_cameras=False,export_lights=False,export_extras=True,export_apply=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_sha
print('REFINED_SOURCE_EXPORTED',flush=True)

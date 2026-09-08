"""Export an editable source to the shared web asset without saving the blend."""
from pathlib import Path
import sys,json,hashlib
import math
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[3]
SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
OUT=ROOT/'apps/landing/src/assets/personal-archive'
before=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene;scene.frame_set(1)
# Hidden monitor objects are not evaluated at frame 1. Make both preview states
# evaluable BEFORE reading matrix_world or reparenting, then flush the depsgraph.
for obj in scene.objects:
    if obj.get('monitor_state') in {'photo', 'project'}:
        obj.animation_data_clear()
        obj.hide_viewport=False;obj.hide_render=False;obj.hide_set(False)
bpy.context.view_layer.update()

# Replace native procedural networks with their baked portable maps in RAM only.
bakes=json.loads((ROOT/'art/personal-archive/textures/web-cinema/manifest.json').read_text())
assert bakes['sourceSha256']==before,'Bake source does not match the current model'
for name,maps in bakes['materials'].items():
    material=bpy.data.materials[name]
    shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    nodes,links=material.node_tree.nodes,material.node_tree.links
    for channel,target in [('color','Base Color'),('roughness','Roughness'),('normal','Normal')]:
        image=bpy.data.images.load(str(ROOT/maps[channel]),check_existing=True);image.pack()
        if channel!='color':image.colorspace_settings.name='Non-Color'
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        if channel=='normal':
            normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=1
            links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs[target])
        else:links.new(tex.outputs['Color'],shader.inputs[target])
    material['archive_baked_pbr']=True

# Native volume and study cameras are not portable geometry.
for obj in list(scene.objects):
    if obj.name=='Cinema_Atmosphere':
        bpy.data.objects.remove(obj,do_unlink=True)

def web(v):return [v[0],v[2],-v[1]]

views={}
for key,name in [('home','Cinema_01_Room'),('about','Cinema_02_Book'),('life','Cinema_03_Life'),('frame','Cinema_04_Frame'),('stack','Cinema_05_Stack'),('work','Cinema_06_Work'),('contact','Cinema_07_Contact')]:
    cam=bpy.data.objects[name]
    direction=cam.matrix_world.to_quaternion()@Vector((0,0,-1))
    target=cam.data.dof.focus_object.matrix_world.translation if cam.data.dof.focus_object else cam.matrix_world.translation+direction
    # Three's FOV is vertical; derive it from the physical sensor and export aspect.
    vertical=2*math.atan(cam.data.sensor_width/(2*cam.data.lens)/(16/9))*180/math.pi
    views[key]={'position':web(cam.matrix_world.translation),'target':web(target),'fov':vertical}

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'modeling'))
from surface_materials import projected_uv
for obj in scene.objects:
    if obj.type=='MESH' and not obj.data.uv_layers:projected_uv(obj,1)

# Blender-only visibility keys become explicit named groups for the web renderer.
groups={}
for state in ['project','photo']:
    obj=bpy.data.objects.new('MonitorState_'+state,None);scene.collection.objects.link(obj);groups[state]=obj
for obj in list(scene.objects):
    state=obj.get('monitor_state')
    if state in groups:
        world=obj.matrix_world.copy();obj.parent=groups[state];obj.matrix_world=world
        obj.animation_data_clear();obj.hide_viewport=False;obj.hide_render=False
    if obj.type=='FONT':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
bpy.context.view_layer.update()

keep={'NotebookCover','NotebookReadingSurface','LifeMemoryPhoto','StackScreenSurface','StackPhotoViewerSurface',*[f'ArchivePhoto_{i:02}' for i in range(1,5)]}
batch={}
for obj in list(scene.objects):
    if obj.type!='MESH' or obj.name in keep or obj.name.startswith(('Notebook','About_')) or obj.animation_data or len(obj.data.materials)!=1:continue
    key=(obj.parent.name if obj.parent else '',obj.data.materials[0].name)
    batch.setdefault(key,[]).append(obj)
for (parent,mat),objects in batch.items():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    bpy.context.object.name='Batch_'+(parent or 'Room')+'_'+mat

# Bake room bounce light into a dedicated UV atlas. The glTF occlusion slot is a
# transport channel, identified by extras and moved to Three.lightMap at load.
static=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Batch_Room_')]
if static:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in static:obj.select_set(True)
    bpy.context.view_layer.objects.active=static[0];bpy.ops.object.join()
    room=bpy.context.object;room.name='ArchiveArchitecture'
    for i,mat in enumerate(room.data.materials):
        private=mat.copy();private.name='RoomBake_'+mat.name;room.data.materials[i]=private
    uv=room.data.uv_layers.new(name='CinemaLightUV');room.data.uv_layers.active=uv
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.006)
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new('Archive indirect light',width=2048,height=2048,alpha=False,float_buffer=True)
    image.colorspace_settings.name='Non-Color'
    materials=set(room.data.materials)
    for mat in materials:
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.nodes.active=tex
    scene.render.engine='CYCLES';scene.cycles.device='GPU';scene.cycles.samples=48
    scene.cycles.use_adaptive_sampling=False
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='METAL'
    scene.render.bake.margin=10
    scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=False
    bpy.ops.object.bake(type='DIFFUSE')
    image.filepath_raw=str(ROOT/'art/personal-archive/textures/web-cinema/static-indirect.png');image.file_format='PNG';image.save();image.pack()
    group=bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    if not any(i.name=='Occlusion' for i in group.interface.items_tree):
        group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    for mat in materials:
        nodes,links=mat.node_tree.nodes,mat.node_tree.links
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        uv_node=nodes.new('ShaderNodeUVMap');uv_node.uv_map='CinemaLightUV'
        links.new(uv_node.outputs['UV'],tex.inputs['Vector'])
        settings=nodes.new('ShaderNodeGroup');settings.node_tree=group
        links.new(tex.outputs['Color'],settings.inputs['Occlusion'])
        mat['archive_lightmap']=True
    # Original PBR textures keep UV0; only bounce light uses the second channel.
    room.data.uv_layers.active_index=0

OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'personal-space.glb'),export_format='GLB',export_animations=True,
    export_animation_mode='ACTIONS',export_cameras=False,export_lights=False,export_extras=True,export_apply=True)
(OUT/'scene-contract.json').write_text(json.dumps({'sourceSha256':before,'views':views,'coordinateSystem':'Y-up',
    'surfaces':{k:[k+'_'+c for c in ['TL','TR','BR','BL']] for k in ['AboutReading','LifeReading','FrameReading','StackReading','WorkReading']},
    'monitorStates':['MonitorState_project','MonitorState_photo']},indent=2)+'\n')
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==before
print('WEB_SCENE_EXPORTED',flush=True)

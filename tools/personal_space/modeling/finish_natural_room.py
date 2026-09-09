"""Image-based exterior and final natural room source. Idempotent, no new blend."""
import bpy, sys, math, json, hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from finish_window_room import ROOT,SOURCE,REVIEW,contract,missing_dependencies,blend_inventory
VERSION='2026-09-09-natural-room-1'
def sha(): return hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
if bpy.context.scene.get('natural_room_version')==VERSION:
    assert not missing_dependencies()
    print('NATURAL_ROOM_ALREADY_SAVED',sha());raise SystemExit(0)
before=sha();protected=contract();inventory=blend_inventory()
scene=bpy.context.scene
old=bpy.data.collections.get('15 Lake landscape - terrain and forest')
if old:
    old.hide_render=True;old.hide_viewport=True
    for obj in old.objects:
        obj.hide_render=True;obj.hide_set(True);obj['natural_room_superseded']=True
col=bpy.data.collections.new('17 Alpine window panorama');scene.collection.children.link(col)
image=bpy.data.images.load(str(ROOT/'art/personal-archive/textures/window/alpine-evening.png'),check_existing=True);image.pack()
mat=bpy.data.materials.new('Alpine evening / photographic panorama');mat.use_nodes=True
nodes,links=mat.node_tree.nodes,mat.node_tree.links;nodes.clear()
tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Linear'
emit=nodes.new('ShaderNodeEmission');emit.inputs['Strength'].default_value=.85
out=nodes.new('ShaderNodeOutputMaterial');links.new(tex.outputs['Color'],emit.inputs['Color']);links.new(emit.outputs[0],out.inputs['Surface'])
mat['archive_panorama']=True
# Rear panorama is a distant physical plane; a second flank continues the side window.
for name,verts in [('WindowPanorama_Rear',[(-5,7,-2),(5,7,-2),(5,7,4.6667),(-5,7,4.6667)]),('WindowPanorama_Side',[(-7,-6,-3),(-7,7,-3),(-7,7,5.6667),(-7,-6,5.6667)])]:
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='UVMap')
    for i,value in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=value
    obj=bpy.data.objects.new(name,mesh);col.objects.link(obj);obj.visible_shadow=False;obj['archive_panorama']=True
# The rear glass keeps native Fresnel shading; exporter supplies its portable counterpart.
for obj in scene.objects:
    if obj.name.startswith('BackWindow_Glass_'):obj['archive_glass']=True
for name in ['BackWindow sky fill','Window softbox']:
    obj=bpy.data.objects.get(name)
    if obj:obj.data.specular_factor=0
scene.cycles.preview_samples=128;scene.cycles.use_preview_denoising=True
scene.cycles.preview_adaptive_threshold=.025
scene.camera=bpy.data.objects['WindowRoom_01_Overview']
scene['natural_room_version']=VERSION
scene['window_room_web_status']='Natural room source; export separately without saving source.'
text=bpy.data.texts.get('START HERE - Window room review');text.clear();text.write('NATURAL ROOM / 2026-09-09\nDefault: WindowRoom_01_Overview, frame 72.\nCollection 17: packed photographic panorama; collection 15: hidden recoverable former terrain.\nReal interior, curtains, windows, book and archive rig retained.\nBlender preview denoising enabled. Visual acceptance belongs to tim.\n')
assert contract()==protected
scene.frame_set(72)
bpy.ops.file.pack_all();assert not missing_dependencies();assert sha()==before
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
assert blend_inventory()==inventory
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));assert contract()==protected;assert not missing_dependencies()
report={'version':VERSION,'sourceSha256':sha(),'previousSourceSha256':before,'protectedContractUnchanged':True,'blendInventoryUnchanged':True,'missingDependencies':[],'panorama':'art/personal-archive/textures/window/alpine-evening.png','visualAcceptance':'pending tim','rendered':False}
(REVIEW/'natural-room-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print('NATURAL_ROOM_SAVED',json.dumps(report))

"""Independently reopen, inspect and append the delivered asset library.

Run with: blender -b --factory-startup --python-exit-code 1 -P verify_assets.py
This never saves changes to darkroom_assets.blend.
"""
import bpy, bmesh, json, math, struct, hashlib
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from mathutils import Vector

base=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(base/'darkroom_assets.blend'))
scene=bpy.data.scenes['DR_Assets']; bpy.context.window.scene=scene
def reveal(layer):
    layer.exclude=False; layer.hide_viewport=False
    for child in layer.children: reveal(child)
reveal(bpy.context.view_layer.layer_collection)
bpy.context.view_layer.update()
report={'blender':bpy.app.version_string,'file':'darkroom_assets.blend',
        'validated_at_utc':datetime.now(timezone.utc).isoformat(),
        'blend_sha256':hashlib.sha256((base/'darkroom_assets.blend').read_bytes()).hexdigest(),
        'builder_sha256':hashlib.sha256((base/'build_assets.py').read_bytes()).hexdigest(),
        'checks':{}}
checks=report['checks']
assert scene.world is None and scene.camera is None
assert not [o.name for o in scene.objects if o.type in {'LIGHT','CAMERA'}]
checks['asset_scene_without_camera_light_world']=True
checks['preview_scene']=bpy.data.scenes['DR_Preview'].name
assert all(im.packed_file for im in bpy.data.images if im.type!='RENDER_RESULT')
checks['packed_images']=[im.name for im in bpy.data.images if im.packed_file]
texts=[o for o in bpy.data.objects if o.type=='FONT']
assert len(texts)==12 and all(o.name.startswith('DR_Timer_Number_') for o in texts)
assert sorted(int(o.data.body) for o in texts)==list(range(0,60,5))
checks['readable_text_only_timer_0_to_55']=True
assert not any(n.type=='TEX_IMAGE' for n in bpy.data.materials['DR_PaperFibreBase'].node_tree.nodes)
checks['paper_has_no_photo_texture']=True

def coordinates(obj):
    bpy.context.view_layer.update()
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh()
    values=np.empty(len(mesh.vertices)*3,dtype=np.float32)
    mesh.vertices.foreach_get('co',values); values=values.reshape(-1,3).copy()
    evaluated.to_mesh_clear()
    return values

control=bpy.data.objects['DR_Line_SagControl']; strand=bpy.data.objects['DR_Line_TwistedStrand_0']
before=coordinates(strand)
mid_before=float(before[np.abs(before[:,0]-1)<.003,2].mean())
end_before=float(before[before[:,0]<.001,2].mean())
control.location.z-=.04
after=coordinates(strand)
mid_after=float(after[np.abs(after[:,0]-1)<.003,2].mean())
end_after=float(after[after[:,0]<.001,2].mean())
assert -.041<mid_after-mid_before<-.039,(mid_before,mid_after)
assert abs(end_after-end_before)<.00005,(end_before,end_after)
control.location.z+=.04
checks['line_sag_control']={'centre_displacement_m':mid_after-mid_before,'endpoint_displacement_m':end_after-end_before}

root=bpy.data.objects['DR_Clothespin_Root']; upper=bpy.data.objects['DR_Clothespin_UpperHalf']; lower=bpy.data.objects['DR_Clothespin_LowerHalf']
def jaw_gap():
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    a=upper.evaluated_get(deps).matrix_world @ Vector((-.037,0,.00015))
    b=lower.evaluated_get(deps).matrix_world @ Vector((-.037,0,-.00015))
    return (a-b).length
closed=jaw_gap(); root['DR_open_degrees']=18.; root.update_tag(); bpy.context.view_layer.update()
opened=jaw_gap()
assert opened>closed+.008,(closed,opened)
root['DR_open_degrees']=0.; root.update_tag()
checks['clothespin_open_control']={'closed_gap_m':closed,'gap_at_18_degrees_m':opened}

checks['paper_sheets']={}
for name in ['DR_Paper_8x10','DR_Paper_10x8']:
    obj=bpy.data.objects[name]
    assert len(obj.data.polygons)==12800
    uv=obj.data.uv_layers.active
    assert all(abs(min(p.uv[k] for p in uv.data))<1e-7 and abs(max(p.uv[k] for p in uv.data)-1)<1e-7 for k in (0,1))
    assert abs(obj.modifiers['DR_0300mm_Fibre_Base'].thickness-.0003)<1e-8
    key=obj.data.shape_keys.key_blocks['DR_Hanging_Curl']; key.value=1.
    top=[i for i,v in enumerate(obj.data.vertices) if abs(v.co.z)<1e-8]
    assert all((key.data[i].co-obj.data.vertices[i].co).length<1e-8 for i in top)
    key.value=0.
    checks['paper_sheets'][name]={'quads':12800,'thickness_m':.0003,'uv_full_0_1':True,'top_row_stays_pinned_in_curl':True}

checks['hand_pivots']={}
for name in ['DR_Timer_MinuteHand','DR_Timer_SecondHand']:
    obj=bpy.data.objects[name]
    origin=obj.location.copy(); obj.rotation_euler.y+=.5
    bpy.context.view_layer.update()
    assert (obj.location-origin).length<1e-10
    checks['hand_pivots'][name]=list(origin)

# Evaluated closed-solid topology, excluding intentionally open ink-decal planes.
nonmanifold=[]; inspected=0
for obj in list(scene.objects):
    if obj.type!='MESH' or obj.get('DR_helper') or obj.name=='DR_GraduatedCylinder_Graduations': continue
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh(); bm=bmesh.new(); bm.from_mesh(mesh)
    count=sum(not e.is_manifold for e in bm.edges)
    if count: nonmanifold.append({'object':obj.name,'boundary_or_nonmanifold_edges':count})
    inspected+=1; bm.free(); evaluated.to_mesh_clear()
checks['evaluated_mesh_topology']={'meshes_inspected':inspected,'issues':nonmanifold}
assert not nonmanifold,nonmanifold

manifest=json.loads((base/'asset_manifest.json').read_text())
assert bpy.data.texts['DR_build_assets.py'].as_string()==(base/'build_assets.py').read_text()
assert json.loads(bpy.data.texts['DR_AssetManifest'].as_string())==manifest
checks['embedded_builder_and_manifest_match_delivery']=True
checks['previews']={}
for name in manifest['families']:
    path=base/'previews'/(name+'.png'); header=path.read_bytes()[:24]
    dims=struct.unpack('>II',header[16:24]); assert dims==(1600,1000),(name,dims)
    checks['previews'][name]={'dimensions':list(dims),'bytes':path.stat().st_size}

# Test actual collection append into an empty file. Packed texture and controller
# references must survive append; no scene/studio objects are imported.
names=list(manifest['families'])
bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(str(base/'darkroom_assets.blend'),link=False) as (source,target):
    assert all(name in source.collections for name in names)
    target.collections=names[:]
for collection in target.collections: bpy.context.scene.collection.children.link(collection)
assert all(bpy.data.collections.get(name) for name in names)
assert not [o for o in bpy.context.scene.objects if o.type in {'CAMERA','LIGHT'}]
assert bpy.data.objects['DR_Line_TwistedStrand_0'].modifiers['DR_Adjustable_Midpoint_Sag'].object.name=='DR_Line_SagControl'
assert bpy.data.objects['DR_Clothespin_UpperHalf'].animation_data.drivers[0].driver.variables[0].targets[0].id.name=='DR_Clothespin_Root'
assert all(im.packed_file for im in bpy.data.images)
checks['append_into_empty_file']={'families':len(target.collections),'studio_objects_imported':0,'controllers_and_packed_textures_preserved':True}
report['result']='PASS'
(base/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('DR_VERIFIED',json.dumps({'result':report['result'],'mesh_count':inspected,'append_families':len(names),'preview_count':len(checks['previews'])}),flush=True)

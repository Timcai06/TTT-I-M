"""Update the continuing Blender source in place; never apply geometry modifiers."""
from pathlib import Path
import sys,json,hashlib,shutil
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).parent))
from bake_prop_surfaces import PROP_NAMES,detail_uv
ROOT=Path(__file__).resolve().parents[3];WORK=ROOT/'output/material-optimization'
SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
FOLDER=ROOT/'art/personal-archive/textures/prop-surfaces';FOLDER.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
before=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
def geometry_hash():
    sha=hashlib.sha256()
    for obj in sorted(bpy.context.scene.objects,key=lambda o:o.name):
        if obj.type!='MESH':continue
        sha.update(obj.name.encode());sha.update(np.array([v.co[:] for v in obj.data.vertices],np.float32).tobytes())
        sha.update(np.array([l.vertex_index for l in obj.data.loops],np.uint32).tobytes())
    return sha.hexdigest()
geometry_before=geometry_hash()
manifest=json.loads((WORK/'bake/portable.json').read_text())
baseline=json.loads((WORK/'baseline/model.json').read_text())
paths={baseline['materials'][int(i)]['name'].removeprefix('RoomBake_'):m['prop'] for i,m in manifest['materials'].items() if 'prop' in m}
edited=[]
for name in sorted(PROP_NAMES):
    material=bpy.data.materials.get(name)
    if not material:raise ValueError('Missing approved source material '+name)
    nodes,links=material.node_tree.nodes,material.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for n in list(nodes):
        if n.get('archive_prop_surface'):nodes.remove(n)
    uv=nodes.new('ShaderNodeUVMap');uv.uv_map='ArchiveDetailUV';uv['archive_prop_surface']=True
    for channel in ['normal','roughness']:
        source=ROOT/paths[name][channel];target=FOLDER/source.name;shutil.copy2(source,target)
        image=bpy.data.images.load(str(target),check_existing=True);image.colorspace_settings.name='Non-Color';image.pack()
        texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.label='Approved '+channel;texture['archive_prop_surface']=True
        links.new(uv.outputs['UV'],texture.inputs['Vector'])
        if channel=='normal':
            normal=nodes.new('ShaderNodeNormalMap');normal.uv_map='ArchiveDetailUV';normal['archive_prop_surface']=True
            links.new(texture.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
        else:links.new(texture.outputs['Color'],shader.inputs['Roughness'])
    material['archive_prop_surface']='sunrise-20260911'
    edited.append(name)
objects=[]
for obj in bpy.context.scene.objects:
    if obj.type!='MESH' or not any(m and m.name in PROP_NAMES for m in obj.data.materials):continue
    assert len(obj.data.materials)==1,'Multi-material source prop needs per-face UV ownership'
    mesh=obj.data;mesh.calc_loop_triangles()
    positions=np.array([v.co[:] for v in mesh.vertices],np.float32)[:,[0,2,1]];positions[:,2]*=-1
    triangles=np.array([t.vertices[:] for t in mesh.loop_triangles],np.int32)
    values=detail_uv(positions,triangles,mesh.materials[0].name)
    layer=mesh.uv_layers.get('ArchiveDetailUV') or mesh.uv_layers.new(name='ArchiveDetailUV')
    layer.data.foreach_set('uv',values[[l.vertex_index for l in mesh.loops]].ravel())
    objects.append(obj.name)
assert geometry_hash()==geometry_before,'Source geometry changed'
text=bpy.data.texts.get('Material optimization 2026-09-11') or bpy.data.texts.new('Material optimization 2026-09-11')
text.clear();text.write('10 approved prop materials: vein/fibre normal maps and directional roughness.\nArchiveDetailUV is independent of existing UV maps.\n37 material AO/indirect bakes use the exact shipping geometry in output/material-optimization/bake.\nNo decimation, vertex movement, animation or camera edits. Runtime lighting calibration and evidence: docs/landing/delivery/material-optimization-20260911.md\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
after=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
(WORK/'source-update.json').write_text(json.dumps({'beforeSha256':before,'afterSha256':after,'geometrySha256':geometry_before,'materials':edited,'objects':objects},indent=2)+'\n')
print('SOURCE_UPDATED',len(edited),len(objects),after,flush=True)

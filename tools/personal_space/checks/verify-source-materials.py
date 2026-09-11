"""Read-only check of the continuing .blend against the saved pre-edit source."""
import bpy,json,hashlib
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[3];WORK=ROOT/'output/material-optimization'
approved={'Cinema rug binding','Cinema unbleached binding thread','Dry branches','Coffee','Archive red','Curtain / dark woven tie','Window / rubber seals','Leaf_0','Leaf_1','Leaf_2'}
def value(v):
    if isinstance(v,(str,int,float,bool)):return v
    try:return list(v)
    except TypeError:return None
def read(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    materials={}
    for m in bpy.data.materials:
        if m.name in approved or not m.node_tree:continue
        materials[m.name]={'nodes':[{ 'name':n.name,'type':n.bl_idname,
            'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],
            'image':n.image.name if hasattr(n,'image') and n.image else None} for n in m.node_tree.nodes],
            'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links]}
    geometry={o.name:hashlib.sha256(np.array([v.co[:] for v in o.data.vertices],np.float32).tobytes()+np.array([l.vertex_index for l in o.data.loops],np.uint32).tobytes()).hexdigest() for o in bpy.context.scene.objects if o.type=='MESH'}
    return materials,geometry
old=read(WORK/'baseline/source.blend');new=read(ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend')
assert old==new,'A source mesh or non-approved material changed'
for name in approved:
    material=bpy.data.materials[name]
    assert material.get('archive_prop_surface')=='sunrise-20260911'
    shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    assert shader.inputs['Normal'].is_linked and shader.inputs['Roughness'].is_linked
report={'nonApprovedMaterialsUnchanged':len(new[0]),'sourceMeshGeometryUnchanged':len(new[1]),'approvedMaterials':len(approved),
        'sha256':hashlib.sha256((ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend').read_bytes()).hexdigest()}
(WORK/'source-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('SOURCE_VERIFIED',report,flush=True)

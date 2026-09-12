"""Structural snapshots for review; does not accept visual appearance."""
import bpy,json,hashlib,struct,math,sys
from pathlib import Path

def digest(value):return hashlib.sha256(repr(value).encode()).hexdigest()
def snapshot():
    result={};structure={}
    for o in bpy.context.scene.objects:
        h=hashlib.sha256();h.update(str((o.type,tuple(tuple(r) for r in o.matrix_world),o.parent.name if o.parent else None,o.hide_render,o.hide_get())).encode())
        if o.type=='MESH':
            for v in o.data.vertices:h.update(struct.pack('fff',*v.co))
            for p in o.data.polygons:h.update(str((tuple(p.vertices),p.material_index,p.use_smooth)).encode())
            h.update(str([m.name if m else None for m in o.data.materials]).encode())
        result[o.name]=h.hexdigest()
        structure[o.name]=digest((o.type,tuple(tuple(r) for r in o.matrix_world),o.parent.name if o.parent else None,o.hide_render,o.hide_get(),str(o.animation_data.action.name if o.animation_data and o.animation_data.action else None)))
    materials={}
    for m in bpy.data.materials:
        if m.name.startswith('Room finish /'):continue
        values=[tuple(m.diffuse_color),m.use_nodes]
        if m.use_nodes:
            for n in m.node_tree.nodes:
                sockets=[]
                for s in n.inputs:
                    if not hasattr(s,'default_value'):continue
                    v=s.default_value
                    if not isinstance(v,(str,int,float,bool)):
                        try:v=tuple(v)
                        except TypeError:v=str(v)
                    sockets.append((s.identifier,v))
                values.append((n.name,n.type,sockets,n.image.name if n.type=='TEX_IMAGE' and n.image else None))
            values.extend((l.from_node.name,l.from_socket.identifier,l.to_node.name,l.to_socket.identifier) for l in m.node_tree.links)
        materials[m.name]=digest(values)
    photos={o.name:[tuple(tuple(d.uv) for d in layer.data) for layer in o.data.uv_layers] for o in bpy.context.scene.objects if o.name.startswith('ArchivePhoto_') and o.type=='MESH'}
    return {'objects':result,'structure':structure,'materials':materials,'photos_uv':photos,'edited':[o.name for o in bpy.context.scene.objects if o.get('room_refinement')=='20260912']}

if __name__=='__main__':Path(sys.argv[-1]).write_text(json.dumps(snapshot(),indent=2))

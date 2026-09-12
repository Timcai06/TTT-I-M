"""Shared in-place Blender refinement helpers. No save/export side effects."""
import bpy, bmesh, math, hashlib, struct, json
from mathutils import Vector, Matrix
from pathlib import Path
PREFIX='Room finish / '
OUT=Path(__file__).resolve().parents[4]/'output/room-refinement'

def tag(o):
    o['room_refinement']='20260912'
    return o

def bounds(o):
    pts=[o.matrix_world@Vector(v) for v in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]),Vector([max(p[i] for p in pts) for i in range(3)])

def base(o):
    key=o.get('room_original_mesh')
    if key and key in bpy.data.meshes:return bpy.data.meshes[key]
    data=o.data.copy();data.name=PREFIX+'baseline / '+o.name;data.use_fake_user=True
    o['room_original_mesh']=data.name
    return data

def deform(o, fn):
    original=base(o);old=o.data;data=original.copy();data.use_fake_user=False
    inv=o.matrix_world.inverted()
    for v in data.vertices:v.co=inv@Vector(fn(o.matrix_world@v.co))
    o.data=data
    if old.users==0 and not old.use_fake_user:bpy.data.meshes.remove(old)
    tag(o);data.update()
    return o

def mat(name, color, rough=.6, metal=0):
    m=bpy.data.materials.get(PREFIX+name) or bpy.data.materials.new(PREFIX+name)
    m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal;bs.inputs['Specular IOR Level'].default_value=.28
    return m

def assign(o,m):
    if o.data.users>1:o.data=o.data.copy()
    o.data.materials.clear();o.data.materials.append(m)
    for p in o.data.polygons:p.material_index=0
    tag(o)

def grain(m,scale=(1,1,1),amount=.15,distance=.0001,frequency=160):
    nodes,links=m.node_tree.nodes,m.node_tree.links
    if nodes.get('Surface grain'):return
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    tex=nodes.new('ShaderNodeTexCoord');v=nodes.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=scale
    links.new(tex.outputs['Object'],v.inputs[0])
    n=nodes.new('ShaderNodeTexNoise');n.name='Surface grain';n.inputs['Scale'].default_value=frequency;n.inputs['Detail'].default_value=2
    links.new(v.outputs[0],n.inputs['Vector']);b=nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=amount;b.inputs['Distance'].default_value=distance
    links.new(n.outputs['Fac'],b.inputs['Height']);links.new(b.outputs[0],bs.inputs['Normal'])

def mesh(name,verts,faces,m,source=None,bevel=0,smooth=False):
    o=bpy.data.objects.get(name)
    if o:
        base(o);inv=o.matrix_world.inverted();verts=[inv@Vector(v) for v in verts]
    data=bpy.data.meshes.new(name+' geometry');data.from_pydata(verts,[],faces);data.update()
    if bevel:
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=3,affect='EDGES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    if o:
        old=o.data;o.data=data
        if old.users==0 and not old.use_fake_user:bpy.data.meshes.remove(old)
    else:
        o=bpy.data.objects.new(name,data)
        (source.users_collection[0] if source else bpy.data.collections['01 Furniture and lamp']).objects.link(o)
        if source:
            o.hide_render=source.hide_render;o.hide_set(source.hide_get())
    data.materials.append(m)
    for p in data.polygons:p.use_smooth=smooth
    return tag(o)

def box(name,center,size,m,source=None,bevel=.001):
    c=Vector(center);s=Vector(size)/2
    v=[c+Vector((x*s.x,y*s.y,z*s.z)) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    f=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    return mesh(name,v,f,m,source,bevel)

def tube(name,points,radius,m,source=None,sides=10):
    points=[Vector(p) for p in points];v=[];f=[]
    previous=None
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        side=tangent.cross(Vector((0,0,1)))
        if side.length<.01:side=tangent.cross(Vector((0,1,0)))
        side.normalize()
        if previous is not None and side.dot(previous)<0:side=-side
        previous=side;up=tangent.cross(side).normalized()
        for j in range(sides):v.append(p+radius*(side*math.cos(math.tau*j/sides)+up*math.sin(math.tau*j/sides)))
        if i:
            for j in range(sides):
                a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides;f.append((a,b,b+sides,a+sides))
    f += [tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))]
    return mesh(name,v,f,m,source,smooth=True)

def lathe(name,profile,center,m,source=None,sides=72,axis=None):
    c=Vector(center);axis=axis or Matrix.Identity(3)
    v=[c+axis@Vector((r*math.cos(math.tau*j/sides),r*math.sin(math.tau*j/sides),z)) for r,z in profile for j in range(sides)]
    f=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(profile)-1) for j in range(sides)]
    return mesh(name,v,f,m,source,smooth=True)

def text(name,body,center,size,m,source,rotation=(0,0,0)):
    name=PREFIX+name
    old=bpy.data.objects.get(name)
    if old:
        d=old.data;bpy.data.objects.remove(old,do_unlink=True)
        if d.users==0:bpy.data.meshes.remove(d)
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.space_character=1.08;c.resolution_u=4
    o=bpy.data.objects.new(name,c);source.users_collection[0].objects.link(o);o.location=center;o.rotation_euler=rotation;c.materials.append(m)
    bpy.context.view_layer.update();data=bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()));matrix=o.matrix_world.copy()
    bpy.data.objects.remove(o,do_unlink=True);bpy.data.curves.remove(c)
    o=bpy.data.objects.new(name,data);source.users_collection[0].objects.link(o);o.matrix_world=matrix
    return tag(o)

def attach(o,parent):
    matrix=o.matrix_world.copy();o.parent=parent;o.matrix_world=matrix
    o.hide_render=parent.hide_render;o.hide_set(parent.hide_get())
    return o

def view(target,vector,distance,lens=43):
    s=next(a for a in bpy.context.screen.areas if a.type=='VIEW_3D').spaces.active;r=s.region_3d
    r.view_rotation=Vector(vector).to_track_quat('Z','Y');r.view_location=Vector(target);r.view_distance=distance;r.view_perspective='PERSP';s.lens=lens;r.update()

def overview():
    s=next(a for a in bpy.context.screen.areas if a.type=='VIEW_3D').spaces.active;r=s.region_3d;c=bpy.data.objects['WindowRoom_01_Overview']
    r.view_rotation=c.matrix_world.to_quaternion();r.view_distance=4;r.view_location=c.matrix_world.translation-r.view_rotation@Vector((0,0,4));r.view_perspective='PERSP';s.lens=43;r.update()

def shot(filename):
    bpy.context.view_layer.update()
    bpy.types.blendermcp_server.get_viewport_screenshot(max_size=1400,filepath=str(OUT/filename))

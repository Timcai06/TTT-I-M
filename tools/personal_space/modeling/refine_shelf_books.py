"""Refine the 15 shelf books in place; run structure(), then finish().

Only Book spine*, Warm_ShelfBook*, Warm_BookSpineRule* and ShelfBook / objects
are in scope. Does not save, export, change scene lighting or alter desk books.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix, Euler

PREFIX = 'ShelfBook / '
PALETTE = [
    ('ink', (.023,.038,.043)), ('linen', (.43,.365,.26)),
    ('clay', (.235,.078,.043)), ('sage', (.12,.17,.10)),
    ('ivory', (.66,.60,.46)), ('ochre', (.34,.23,.075))]
TITLES = ['FORM & SPACE','FIELD NOTES','LIGHT STUDIES','MATERIAL ATLAS',
          'VISUAL SYSTEMS','WAYS OF MAKING','LANDSCAPE','THE QUIET ROOM',
          'TYPE & FORM','OBSERVATIONS','COLOUR STUDIES','SMALL WORLDS',
          'LINES & PLANES','COLLECTED WORK','EVERYDAY OBJECTS']


def material(name, color, roughness=.7):
    m=bpy.data.materials.get(PREFIX+name) or bpy.data.materials.new(PREFIX+name)
    m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness
    bs.inputs['Specular IOR Level'].default_value=.24
    return m


def box_geometry(center, size):
    x,y,z=center;w,d,h=(v/2 for v in size)
    verts=[(x+sx*w,y+sy*d,z+sz*h) for sx,sy,sz in
           [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),
            (1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    return verts,faces


def mesh(name, verts, faces, mat, root=None, bevel=0):
    data=bpy.data.meshes.new(name+' geometry');data.from_pydata(verts,[],faces);data.update()
    if bevel:
        bm=bmesh.new();bm.from_mesh(data)
        bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=3,affect='EDGES')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    data.materials.append(mat)
    obj=bpy.data.objects.get(name)
    if obj:
        old=obj.data;obj.data=data
        if old.users==0:bpy.data.meshes.remove(old)
    else:
        obj=bpy.data.objects.new(name,data)
        (root.users_collection[0] if root else bpy.data.collections['03 Life - objects']).objects.link(obj)
    if root:obj.parent=root;obj.location=(0,0,0)
    obj['shelf_book_refinement']='20260912'
    return obj


def box(name, center, size, mat, root=None, bevel=.0005):
    v,f=box_geometry(center,size)
    return mesh(name,v,f,mat,root,bevel)


def sync_visibility():
    # Parent visibility does not hide children in Blender. Preserve dormant variants.
    for obj in bpy.context.scene.objects:
        if obj.name.startswith(PREFIX) and obj.parent:
            obj.hide_render=obj.parent.hide_render
            obj.hide_viewport=obj.parent.hide_viewport
            obj.hide_set(obj.parent.hide_get())


def specs():
    # name, thickness, depth, height, x, spine y, support z, lean, colour.
    names=['Book spine']+['Book spine.%03d'%i for i in range(1,9)]
    rows=[
        (.041,.225,.285,-1.615,1.025,.657,0,0),
        (.032,.207,.253,-1.571,1.030,.657,0,1),
        (.049,.230,.305,-1.527,1.022,.657,0,2),
        (.029,.205,.222,-1.177,1.035,.657,-90,3),
        (.023,.192,.203,-1.189,1.044,.686,-90,4),
        (.049,.231,.295,-1.602,1.045,1.547,0,1),
        (.035,.213,.267,-1.555,1.041,1.547,0,0),
        (.043,.228,.309,-1.511,1.051,1.547,0,3),
        (.030,.215,.278,-1.447,1.044,1.547,-4,2)]
    out=[(n,*row) for n,row in zip(names,rows)]
    x=-.452
    for i,(w,d,h,c) in enumerate([(.028,.137,.194,2),(.034,.140,.226,1),
        (.022,.131,.207,0),(.032,.142,.240,3),(.026,.135,.202,4),(.031,.138,.220,5)]):
        out.append(('Warm_ShelfBook_%02d'%i,w,d,h,x+(.010 if i==5 else 0),1.326+(i%2)*.003,2.419,-3 if i==5 else 0,c))
        x+=w/2+([.034,.022,.032,.026,.031,.031][i])/2+.004
    return out


def structure():
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith((PREFIX,'Warm_BookSpineRule')):
            data=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
            if data and data.users==0 and isinstance(data,bpy.types.Mesh):bpy.data.meshes.remove(data)
    mats=[material(n,c) for n,c in PALETTE]
    paper=material('uncoated paper',(.70,.655,.53),.86)
    endpaper=material('shadowed endpaper',(.40,.355,.27),.84)
    for index,(name,w,d,h,x,y,z,lean,color) in enumerate(specs()):
        c=.0018 if w<.033 else .0022
        verts=[];faces=[]
        # Two cover boards, with slight overhang beyond the page block.
        for side in [-1,1]:
            v,f=box_geometry((side*(w-c)/2,d/2,h/2),(c,d,h))
            off=len(verts);verts+=v;faces += [tuple(a+off for a in p) for p in f]
        root=mesh(name,verts,faces,mats[color],bevel=.00055)
        root.rotation_euler=(0,math.radians(lean),0)
        rot=root.rotation_euler.to_matrix()
        min_z=min((rot@Vector(v)).z for v in [(-w/2,0,0),(w/2,0,0),(-w/2,0,h),(w/2,0,h)])
        root.location=(x,y,z-min_z+.00015)
        root['book_index']=index;root['book_dimensions']=(w,d,h);root['book_colour']=color
        # Rounded hollow spine shell: outer/inner profiles extruded vertically.
        profile=[]
        for j in range(17):
            xx=-w/2+w*j/16;profile.append((xx,-.0018-.0022*math.cos(xx/w*math.pi)))
        for j in reversed(range(17)):
            xx=-w/2+w*j/16;profile.append((xx,.0004-.0022*math.cos(xx/w*math.pi)))
        vv=[(xx,yy,zz) for zz in [.0005,h-.0005] for xx,yy in profile]
        n=len(profile);ff=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        ff += [tuple(reversed(range(n))),tuple(range(n,n*2))]
        mesh(PREFIX+'%02d spine'%index,vv,ff,mats[color],root,bevel=.00022)
        box(PREFIX+'%02d pages'%index,(0,(d+.008)/2,h/2),(w-2*c-.0018,d-.015,h-.007),paper,root,.00065)
        for side in [-1,1]:
            box(PREFIX+'%02d endpaper %s'%(index,side),(side*(w/2-c-.0003),(d+.007)/2,h/2),(.00045,d-.009,h-.005),endpaper,root,.0001)
    bpy.context.view_layer.update()
    sync_visibility()
    print('Built 15 books with separate covers, rounded spines, endpapers and page blocks')


def texture_materials():
    for name,col in PALETTE:
        m=bpy.data.materials[PREFIX+name];nodes,links=m.node_tree.nodes,m.node_tree.links
        bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        for n in list(nodes):
            if n!=bs and n.type!='OUTPUT_MATERIAL':nodes.remove(n)
        tex=nodes.new('ShaderNodeTexCoord')
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=650;noise.inputs['Detail'].default_value=2
        links.new(tex.outputs['Object'],noise.inputs['Vector'])
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.000055
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        bs.inputs['Roughness'].default_value=.73 if name in ['linen','sage','ivory'] else .56
    m=bpy.data.materials[PREFIX+'uncoated paper'];nodes,links=m.node_tree.nodes,m.node_tree.links
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for n in list(nodes):
        if n!=bs and n.type!='OUTPUT_MATERIAL':nodes.remove(n)
    tex=nodes.new('ShaderNodeTexCoord');wave=nodes.new('ShaderNodeTexWave')
    wave.wave_type='BANDS';wave.bands_direction='X';wave.wave_profile='SIN'
    wave.inputs['Scale'].default_value=3300;wave.inputs['Distortion'].default_value=.6;wave.inputs['Detail Scale'].default_value=15
    links.new(tex.outputs['Object'],wave.inputs['Vector'])
    ramp=nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(.54,.49,.39,1);ramp.color_ramp.elements[1].color=(.75,.70,.58,1)
    links.new(wave.outputs['Color'],ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.00004
    links.new(wave.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])


def text_mesh(name, body, center, size, mat, root, vertical=False, cover=False):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size
    curve.align_x='CENTER';curve.align_y='CENTER';curve.space_character=1.12
    curve.resolution_u=5;curve.extrude=.000018
    curve.space_line=1.2
    obj=bpy.data.objects.new(name,curve);root.users_collection[0].objects.link(obj)
    obj.parent=root;obj.location=center
    obj.rotation_euler=(Matrix(((0,-1,0),(0,0,-1),(1,0,0))).to_euler() if vertical else Euler((math.pi/2,0,0)))
    if vertical and root.rotation_euler.y < -1:obj.rotation_euler=Matrix(((0,1,0),(0,0,-1),(-1,0,0))).to_euler()
    if cover:obj.rotation_euler=Matrix(((0,0,1),(1,0,0),(0,1,0))).to_euler()
    curve.materials.append(mat)
    bpy.context.view_layer.update()
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    geo=bpy.data.meshes.new_from_object(evaluated)
    local=obj.matrix_local.copy()
    bpy.data.objects.remove(obj,do_unlink=True);bpy.data.curves.remove(curve)
    obj=bpy.data.objects.new(name,geo);root.users_collection[0].objects.link(obj)
    obj.parent=root;obj.matrix_local=local
    obj['shelf_book_refinement']='20260912'
    return obj


def finish():
    # Re-running finish replaces only its decorative additions.
    for o in list(bpy.context.scene.objects):
        if o.name.startswith(PREFIX) and o.get('book_decoration'):
            data=o.data;bpy.data.objects.remove(o,do_unlink=True)
            if data.users==0:bpy.data.meshes.remove(data)
    texture_materials()
    light=material('warm ivory ink',(.78,.72,.57),.68)
    dark=material('warm graphite ink',(.029,.032,.027),.75)
    ribbon=material('woven terracotta ribbon',(.30,.064,.032),.8)
    for name,*_ in specs():
        root=bpy.data.objects[name];index=root['book_index'];w,d,h=root['book_dimensions'];color=root['book_colour']
        ink=dark if color in [1,4,5] else light
        before=set(bpy.data.objects.keys())
        title=text_mesh(PREFIX+'%02d title'%index,TITLES[index],(0,-.00435,h*.56),min(.0108,w*.31),ink,root,True)
        # Book-specific size keeps long titles inside the spine margins.
        if title.dimensions.z>h*.62:title.scale*=h*.62/title.dimensions.z
        text_mesh(PREFIX+'%02d volume'%index,'%02d'%(index+1),(0,-.0044,.020),min(.009,w*.28),ink,root)
        for height in [.035,h-.025]:
            box(PREFIX+'%02d rule %.3f'%(index,height),(0,-.0044,height),(w*.60,.00012,.00055),ink,root,0)
        # Restrained cover typography reads on the two horizontal books too.
        words=TITLES[index].split();cut=max(1,len(words)//2)
        cover_title=' '.join(words[:cut])+'\n'+' '.join(words[cut:])
        ct=text_mesh(PREFIX+'%02d cover title'%index,cover_title,(w/2+.00012,d*.51,h*.69),h*.073,ink,root,cover=True)
        if ct.dimensions.y>d*.76:ct.scale*=d*.76/ct.dimensions.y
        text_mesh(PREFIX+'%02d edition'%index,'ARCHIVE EDITIONS',(w/2+.00012,d*.51,h*.15),h*.022,ink,root,cover=True)
        box(PREFIX+'%02d cover rule'%index,(w/2+.00012,d*.51,h*.46),(.00012,d*.58,.0005),ink,root,0)
        # Alternating thread colours at the head and tail of the binding.
        for k in range(12):
            xx=(-.5+(k+.5)/12)*(w-.007)
            for zz in [.0038,h-.0038]:
                box(PREFIX+'%02d headband %02d %.3f'%(index,k,zz),(xx,.007,zz),((w-.007)/12,.0018,.0013),ink if k%2 else ribbon,root,.0002)
        # Fine paper signatures on the fore-edge, subtle enough for a close view.
        for k in range(1,7):
            xx=(w-.007)*(-.5+k/7)
            box(PREFIX+'%02d signature %02d'%(index,k),(xx,d-.00335,h/2),(.00009,.00012,h-.012),bpy.data.materials[PREFIX+'shadowed endpaper'],root,0)
        if index in [1,4,7]:
            # A short ribbon emerges from the bottom, lying along the shelf.
            box(PREFIX+'%02d bookmark'%index,(.002,-.014,.0005),(.0045,.028,.00035),ribbon,root,.00012)
        for objname in set(bpy.data.objects.keys())-before:bpy.data.objects[objname]['book_decoration']=True
    bpy.context.view_layer.update()
    sync_visibility()
    print('Finished spine typography, cloth grain, paper edges, headbands and three bookmarks')

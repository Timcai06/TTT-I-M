"""Wood finishes and photograph mounting; source image UVs stay intact."""
from common import *

def wood_material(name,color,axis='X',end=False,rough=.54):
    m=mat(name,color,rough);nodes,links=m.node_tree.nodes,m.node_tree.links
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    if nodes.get('Wood colour'):
        if end:
            ramp=nodes['Wood colour'];ramp.color_ramp.elements[0].color=(*(v*.94 for v in color),1);ramp.color_ramp.elements[1].color=(*(v*1.05 for v in color),1)
            for n in nodes:
                if n.type=='TEX_WAVE':n.inputs['Scale'].default_value=6;n.inputs['Distortion'].default_value=2
        return m
    tex=nodes.new('ShaderNodeTexCoord');scale=nodes.new('ShaderNodeVectorMath');scale.operation='MULTIPLY'
    scale.inputs[1].default_value=(1.2,26,8) if axis=='X' else (26,1.2,8)
    links.new(tex.outputs['Object'],scale.inputs[0])
    if end:
        pattern=nodes.new('ShaderNodeTexWave');pattern.wave_type='RINGS';pattern.rings_direction=axis
        pattern.inputs['Scale'].default_value=6;pattern.inputs['Distortion'].default_value=2
        links.new(tex.outputs['Object'],pattern.inputs['Vector']);fac=pattern.outputs['Fac']
    else:
        pattern=nodes.new('ShaderNodeTexNoise');pattern.inputs['Scale'].default_value=2.2;pattern.inputs['Detail'].default_value=3;pattern.inputs['Roughness'].default_value=.62
        links.new(scale.outputs[0],pattern.inputs['Vector']);fac=pattern.outputs['Fac']
    ramp=nodes.new('ShaderNodeValToRGB');ramp.name='Wood colour'
    ramp.color_ramp.elements[0].position=.12;ramp.color_ramp.elements[0].color=(*(v*(.94 if end else .76) for v in color),1)
    ramp.color_ramp.elements[1].position=.87;ramp.color_ramp.elements[1].color=(*(v*(1.05 if end else 1.20) for v in color),1)
    links.new(fac,ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color'])
    grain(m,(1,140,25) if axis=='X' else (140,1,25),.16,.000065,1)
    bs.inputs['Coat Weight'].default_value=.06;bs.inputs['Coat Roughness'].default_value=.38
    return m

def timber():
    desk=wood_material('oiled walnut desk',(.145,.079,.039),'X',rough=.45)
    desk_end=wood_material('walnut desk endgrain',(.137,.072,.034),'X',True,.53)
    shelf=wood_material('satin walnut shelving',(.142,.085,.046),'X',rough=.57)
    shelf_end=wood_material('shelf endgrain',(.132,.077,.040),'X',True,.59)
    chair=wood_material('waxed walnut chair',(.12,.066,.033),'X',rough=.50)
    chair_end=wood_material('chair endgrain',(.108,.060,.030),'X',True,.58)
    floors=[]
    for i,factor in enumerate([.90,.97,1.0,1.045,1.085]):
        col=tuple(v*factor for v in (.177,.113,.066))
        floors.append((wood_material('oak floor %d'%i,col,'Y',rough=.66),wood_material('oak floor end %d'%i,col,'Y',True,.70)))
    targets=[]
    for o in list(bpy.context.scene.objects):
        if not o.visible_get() or o.type!='MESH':continue
        name=o.name
        if name.startswith('Floorboard_'):
            row=int(name.split('_')[1]);part=int(name.split('_')[2])
            cuts=[-1.548,-.60,.48,1.548] if row%3==0 else ([-1.548,-1.02,.13,1.548] if row%3==1 else [-1.548,-.28,.81,1.548])
            a,b=cuts[part],cuts[part+1];m,end=floors[(row*7+part*3)%5]
            box(name,(-1.7+row*.2,(a+b)/2,.010),(.198,b-a-.002,.025),m,bevel=.00065)
            targets.append((o,m,end,1))
        elif name=='Desk slab':targets.append((o,desk,desk_end,0))
        elif name.startswith('Shelf plank'):targets.append((o,shelf,shelf_end,0))
        elif name.startswith('Chair back slat') or name in ['Chair seat','Room_StoolSeat']:targets.append((o,chair,chair_end,0))
    for o,m,end,axis in targets:
        assign(o,m);o.data.materials.append(end)
        normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
        for face in o.data.polygons:
            normal=(normal_matrix@face.normal).normalized()
            if abs(normal[axis])>.88:face.material_index=1
    print('Timber:',len(targets),'parts, directional grain, endgrain and staggered floor joints')

def photographs():
    steel=mat('satin nickel photo clips',(.30,.33,.32),.33,.82);grain(steel,(1,8,1),.1,.000018,340)
    dark=mat('clip hinge recess',(.028,.032,.03),.63,.3)
    paper=mat('cotton photo mount',(.72,.692,.623),.88);grain(paper,amount=.17,distance=.000035,frequency=950)
    for i in range(1,5):
        mount=bpy.data.objects['PhotoMount_%02d'%i];photo=bpy.data.objects['ArchivePhoto_%02d'%i]
        pivot=mount.parent;y0=pivot.matrix_world.translation.y;zt=pivot.matrix_world.translation.z
        angle=math.radians([-.65,.40,-.35,.75][i-1])
        def curve(p):
            u=(p.y-y0)/.175;t=max(0,min(1,(zt-p.z)/.515))
            bow=-.0025*t*t*(.45+.55*math.cos(u*math.pi/2)**2)-.0012*u*t*math.sin(i)
            dy=p.y-y0;dz=p.z-zt
            return (p.x+bow,y0+dy*math.cos(angle)-dz*math.sin(angle),zt+dy*math.sin(angle)+dz*math.cos(angle))
        deform(mount,curve);deform(photo,curve);assign(mount,paper)
        for mod in mount.modifiers:
            if mod.type=='SOLIDIFY':mod.thickness=.00045
        # Retain the source photo, UVs and its existing ink node graph.
        m=photo.data.materials[0]
        if not m.name.startswith(PREFIX):
            m=m.copy();m.name=PREFIX+'photo ink %02d'%i;photo.data.materials[0]=m
        bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.68;bs.inputs['Specular IOR Level'].default_value=.23
        clip=bpy.data.objects['PhotoClip_%02d'%i]
        box(clip.name,(1.725,y0,1.841),(.0025,.027,.036),steel,bevel=.0008)
        box(PREFIX+'clip back jaw %02d'%i,(1.738,y0,1.834),(.0025,.027,.022),steel,clip,bevel=.0008)
        tube(PREFIX+'clip hinge %02d'%i,[(1.733,y0-.015,1.850),(1.733,y0+.015,1.850)],.0032,dark,clip,20)
        pts=[(1.726,y0-.008,1.846),(1.718,y0-.009,1.864),(1.716,y0-.006,1.874),(1.716,y0+.006,1.874),(1.718,y0+.009,1.864),(1.726,y0+.008,1.846)]
        tube(PREFIX+'clip spring loop %02d'%i,pts,.00115,steel,clip,10)
    print('Photo wall: four spring clips, paired paper deformation and original photo UVs')

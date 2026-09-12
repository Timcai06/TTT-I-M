"""Staged, deterministic refinement of the shelf pothos in the open source scene.

Invoke stage_pot(), stage_growth(), stage_surface() separately to review progress.
Does not save, export, alter room lighting or move the original plant anchor.
"""
import bpy
import math
import random
from mathutils import Vector

P = Vector((-1.46, 1.11, 2.08))
COLLECTION = '03 Life - objects'


def material(name, color, roughness):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    return m


def mesh_object(name, vertices, faces, mat, uv=None):
    mesh = bpy.data.meshes.new(name + ' geometry')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.get(name)
    if obj:
        old = obj.data
        obj.data = mesh
        if old.users == 0:
            bpy.data.meshes.remove(old)
    else:
        obj = bpy.data.objects.new(name, mesh)
        bpy.data.collections[COLLECTION].objects.link(obj)
    obj.location = P
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    if uv:
        layer = mesh.uv_layers.new(name='UVMap')
        for loop in mesh.loops:
            layer.data[loop.index].uv = uv[loop.vertex_index]
    obj['plant_refinement'] = 'pothos-20260912'
    return obj


def tube(name, points, radius, mat, sides=8):
    vertices, faces = [], []
    for i, pt in enumerate(points):
        tangent = (points[min(i+1, len(points)-1)] - points[max(0, i-1)]).normalized()
        side = tangent.cross(Vector((0, 0, 1)))
        if side.length < .001:
            side = tangent.cross(Vector((0, 1, 0)))
        side.normalize()
        up = tangent.cross(side).normalized()
        r = radius * (1 - .65 * i / (len(points)-1))
        for j in range(sides):
            a = math.tau * j / sides
            vertices.append(tuple(pt + r * (side * math.cos(a) + up * math.sin(a))))
        if i:
            for j in range(sides):
                a = (i-1)*sides+j; b = (i-1)*sides+(j+1)%sides
                faces.append((a, b, b+sides, a+sides))
    faces.extend([tuple(reversed(range(sides))), tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh_object(name, vertices, faces, mat)


def stage_pot():
    ceramic = material('Plant / matte charcoal ceramic', (.040, .037, .031), .65)
    nodes, links = ceramic.node_tree.nodes, ceramic.node_tree.links
    if not nodes.get('Kiln microtexture'):
        noise = nodes.new('ShaderNodeTexNoise'); noise.name = 'Kiln microtexture'
        noise.inputs['Scale'].default_value = 170
        bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .16
        bump.inputs['Distance'].default_value = .00012
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], next(n for n in nodes if n.type == 'BSDF_PRINCIPLED').inputs['Normal'])
    profile = [(.00001,-.085),(.075,-.085),(.082,-.081),(.084,-.076),(.096,.020),
               (.107,.066),(.110,.073),(.111,.078),(.109,.083),(.106,.085),
               (.102,.083),(.099,.078),(.098,.072),(.087,-.057),(.078,-.065),(.00001,-.065)]
    vertices = [(r*math.cos(math.tau*j/96), r*math.sin(math.tau*j/96), z) for r,z in profile for j in range(96)]
    faces = [(i*96+j,i*96+(j+1)%96,(i+1)*96+(j+1)%96,(i+1)*96+j) for i in range(len(profile)-1) for j in range(96)]
    pot = mesh_object('Plant pot', vertices, faces, ceramic)
    # Equal-weight profile tangents avoid a dark smoothing band above the foot.
    normals=[]
    for i,(r,z) in enumerate(profile):
        previous=Vector((r-profile[max(0,i-1)][0],z-profile[max(0,i-1)][1])).normalized()
        following=Vector((profile[min(i+1,len(profile)-1)][0]-r,profile[min(i+1,len(profile)-1)][1]-z)).normalized()
        tangent=(previous+following).normalized()
        normals.extend((tangent.y*math.cos(math.tau*j/96),tangent.y*math.sin(math.tau*j/96),-tangent.x) for j in range(96))
    pot.data.normals_split_custom_set_from_vertices(normals)
    earth = material('Plant / dark potting soil', (.025,.015,.009), .95)
    nodes, links = earth.node_tree.nodes, earth.node_tree.links
    if not nodes.get('Soil granules'):
        noise=nodes.new('ShaderNodeTexNoise'); noise.name='Soil granules';noise.inputs['Scale'].default_value=65
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.65;bump.inputs['Distance'].default_value=.0014
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],next(n for n in nodes if n.type == 'BSDF_PRINCIPLED').inputs['Normal'])
    vertices=[(0,0,.057)]+[(.094*math.cos(math.tau*j/96),.094*math.sin(math.tau*j/96),.055+.0008*math.sin(j*2.3)) for j in range(96)]
    mesh_object('Plant soil',vertices,[(0,j+1,(j+1)%96+1) for j in range(96)],earth)


def show_plant():
    area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
    space = area.spaces.active
    for obj in bpy.context.scene.objects:
        if obj.name.startswith('Plant '):
            obj.hide_set(False)
            if space.local_view:
                obj.local_view_set(space, True)
    bpy.context.view_layer.update()


def leaf(name, base, forward, normal, length, half_width, mat, seed):
    rng = random.Random(seed)
    forward = forward.normalized()
    normal = (normal - forward * normal.dot(forward)).normalized()
    side = forward.cross(normal).normalized()
    vertices, faces, uv = [], [], []
    asymmetry = rng.uniform(-.14, .14)
    twist = rng.uniform(-.009, .009)
    rows, cols = 20, 10
    for i in range(rows+1):
        t = i/rows
        width = half_width * max(.001, math.sin(math.pi*t))**.68 * (1.24-.48*t)
        for j in range(cols+1):
            u = j/cols*2-1
            # Basal lobes fall behind the petiole notch; the tip tapers gently.
            lobe = length*.23*math.sin(math.pi*min(1,t/.48))*max(0,1-t/.48)*abs(u)**1.5
            along = length*t-lobe
            lateral = width*u*(1+asymmetry*u)
            arch = length*.095*math.sin(math.pi*t)-length*.11*t**3
            curl = -length*.05*abs(u)**1.8*math.sin(math.pi*t)
            ripple = length*.008*math.sin(5*math.pi*t+seed)*abs(u)**3*math.sin(math.pi*t)
            point = base+forward*along+side*lateral+normal*(arch+curl+ripple+twist*u*math.sin(math.pi*t))
            vertices.append(tuple(point));uv.append((j/cols,t))
    for i in range(rows):
        for j in range(cols):
            a=i*(cols+1)+j
            faces.append((a,a+1,a+cols+2,a+cols+1))
    obj=mesh_object(name,vertices,faces,mat,uv)
    solid=obj.modifiers.new('Leaf lamina 0.35 mm','SOLIDIFY')
    solid.thickness=.00035;solid.offset=0
    obj['botanical_role']='leaf';obj['leaf_seed']=seed
    return obj


def stage_growth():
    # All replacements belong to this one plant; the source baseline is retained
    # outside the .blend before running the stage. No scene-wide material edits.
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('Plant leaf','Plant stem','Plant petiole','Plant bud')):
            old=obj.data
            bpy.data.objects.remove(obj,do_unlink=True)
            if old.users==0 and isinstance(old,bpy.types.Mesh):bpy.data.meshes.remove(old)
    greens=[material('Plant / leaf '+str(i),c,.43) for i,c in enumerate([
        (.025,.095,.018),(.040,.125,.023),(.058,.15,.03),(.019,.075,.018)])]
    stem=material('Plant / living vine',(.044,.078,.016),.62)
    rng=random.Random(9212)
    index=0
    # Crown: six independently rooted shoots, different heights and azimuths.
    for k in range(6):
        angle=k*2.399+.35
        radial=Vector((math.cos(angle),math.sin(angle),0))
        sideways=Vector((-math.sin(angle),math.cos(angle),0))
        height=[.17,.22,.14,.195,.165,.12][k]
        def shoot(t):
            return radial*(.012+.11*t*t)+sideways*(.015*math.sin(math.pi*t))+Vector((0,0,.057+height*t-.025*t*t))
        tube('Plant stem crown %02d'%k,[shoot(i/24) for i in range(25)],.0021,stem)
        for n,t in enumerate([.38,.68,.96]):
            pt=shoot(t)
            a=angle+(-1 if n%2 else 1)*.6
            outward=Vector((math.cos(a),math.sin(a),0))
            base=pt+outward*(.025+n*.006)+Vector((0,0,.012))
            tube('Plant petiole %02d'%index,[pt,pt.lerp(base,.5)+Vector((0,0,.006)),base],.0011,stem)
            length=rng.uniform(.09,.135)*(1.0 if n<2 else .85)
            leaf('Plant leaf %02d'%index,base,outward+Vector((0,0,-.12-n*.12)),Vector((0,0,1)),length,length*rng.uniform(.34,.40),greens[(index+k)%4],index)
            index+=1
    # Vines spill over the front and sides of the shelf, not through the wall.
    for k,(angle,drop,count) in enumerate([(-1.60,.54,7),(-.90,.40,6),(-2.25,.32,5),(-.35,.20,4)]):
        radial=Vector((math.cos(angle),math.sin(angle),0))
        sideways=Vector((-math.sin(angle),math.cos(angle),0))
        # Clear the actual shelf bounds before descending below its top.
        edge=min((.36/radial.x if radial.x>0 else -.27/radial.x), -.32/radial.y)
        def vine(t):
            r=.012+(edge+.08)*math.sin(min(t/.65,1)*math.pi/2)
            z=.057+.105*math.sin(min(t/.55,1)*math.pi)-drop*(max(0,t-.5)/.5)**1.3
            return radial*r+sideways*(.016*math.sin(t*math.tau+k)*t) + Vector((0,0,z))
        tube('Plant stem trailing %02d'%k,[vine(i/40) for i in range(41)],.0024,stem)
        for n in range(count):
            t=.18+.79*n/(count-1)
            pt=vine(t)
            sign=1 if n%2 else -1
            outward=(radial*.7+sideways*sign*.7).normalized()
            base=pt+outward*rng.uniform(.022,.037)+Vector((0,0,.009))
            tube('Plant petiole %02d'%index,[pt,pt.lerp(base,.55)+Vector((0,0,.005)),base],.0010,stem)
            direction=(outward*(.85-.40*t)+Vector((0,0,-.3-.65*t))).normalized()
            normal=(radial+Vector((0,0,.65))).normalized()
            length=rng.uniform(.095,.135)*(1-.20*t)
            leaf('Plant leaf %02d'%index,base,direction,normal,length,length*rng.uniform(.34,.40),greens[(index+k)%4],index)
            index+=1
    show_plant()
    print('Growth rebuilt:',index,'leaves on six crown shoots and four trailing vines')


def stage_surface():
    for i in range(4):
        m=bpy.data.materials['Plant / leaf '+str(i)]
        nodes,links=m.node_tree.nodes,m.node_tree.links
        bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        for n in list(nodes):
            if n!=bs and n.type!='OUTPUT_MATERIAL':nodes.remove(n)
        def math_node(op,a,b=None):
            n=nodes.new('ShaderNodeMath');n.operation=op
            for k,value in enumerate([a,b]):
                if value is None:continue
                if isinstance(value,(int,float)):n.inputs[k].default_value=value
                else:links.new(value,n.inputs[k])
            return n.outputs[0]
        uv=nodes.new('ShaderNodeTexCoord');uv.label='Leaf-local UV, same veins under bending'
        sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv.outputs['UV'],sep.inputs[0])
        across=math_node('ABSOLUTE',math_node('SUBTRACT',sep.outputs['X'],.5))
        midrib=math_node('EXPONENT',math_node('MULTIPLY',across,-185))
        phase=math_node('MULTIPLY',math_node('SUBTRACT',math_node('MULTIPLY',sep.outputs['Y'],9),math_node('MULTIPLY',across,6)),math.tau)
        ribs=math_node('POWER',math_node('MAXIMUM',math_node('SINE',phase),0),32)
        ribs=math_node('MULTIPLY',ribs,math_node('SUBTRACT',1,math_node('MULTIPLY',across,1.8)))
        veins=math_node('MAXIMUM',math_node('MULTIPLY',midrib,.36),math_node('MULTIPLY',ribs,.12))
        noise=nodes.new('ShaderNodeTexNoise');noise.name='Leaf pigment';noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=2
        links.new(uv.outputs['UV'],noise.inputs['Vector'])
        ramp=nodes.new('ShaderNodeValToRGB');ramp.name='Chlorophyll variation'
        base=tuple(m.diffuse_color[:3])
        ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(*(v*.72 for v in base),1)
        ramp.color_ramp.elements[1].position=.85;ramp.color_ramp.elements[1].color=(*(v*1.15 for v in base),1)
        links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.name='Fine veins under the cuticle'
        links.new(veins,mix.inputs[0]);links.new(ramp.outputs['Color'],mix.inputs[1])
        mix.inputs[2].default_value=(base[0]*1.65,base[1]*1.38,base[2]*1.4,1)
        links.new(mix.outputs[0],bs.inputs['Base Color'])
        rough=nodes.new('ShaderNodeMapRange');rough.inputs['From Min'].default_value=0;rough.inputs['From Max'].default_value=1
        rough.inputs['To Min'].default_value=.43;rough.inputs['To Max'].default_value=.55
        links.new(noise.outputs['Fac'],rough.inputs['Value']);links.new(rough.outputs['Result'],bs.inputs['Roughness'])
        bump=nodes.new('ShaderNodeBump');bump.name='Vein relief 0.07 mm';bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.00007
        links.new(math_node('ADD',math_node('MULTIPLY',midrib,.6),math_node('MULTIPLY',ribs,.3)),bump.inputs['Height'])
        links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        bs.inputs['Specular IOR Level'].default_value=.30
        bs.inputs['Subsurface Weight'].default_value=.035
        bs.inputs['Subsurface Radius'].default_value=(.12,.30,.08)
        bs.inputs['Subsurface Scale'].default_value=.001
        bs.inputs['Coat Weight'].default_value=.025
        bs.inputs['Coat Roughness'].default_value=.42
    # Small, deterministic soil particles, kept within the recessed soil disc.
    rng=random.Random(154)
    perlite=material('Plant / mineral soil grains',(.20,.17,.115),.93)
    for i in range(22):
        a=rng.uniform(0,math.tau);r=.088*math.sqrt(rng.random());size=rng.uniform(.0009,.002)
        center=Vector((r*math.cos(a),r*math.sin(a),.056))
        verts=[tuple(center+Vector((x*size,y*size,z*size*.55))) for x,y,z in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]]
        faces=[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]
        mesh_object('Plant soil grain %02d'%i,verts,faces,perlite)
    show_plant()
    print('Surface refinement complete: UV veins, restrained wax, pigment variation and recessed soil detail')

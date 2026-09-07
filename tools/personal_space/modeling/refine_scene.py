"""Near-field geometry, PBR surfaces and light treatment for the archive room."""
import math
import bpy
from mathutils import Vector
from primitives import box, cylinder, material, rod
from surface_materials import surface, projected_uv


def tube(name, points, radius, mat):
    bpy.ops.object.select_all(action='DESELECT')
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, xyz in zip(spline.points, points):
        p.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def lathe(name, center, profile, mat, segments=32):
    verts = [(center[0]+r*math.cos(i*math.tau/segments), center[1]+r*math.sin(i*math.tau/segments), center[2]+z) for r,z in profile for i in range(segments)]
    faces = [(j*segments+i, j*segments+(i+1)%segments, (j+1)*segments+(i+1)%segments, (j+1)*segments+i) for j in range(len(profile)-1) for i in range(segments)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    projected_uv(obj, 3)
    return obj


def apply(scene, output):
    textures = output/'textures'
    walnut = surface('Walnut_oiled', 'wood', (.10,.045,.019), (.36,.19,.08), textures, roughness=.40, size=1024)
    plaster = surface('Plaster_warm', 'plaster', (.29,.27,.23), (.46,.43,.37), textures, roughness=.88)
    linen = surface('Linen_natural', 'linen', (.33,.29,.22), (.57,.52,.42), textures, roughness=.92)
    paper = surface('Paper_fiber', 'paper', (.68,.62,.50), (.86,.81,.69), textures, roughness=.90)
    rug = surface('Rug_archive', 'rug', (.075,.045,.028), (.30,.20,.12), textures, roughness=.96)
    ceramic = surface('Ceramic_speckle', 'plaster', (.20,.17,.13), (.40,.34,.26), textures, roughness=.38)
    metal = bpy.data.materials['Charcoal powder coat']
    metal.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .48
    silver = bpy.data.materials['Brushed hardware']
    red = bpy.data.materials['Archive red']
    for obj in list(scene.objects):
        if obj.type != 'MESH' or not obj.data.materials:
            continue
        old = obj.data.materials[0].name
        replacement = None
        if old.startswith(('Walnut', 'Warm wood', 'Floor tone')): replacement = walnut
        elif old.startswith('Limestone'): replacement = plaster
        elif old.startswith('Notebook linen'): replacement = linen
        elif old == 'Warm paper': replacement = paper
        elif old.startswith('Rug •'): replacement = rug
        if replacement:
            obj.data.materials[0] = replacement
            projected_uv(obj, 1.8 if replacement == walnut else 3)
            if obj.name == 'Rug':
                for uv in obj.data.uv_layers.active.data:
                    uv.uv = ((uv.uv.x/3+0.635)/1.27, (uv.uv.y/3+1.17)/2.34)

    # Preserve named animation nodes; fine seams and corners move with the cover.
    hinge = bpy.data.objects['NotebookHinge']
    for x in [.009,.281]:
        box('Notebook_stitch', (x,0,.0068), (.0016,.334,.0007), paper, 0, hinge)
    for y in [-.167,.167]:
        box('Notebook_stitch', (.145,y,.0068), (.272,.0016,.0007), paper, 0, hinge)
    for i in range(12):
        box('Notebook_fine_page', (-.58,.706,.839+i*.0018), (.269,.0007,.00045), linen, 0)
    rod('Pen brass nib', (-.30,.75,.832), (-.302,.731,.832), .003, silver)
    rod('Pen clip', (-.277,.955,.839), (-.274,.990,.839), .0015, silver)

    # Ceramic cup: modeled inner wall, lip, liquid surface, and curved handle.
    bpy.data.objects.remove(bpy.data.objects['Life cup'], do_unlink=True)
    lathe('Life cup ceramic', (-1.37,1.07,1.107), [(0,0),(.038,0),(.046,.015),(.050,.113),(.047,.12),(.043,.113),(.039,.02),(0,.02)], ceramic)
    coffee = material('Coffee', (.026,.012,.006), roughness=.21)
    cylinder('Life coffee', (-1.37,1.07,1.201), .042, .001, coffee, 32)
    tube('Life cup handle', [(-1.326+.037*math.sin(t),1.07,1.168+.039*math.cos(t)) for t in [i*math.pi/24 for i in range(25)]], .006, ceramic)

    # Hollow task shade, pale interior, socket and pivot hardware.
    bpy.data.objects.remove(bpy.data.objects['Lamp shade'], do_unlink=True)
    lathe('Lamp shade shell', (1,1.14,1.375), [(.082,0),(.083,.006),(.040,.105),(.025,.113),(.025,.109),(.036,.101),(.078,.006),(.082,0)], metal)
    ivory = material('Lamp enamel inside', (.70,.65,.53), roughness=.3)
    lathe('Lamp reflector', (1,1.14,1.375), [(.077,.007),(.035,.100)], ivory)
    bulb = material('Lamp bulb', (.9,.78,.48), roughness=.22)
    bs = bulb.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Emission Color'].default_value = (1,.66,.32,1)
    bs.inputs['Emission Strength'].default_value = 2
    lathe('Lamp bulb glass', (1,1.14,1.394), [(0,0),(.018,.005),(.023,.022),(.015,.038),(.01,.049),(0,.05)], bulb, 24)
    for x,y,z in [(1.16,1.24,.86),(1.31,1.22,1.23),(1,1.14,1.47)]:
        rod('Lamp pivot screw', (x,y-.027,z), (x,y+.027,z), .009, silver)
    start, end = Vector((1.17,1.205,.93)), Vector((1.255,1.194,1.13))
    direction = (end-start).normalized()
    side = direction.cross(Vector((0,1,0))).normalized()
    other = direction.cross(side)
    tube('Lamp tension spring', [tuple(start+(end-start)*i/120+.007*(side*math.cos(i*math.tau/10)+other*math.sin(i*math.tau/10))) for i in range(121)], .0018, silver)

    # Veneer slats and joinery make the chair legible in near views.
    bpy.data.objects.remove(bpy.data.objects['Chair back'], do_unlink=True)
    for i in range(5):
        plank = box('Chair back slat', (.22,-.52,.59+i*.078), (.475,.035,.07), walnut, .008)
        projected_uv(plank, 1.8)
        for x in [.015,.425]:
            rod('Chair slat rivet', (x,-.54,.59+i*.078),(x,-.546,.59+i*.078),.004,silver)
    for i in range(8):
        z=.105+i*.081
        for x in [.691,1.22]:
            rod('Drawer face rivet',(x,.592,z),(x,.587,z),.0025,silver)
    for y in [.725,1.06]:
        for x in [-.712,-.449]:
            box('Notebook corner detail', (x,y,.830), (.017,.017,.003), silver,.002)

    # Replace proxy cubes with tapered, curved leaves, veins and trailing stems.
    for obj in list(scene.objects):
        if obj.name.startswith('Plant leaf'):
            bpy.data.objects.remove(obj, do_unlink=True)
    greens = [material('Leaf_'+str(i),(.035+i*.012,.075+i*.014,.025+i*.007),roughness=.55) for i in range(3)]
    for i in range(19):
        angle=i*2.399
        falling=i>10
        base=Vector((-1.46,1.11,2.18))
        tip=base+Vector((math.cos(angle)*(.18 if not falling else .22),math.sin(angle)*.18,-(i-9)*.065 if falling else .10+(i%3)*.02))
        tube('Plant stem', [tuple(base),tuple((base+tip)/2+Vector((0,0,.04))),tuple(tip)], .002, greens[i%3])
        forward=Vector((math.cos(angle),math.sin(angle),-.45 if falling else .22)).normalized()
        side=forward.cross(Vector((0,0,1))).normalized()
        vertices=[]
        for k in range(9):
            t=k/8
            mid=tip+forward*t*.16+Vector((0,0,.022*math.sin(t*math.pi)))
            width=.045*math.sin(math.pi*t)**.7
            vertices.extend([tuple(mid-side*width),tuple(mid+Vector((0,0,.006*math.sin(math.pi*t)))),tuple(mid+side*width)])
        faces=[(k*3+j,k*3+j+1,(k+1)*3+j+1,(k+1)*3+j) for k in range(8) for j in range(2)]
        mesh=bpy.data.meshes.new('Leaf curved surface');mesh.from_pydata(vertices,[],faces);mesh.update()
        leaf=bpy.data.objects.new('Plant leaf',mesh);bpy.context.collection.objects.link(leaf);mesh.materials.append(greens[i%3])
        for polygon in mesh.polygons: polygon.use_smooth=True
        tube('Plant leaf vein',[tuple(tip),tuple(tip+forward*.15)],.0007,greens[(i+1)%3])

    for x in [-1.76,1.76]:
        box('Wall baseboard',(x,0,.075),(.025,3.05,.10),metal,.003)
    box('Back baseboard',(0,1.475,.075),(3.5,.025,.10),metal,.003)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.12
    bpy.data.lights['Window softbox'].energy=145
    bpy.data.lights['Front bounce'].energy=35
    bpy.data.lights['Task light'].energy=14
    scene.cycles.samples=64
    scene.view_settings.exposure=-.25
    # Useful default when opened in Blender; user still controls rendered preview.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.shading.type='MATERIAL'
                area.spaces.active.shading.use_scene_lights=True
                area.spaces.active.shading.use_scene_world=True
    collections = {}
    for obj in list(scene.objects):
        name = obj.name
        if obj.type in ('CAMERA','LIGHT'): category='07 Cameras and lighting'
        elif name.startswith(('Notebook','Pen')): category='02 About - notebook'
        elif name.startswith(('Archive','Drawer','Cabinet')) and not name.startswith('ArchivePhoto'): category='06 Work - archive'
        elif name.startswith(('Photo','ArchivePhoto','Back wall frame','Back wall mount','Back wall graphic')): category='04 Frame - photographs'
        elif name.startswith(('Life','Plant','Book')): category='03 Life - objects'
        elif name.startswith(('Monitor','Keyboard','Key','Mouse','External','Signal')): category='05 Stack - workstation'
        elif name.startswith(('Floor','Wall','Back wall','Right wall','Window','Radiator','Rug','Back baseboard')): category='00 Architecture'
        else: category='01 Furniture and lamp'
        if category not in collections:
            collection=bpy.data.collections.new(category)
            scene.collection.children.link(collection)
            collections[category]=collection
        for collection in list(obj.users_collection): collection.objects.unlink(obj)
        collections[category].objects.link(obj)
    return {'stage':'material-study-02','textureSource':'deterministic procedural PBR','visualAcceptance':'pending tim'}


def batch_static(scene):
    """Only the export scene is batched; the saved Blender file stays editable."""
    groups={}
    for obj in list(scene.objects):
        if obj.type!='MESH' or obj.parent or obj.name.startswith(('Notebook','Archive','Drawer','Photo','Monitor','LifeEnvelope','LifeMemory')):
            continue
        if len(obj.data.materials)==1:
            groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name, objects in groups.items():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        bpy.context.object.name='Static__'+name

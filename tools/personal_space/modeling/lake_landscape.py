"""Editable terrain, instanced conifers and water for the rear-window vista.

No reference-image billboards: all silhouettes have depth. The six tree meshes
are shared by instances; close branches remain individually editable meshes.
"""
import math
import random

import bpy
from mathutils import Vector, noise

COLLECTION = '15 Lake landscape - terrain and forest'
TAG = 'lake_landscape_v2'


def attach(obj):
    col = bpy.data.collections.get(COLLECTION)
    if not col:
        col = bpy.data.collections.new(COLLECTION)
        bpy.context.scene.collection.children.link(col)
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    col.objects.link(obj)
    obj[TAG] = True
    return obj


def mesh_object(name, vertices, faces, materials):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    attach(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat[TAG] = True
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat, shader


def ground_height(x, y):
    # Elevated cabin above an irregular lake, with high ridges in the distance.
    n = noise.multi_fractal(Vector((x * .023, y * .023, 2.7)), 1.1, 2.1, 4)
    ridge = 0
    for cx, cy, height, sx, sy in [
        (-165, 270, 80, 85, 90), (-70, 315, 105, 62, 85),
        (30, 345, 88, 58, 95), (120, 300, 102, 78, 85),
        (240, 360, 115, 100, 110), (-280, 365, 100, 110, 100),
    ]:
        ridge += height * math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
    shore = ((x + 7 * math.sin(y*.03))/43)**2 + ((y-103)/75)**2
    basin = -9 * max(0, 1 - shore)
    foreground = 12 * math.exp(-y/20)
    island = 8 * math.exp(-((x+14)/8)**2-((y-102)/13)**2)
    return -13.0 + foreground + basin + island + ridge * (.82 + n*.075) + n*1.25


def ground_material():
    mat, shader = material('Lake / moss, earth and weathered rock', (.10, .125, .07), .95)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coords = nodes.new('ShaderNodeTexCoord')
    broad = nodes.new('ShaderNodeTexNoise')
    broad.inputs['Scale'].default_value = .16
    broad.inputs['Detail'].default_value = 5
    links.new(coords.outputs['Object'], broad.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (.025, .045, .018, 1)
    ramp.color_ramp.elements[1].color = (.24, .20, .13, 1)
    links.new(broad.outputs['Fac'], ramp.inputs['Fac'])
    geometry = nodes.new('ShaderNodeNewGeometry')
    axis = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geometry.outputs['Normal'], axis.inputs[0])
    slope = nodes.new('ShaderNodeMapRange')
    slope.inputs['From Min'].default_value = .45
    slope.inputs['From Max'].default_value = .86
    links.new(axis.outputs['Z'], slope.inputs['Value'])
    mix = nodes.new('ShaderNodeMixRGB')
    mix.inputs[1].default_value = (.24, .25, .23, 1)
    links.new(slope.outputs['Result'], mix.inputs[0])
    links.new(ramp.outputs['Color'], mix.inputs[2])
    links.new(mix.outputs[0], shader.inputs['Base Color'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Distance'].default_value = .10
    bump.inputs['Strength'].default_value = .28
    links.new(broad.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def water():
    mat, shader = material('Lake / reflective water and fine wind ripples', (.065, .14, .16), .18)
    shader.inputs['IOR'].default_value = 1.333
    shader.inputs['Transmission Weight'].default_value = .30
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coords = nodes.new('ShaderNodeTexCoord')
    stretch = nodes.new('ShaderNodeVectorMath'); stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (.6, 3.2, 1)
    links.new(coords.outputs['Object'], stretch.inputs[0])
    texture = nodes.new('ShaderNodeTexNoise')
    texture.inputs['Scale'].default_value = 1.6
    texture.inputs['Detail'].default_value = 3
    links.new(stretch.outputs[0], texture.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Distance'].default_value = .012
    bump.inputs['Strength'].default_value = .16
    links.new(texture.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    obj = mesh_object('Lake_WaterSurface', [(-125, 15, -11.2), (125, 15, -11.2),
                      (125, 215, -11.2), (-125, 215, -11.2)], [(0, 1, 2, 3)], [mat])
    obj['role'] = 'horizontal reflective lake, clipped naturally by terrain shoreline'


def tube(vertices, faces, material_indices, a, b, radius, tip, material_index=0, sides=5):
    a, b = Vector(a), Vector(b)
    direction = (b-a).normalized()
    tangent = direction.cross(Vector((0, 0, 1)))
    if tangent.length < .01:
        tangent = direction.cross(Vector((1, 0, 0)))
    tangent.normalize()
    bitangent = direction.cross(tangent).normalized()
    start = len(vertices)
    for point, width in ((a, radius), (b, tip)):
        for i in range(sides):
            offset = tangent*math.cos(i*math.tau/sides) + bitangent*math.sin(i*math.tau/sides)
            vertices.append(tuple(point + offset*width))
    for i in range(sides):
        faces.append((start+i, start+(i+1)%sides, start+(i+1)%sides+sides, start+i+sides))
        material_indices.append(material_index)
    faces.append(tuple(start+sides+i for i in range(sides)))
    material_indices.append(material_index)


def pine_mesh(seed, bark, foliage):
    rng = random.Random(seed)
    vertices, faces, indices = [], [], []
    tube(vertices, faces, indices, (0,0,0), (.015,.01,1), .028, .002, sides=7)
    for tier in range(11):
        z = .20 + tier*.067
        length = .30*(1-z)**.7
        for branch in range(6):
            angle = branch*math.tau/6 + tier*.79 + rng.uniform(-.2,.2)
            end = Vector((math.cos(angle)*length, math.sin(angle)*length, z-.035))
            tube(vertices, faces, indices, (0,0,z), end, .004, .001, sides=4)
            for fork in range(3):
                t = .38 + .27*fork
                centre = end*t + Vector((0,0,z*(1-t)))
                radius = length*(.30-.06*fork)
                start = len(vertices)
                # Closed irregular foliage lobes, not camera-facing triangles.
                for i in range(7):
                    theta = math.tau*i/7
                    r = radius*rng.uniform(.75,1.2)
                    vertices.append(tuple(centre + Vector((r*math.cos(theta),r*math.sin(theta),-.022))))
                vertices.extend([tuple(centre+Vector((.008,-.004,.10*(1-z)+.022))), tuple(centre-Vector((0,0,.04)))])
                for i in range(7):
                    faces.extend([(start+i,start+(i+1)%7,start+7),(start+(i+1)%7,start+i,start+8)])
                    indices.extend([1+rng.randrange(len(foliage)),1+rng.randrange(len(foliage))])
    obj = mesh_object(f'Lake_PinePrototype_{seed}', vertices, faces, [bark]+foliage)
    for polygon, index in zip(obj.data.polygons, indices):
        polygon.material_index = index
    mesh = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    return mesh


def vegetation():
    bark, _ = material('Lake / pine bark', (.08,.038,.018), .9)
    foliage = []
    for i, color in enumerate([(.018,.042,.017),(.035,.065,.023),(.07,.085,.025),(.105,.09,.025)]):
        mat, shader = material(f'Lake / needle cluster {i+1}', color, .76)
        shader.inputs['Subsurface Weight'].default_value = .06
        shader.inputs['Subsurface Radius'].default_value = (.025,.04,.012)
        foliage.append(mat)
    prototypes = [pine_mesh(i+83,bark,foliage) for i in range(6)]
    rng = random.Random(9308)
    count = 0
    for attempt in range(2500):
        x, y = rng.uniform(-180,180), rng.uniform(13,260)
        z = ground_height(x,y)
        if z < -10.9 or z > 48 or rng.random() < .32:
            continue
        # Keep the immediate central sightline open toward the lake.
        if y < 30 and abs(x) < 8:
            continue
        obj = bpy.data.objects.new(f'Lake_ForestTree_{count:04d}', prototypes[count%6])
        attach(obj)
        obj.location = (x,y,z-.15)
        h = rng.uniform(3.2,7.8)
        obj.scale = (h*rng.uniform(.8,1.1),h*rng.uniform(.8,1.1),h)
        obj.rotation_euler.z = rng.uniform(0,math.tau)
        count += 1
        if count >= 1050:
            break
    for i, (x,y,height) in enumerate([(-4.3,7,7.4),(5.8,10,8.6),(-7.2,13,9.2)]):
        obj = bpy.data.objects.new(f'Lake_NearPine_{i+1:02d}',prototypes[i])
        attach(obj); obj.location = (x,y,ground_height(x,y)); obj.scale = (height,)*3
    return count+3


def build():
    # Remove only the superseded flat exterior, keeping architectural work.
    for obj in list(bpy.data.objects):
        if obj.get(TAG) or (obj.name.startswith('Exterior_') and obj.get('reference_window_room_v1')):
            bpy.data.objects.remove(obj, do_unlink=True)
    terrain = ground_material()
    vertices, faces = [], []
    nx, ny = 181, 171
    for row in range(ny):
        y = 1.75 + 490*row/(ny-1)
        for col in range(nx):
            x = -360 + 720*col/(nx-1)
            vertices.append((x,y,ground_height(x,y)))
    for row in range(ny-1):
        for col in range(nx-1):
            a = row*nx+col
            faces.append((a,a+1,a+1+nx,a+nx))
    obj = mesh_object('Lake_Terrain',vertices,faces,[terrain])
    obj['role'] = 'editable three-dimensional basin, shoreline and mountain ridges'
    water()
    trees = vegetation()
    return {'treeInstances':trees,'terrainVertices':len(vertices),'terrainExtentMetres':[720,490],
            'waterElevation':-11.2,'sharedTreeMeshes':6,'imageBillboards':0}

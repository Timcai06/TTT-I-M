"""Small Blender primitives for the editable personal-space blockout."""
import math

import bpy
from mathutils import Vector


def material(name, color, metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat


def finish(obj, name, mat, parent=None, bevel=0):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Edge highlights', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        # Apply before exporting, leaving the animation hierarchy untouched.
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if parent:
        obj.parent = parent
    return obj


def box(name, loc, size, mat, bevel=0.006, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel)


def cylinder(name, loc, radius, depth, mat, vertices=20, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = finish(bpy.context.object, name, mat, parent, 0.002)
    return obj


def rod(name, a, b, radius, mat):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, (a+b)/2, radius, (b-a).length, mat)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return obj


def empty(name, loc):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    return obj


def plane_image(name, path, loc, width, height, rotation=(0, 0, 0)):
    """A real source image fitted inside its print, never stretched or recolored."""
    image = bpy.data.images.load(str(path), check_existing=True)
    image.pack()
    aspect = image.size[0] / image.size[1]
    actual_width = min(width, height * aspect)
    actual_height = actual_width / aspect
    mat = material(name + '_paper_ink', (0.8, 0.8, 0.8), roughness=0.85)
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    mat.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.scale = (actual_width, actual_height, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat)


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()


def area(name, loc, target, energy, color, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    return obj


def camera(name, loc, target, lens=35):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_start = 0.03
    data.clip_end = 100
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    return obj


def radians(value):
    return math.radians(value)

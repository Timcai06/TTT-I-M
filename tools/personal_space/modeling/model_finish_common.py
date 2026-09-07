"""Shared helpers for the model-only approval pass. Never exports website assets."""
import math
import bpy
from mathutils import Vector
from primitives import box, cylinder, rod, empty, material, plane_image
from refine_scene import tube, lathe
from surface_materials import projected_uv

TAG = 'archive_model_review_v1'


def own(obj, collection):
    obj[TAG] = True
    target = bpy.data.collections.get(collection)
    if target is None:
        target = bpy.data.collections.new(collection)
        bpy.context.scene.collection.children.link(target)
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def parent_keep(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def remove_named(name):
    obj = bpy.data.objects.get(name)
    if obj:
        # Existing non-owned children retain their world-space pose.
        bpy.context.view_layer.update()
        for child in list(obj.children):
            matrix = child.matrix_world.copy()
            child.parent = None
            child.matrix_world = matrix
        bpy.data.objects.remove(obj, do_unlink=True)


def get_material(name, color, metallic=0, roughness=.6):
    return bpy.data.materials.get(name) or material(name, color, metallic, roughness)


def shader(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def text_label(name, text, location, size, mat, collection, rotation=(0,0,0), parent=None):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = text
    curve.size = size
    curve.space_character = 1.15
    curve.extrude = .00002
    curve.resolution_u = 2
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    curve.materials.append(mat)
    own(obj, collection)
    if parent:
        bpy.context.view_layer.update()
        parent_keep(obj, parent)
    return obj


def key_action(obj, path, keys, name):
    if obj.animation_data:
        obj.animation_data_clear()
    old = bpy.data.actions.get(name)
    if old and old.users == 0:
        bpy.data.actions.remove(old)
    for frame, value in keys:
        setattr(obj, path, value)
        obj.keyframe_insert(data_path=path, frame=frame)
    obj.animation_data.action.name = name


def anchor(name, location, collection, size=None, rotation=(0,0,0)):
    remove_named(name)
    obj = own(empty(name, location), collection)
    obj.rotation_euler = rotation
    obj.empty_display_type = 'ARROWS'
    obj.empty_display_size = .07
    if size:
        obj['surface_width_m'], obj['surface_height_m'] = size
    obj['coordinate_system'] = 'Blender Z-up; export position [x,z,-y]'
    return obj


def fit_image(name, path, location, width, height, collection, rotation=(0,0,0), emission=0):
    obj = own(plane_image(name, path, location, width, height, rotation), collection)
    if emission:
        mat = obj.data.materials[0]
        bs = shader(mat)
        tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE')
        mat.node_tree.links.new(tex.outputs['Color'], bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value = emission
        bs.inputs['Roughness'].default_value = .48
    return obj

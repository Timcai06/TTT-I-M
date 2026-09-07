"""Editable near-field paper and Life envelope rigs, shared by rebuild and upgrade."""
import math
import bpy
from primitives import box, empty
from surface_materials import projected_uv


def apply_reading_details():
    for name in ('NotebookReadingSurface', 'NotebookReadingAnchor'):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    page = box('NotebookReadingSurface', (-.58,.88,.863), (.266,.332,.0015), bpy.data.materials['Paper_fiber'], .0006)
    projected_uv(page)
    empty('NotebookReadingAnchor', (-.58,.88,.864))
    # A real hinged envelope and separate photographic insert for the Life handoff.
    for name in ('LifeEnvelopeHinge', 'LifeEnvelopeFlap', 'LifeMemoryPhoto'):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    for name in ('LifeEnvelopeOpen', 'LifePhotoExtract'):
        action = bpy.data.actions.get(name)
        if action and action.users == 0:
            bpy.data.actions.remove(action)
    hinge = empty('LifeEnvelopeHinge', (-1.19, 1.20, 1.14))
    flap = box('LifeEnvelopeFlap', (0, -.05, 0), (.16, .10, .0015), bpy.data.materials['Paper_fiber'], .0005, hinge)
    hinge.rotation_euler.x = 0
    hinge.keyframe_insert(data_path='rotation_euler', frame=1)
    hinge.rotation_euler.x = math.radians(-125)
    hinge.keyframe_insert(data_path='rotation_euler', frame=25)
    hinge.animation_data.action.name = 'LifeEnvelopeOpen'
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.19,1.09,1.138))
    photo = bpy.context.object
    photo.name = 'LifeMemoryPhoto'
    image_material = bpy.data.materials['ArchivePhoto_01_paper_ink']
    image = next(node.image for node in image_material.node_tree.nodes if node.type == 'TEX_IMAGE')
    aspect = image.size[0] / image.size[1]
    width = min(.13, .18 * aspect)
    photo.scale = (width, width / aspect, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    photo.data.materials.append(bpy.data.materials['ArchivePhoto_01_paper_ink'])
    photo.keyframe_insert(data_path='location', frame=1)
    photo.location = (-1.19,.91,1.26)
    photo.keyframe_insert(data_path='location', frame=25)
    photo.animation_data.action.name = 'LifePhotoExtract'

"""Authored camera studies, motivated lighting and Metal/Cycles quality settings."""
import math
import bpy
from mathutils import Vector
from primitives import camera, empty, aim, box
from model_finish_common import own

CAMERAS = [
    ('01_Room',(-.65,-3.45,1.82),(0,.92,1.22),35,8,1),
    ('02_Book',(-.88,.23,1.27),(-.60,.87,.857),52,5.6,25),
    ('03_Life',(-.91,.39,1.42),(-1.28,1.03,1.20),55,5.6,25),
    ('04_Frame',(.78,-.53,1.73),(1.735,.26,1.61),55,8,1),
    ('05_Stack',(.43,.12,1.39),(.48,1.158,1.25),50,8,1),
    ('06_Work',(1.30,-.42,1.03),(.955,.08,.735),55,5.6,110),
    ('07_Contact',(-.25,-3.60,1.70),(.12,.80,1.16),36,8,160),
    ('08_BookMacro',(-.30,.46,1.03),(-.47,.75,.852),65,8,25),
]


def setup_lighting():
    scene=bpy.context.scene
    window=bpy.data.objects['Window softbox']
    window.location=(-2.10,-.25,1.73)
    aim(window,(-.30,.74,.98))
    window.data.shape='RECTANGLE'
    window.data.size=1.8;window.data.size_y=1.70
    window.data.energy=260
    window.data.color=(.76,.86,1.0)
    window['lighting_role']='Exterior overcast key; real window mullions cast shadows'
    task=bpy.data.objects['Task light']
    task.location=(1.0,1.14,1.381)
    aim(task,(.63,.84,.83))
    task.data.energy=15
    task.data.shape='DISK';task.data.size=.062
    task.data.color=(1,.65,.34)
    task['lighting_role']='Warm practical emitter at the open mouth of the desk shade'
    bpy.data.lights['Front bounce'].energy=12
    bpy.data.lights['Room ceiling fill'].energy=8
    world=scene.world
    background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(.63,.72,.88,1)
    background.inputs['Strength'].default_value=.055
    exterior=bpy.data.objects['Room_WindowLandscape']
    exterior.visible_shadow=False
    exterior.visible_diffuse=False
    exterior['lighting_role']='Camera/reflection backdrop; does not occlude the window key'

    # A separate volume is deliberately easy to disable when studying materials.
    mat=bpy.data.materials.new('Cinema air / subtle window atmosphere');mat.use_nodes=True
    nodes=mat.node_tree.nodes;nodes.clear()
    output=nodes.new('ShaderNodeOutputMaterial')
    volume=nodes.new('ShaderNodeVolumeScatter')
    volume.inputs['Density'].default_value=.006
    volume.inputs['Anisotropy'].default_value=.25
    volume.inputs['Color'].default_value=(.90,.94,1,1)
    mat.node_tree.links.new(volume.outputs[0],output.inputs['Volume'])
    atmosphere=own(box('Cinema_Atmosphere',(0,-.1,1.42),(3.48,3.10,2.74),mat,0),'12 Cinema - atmosphere')
    atmosphere.display_type='WIRE'
    atmosphere['web_export']='Exclude this volume; recreate or omit at runtime'


def setup_cameras():
    for slug,location,target,lens,fstop,frame in CAMERAS:
        focus=own(empty('Cinema_Focus_'+slug,target),'11 Cinema - cameras')
        focus.empty_display_size=.025
        obj=own(camera('Cinema_'+slug,location,target,lens),'11 Cinema - cameras')
        obj.data.sensor_width=36
        obj.data.lens=lens
        obj.data.dof.use_dof=True
        obj.data.dof.focus_object=focus
        obj.data.dof.aperture_fstop=fstop
        obj.data.dof.aperture_blades=9
        obj.data.dof.aperture_rotation=math.radians(15)
        obj.data.clip_start=.01
        obj['review_frame']=frame
        obj['shot_role']=slug
        obj['instructions']='Set timeline to review_frame; select camera and Ctrl + Numpad 0'
    bpy.context.scene.camera=bpy.data.objects['Cinema_01_Room']


def setup_quality():
    scene=bpy.context.scene
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL'
    prefs.get_devices()
    devices=[]
    for device in prefs.devices:
        device.use=device.type=='METAL'
        if device.use: devices.append(device.name)
    assert devices, 'No Metal device: do not silently label CPU rendering as GPU.'
    scene.render.engine='CYCLES';scene.cycles.device='GPU'
    scene.cycles.samples=1024
    scene.cycles.use_adaptive_sampling=True
    scene.cycles.adaptive_threshold=.008
    scene.cycles.adaptive_min_samples=64
    scene.cycles.preview_samples=96
    scene.cycles.use_preview_adaptive_sampling=True
    scene.cycles.preview_adaptive_threshold=.05
    scene.cycles.use_denoising=True
    scene.cycles.denoiser='OPENIMAGEDENOISE'
    scene.cycles.denoising_input_passes='RGB_ALBEDO_NORMAL'
    scene.cycles.denoising_prefilter='ACCURATE'
    scene.cycles.denoising_quality='HIGH'
    scene.cycles.use_preview_denoising=True
    scene.cycles.preview_denoiser='OPENIMAGEDENOISE'
    scene.cycles.preview_denoising_start_sample=16
    scene.cycles.max_bounces=12
    scene.cycles.diffuse_bounces=6
    scene.cycles.glossy_bounces=6
    scene.cycles.transmission_bounces=12
    scene.cycles.transparent_max_bounces=8
    scene.cycles.volume_bounces=2
    scene.cycles.sample_clamp_indirect=8
    scene.render.resolution_x=3840;scene.render.resolution_y=2160
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.image_settings.color_depth='16'
    scene.render.film_transparent=False
    scene.render.use_motion_blur=False
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=.15
    scene.view_settings.gamma=1
    for layer in scene.view_layers:
        layer.cycles.use_denoising=True
        layer.use_pass_normal=True
        layer.use_pass_diffuse_color=True
    # Preferences are saved only after the scene passes its pre-save checks.
    return devices


def setup_compositor():
    scene=bpy.context.scene
    assert scene.compositing_node_group is None, 'Preserve any user-authored compositor.'
    graph=bpy.data.node_groups.new('Cinema / gentle practical halation','CompositorNodeTree')
    graph.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
    source=graph.nodes.new('CompositorNodeRLayers');source.location=(-420,0)
    glare=graph.nodes.new('CompositorNodeGlare');glare.location=(-120,0)
    glare.inputs['Type'].default_value='Fog Glow'
    glare.inputs['Quality'].default_value='High'
    glare.inputs['Threshold'].default_value=2.5
    glare.inputs['Strength'].default_value=.08
    glare.inputs['Size'].default_value=.20
    glare.label='Subtle highlight spread; mute to inspect unprocessed light'
    output=graph.nodes.new('NodeGroupOutput');output.location=(180,0)
    graph.links.new(source.outputs['Image'],glare.inputs['Image'])
    graph.links.new(glare.outputs['Image'],output.inputs['Image'])
    scene.compositing_node_group=graph


def setup_workspace():
    scene=bpy.context.scene
    scene.frame_set(1)
    scene['cinema_review']='Cinema_* cameras / review_frame; F12 for Cycles final. Visual acceptance: tim.'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active
                space.shading.type='MATERIAL'
                space.shading.use_scene_lights=True
                space.shading.use_scene_world=True
                space.overlay.show_overlays=False
                space.region_3d.view_perspective='CAMERA'
                space.region_3d.view_camera_zoom=0
    text=bpy.data.texts.get('START HERE - Cinema review') or bpy.data.texts.new('START HERE - Cinema review')
    text.clear()
    text.write('''PERSONAL ARCHIVE / CINEMA STUDY
Same canonical .blend, updated in place. No website export.

OPENING VIEW: Cinema_01_Room, frame 1.
F12: 3840 x 2160 / Cycles / 1024 maximum samples / adaptive / 16-bit PNG.
Z -> Rendered: interactive Cycles preview (96 samples), use this for lighting.
Material Preview is for editing and does not reproduce final Cycles/compositor.
Preferences -> System -> Cycles Render Devices -> Metal -> Apple M5 Pro GPU.
If Blender was already open during the background save, reopen this file after
handling your own unsaved edits. Disk updates do not refresh the active scene.

Outliner collection: 11 Cinema - cameras.
Select a camera; Ctrl + Numpad 0 makes it active; set the frame below.
Without a numpad: Scene Properties -> Camera, choose the named camera.
Camera Properties -> Depth of Field controls aperture and focus object.

01 Room: frame 1 / 35 mm / f8
02 Book: frame 25 / 52 mm / f5.6
03 Life: frame 25 / 55 mm / f5.6
04 Frame: frame 1 / 55 mm / f8
05 Stack: frame 1 / 50 mm / f8
06 Work: frame 110 / 55 mm / f5.6
07 Contact: frame 160 / 36 mm / f8
08 BookMacro: frame 25 / 65 mm / f8

12 Cinema - atmosphere: disable collection for a clear-air material study.
Compositor: mute Fog Glow for raw illumination.
Original Review_* cameras, chapter anchors, page centre, source photographs,
project screen and existing animation tracks remain available.

Native procedural surfaces and atmosphere need a separate web asset bake /
runtime treatment after acceptance. This file is not a ready-to-ship GLB.
No render or visual assessment has been performed by the agent.
''')

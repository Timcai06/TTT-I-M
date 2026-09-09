"""Direct model-only refinement of the window room; preserves the chapter rig.

Run once to migrate the existing source. Subsequent runs verify without saving.
The web model and frontend remain intentionally unchanged until user acceptance.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from finish_window_room import SOURCE, ROOT, REVIEW, contract, missing_dependencies, blend_inventory
from primitives import aim, box, cylinder, empty, camera
import lake_landscape

VERSION = '2026-09-08-lake-window-2'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream,'sha256').hexdigest()


def glazing():
    mat = bpy.data.materials['Window / low iron glass']
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    clear = nodes.new('ShaderNodeBsdfTransparent')
    clear.inputs['Color'].default_value = (.993,.998,1,1)
    reflection = nodes.new('ShaderNodeBsdfPrincipled')
    reflection.inputs['Base Color'].default_value = (.88,.92,.94,1)
    reflection.inputs['Metallic'].default_value = 1
    reflection.inputs['Roughness'].default_value = .065
    fresnel = nodes.new('ShaderNodeFresnel')
    fresnel.inputs['IOR'].default_value = 1.46
    mix = nodes.new('ShaderNodeMixShader')
    links.new(fresnel.outputs['Fac'],mix.inputs[0])
    links.new(clear.outputs[0],mix.inputs[1])
    links.new(reflection.outputs['BSDF'],mix.inputs[2])
    links.new(mix.outputs[0],output.inputs['Surface'])
    mat.surface_render_method = 'BLENDED'
    mat.use_transparent_shadow = True
    mat.diffuse_color = (.8,.9,1,.08)
    mat['glazing_model'] = 'thin architectural glazing, Fresnel reflection with straight-through transmission; Cycles and material preview'
    for obj in bpy.context.scene.objects:
        if obj.name.startswith('BackWindow_Glass_'):
            obj.visible_shadow = False
    # Old left-window photo belongs to the superseded exterior, not user Frame.
    old = bpy.data.objects.get('Room_WindowLandscape')
    if old:
        old.hide_render = True
        old.hide_set(True)
        old['lake_superseded'] = True


def details():
    col = bpy.data.collections.get('16 Window joinery and textile details')
    if not col:
        col=bpy.data.collections.new('16 Window joinery and textile details')
        bpy.context.scene.collection.children.link(col)
    def own(obj):
        for c in list(obj.users_collection): c.objects.unlink(obj)
        col.objects.link(obj)
        return obj
    metal = bpy.data.materials['Charcoal powder coat']
    wood = bpy.data.materials['Walnut_oiled']
    # Interior timber sill and tiny edge profiles catch the warm grazing light.
    own(box('WindowJoinery_InteriorOakSill',(.2,1.39,.708),(2.58,.26,.036),wood,.005))
    for i,x in enumerate([-.995,-.949,1.348,1.392,1.436,1.48]):
        bpy.ops.mesh.primitive_torus_add(major_radius=.024,minor_radius=.0035,
                                      major_segments=24,minor_segments=8,
                                      location=(x,1.385,2.682),rotation=(0,math.pi/2,0))
        ring=bpy.context.object; ring.name=f'Curtain_HangingRing_{i+1:02d}'
        ring.data.materials.append(metal);own(ring)
    for i,x in enumerate([-.213,.613]):
        own(box(f'WindowJoinery_HandlePlate_{i+1}',(x,1.316,1.38),(.025,.008,.09),metal,.003))
        own(box(f'WindowJoinery_Handle_{i+1}',(x,1.298,1.365),(.012,.021,.074),metal,.004))
    # Keep the existing material graphs/photographs. Refine only physical scale.
    limits = {'Plaster_warm':.22,'Linen_natural':.20,'Paper_fiber':.16,'Walnut_oiled':.20}
    for name,strength in limits.items():
        mat=bpy.data.materials.get(name)
        if not mat or not mat.use_nodes: continue
        for node in mat.node_tree.nodes:
            if node.type=='BUMP': node.inputs['Strength'].default_value=min(node.inputs['Strength'].default_value,strength)
        mat['lake_window_finish']='subtle relief, original color/texture connections preserved'


def lighting():
    scene=bpy.context.scene
    world=scene.world
    nodes,links=world.node_tree.nodes,world.node_tree.links
    nodes.clear()
    output=nodes.new('ShaderNodeOutputWorld')
    background=nodes.new('ShaderNodeBackground')
    sky=nodes.new('ShaderNodeTexSky');sky.sky_type='MULTIPLE_SCATTERING'
    sky.sun_elevation=math.radians(8)
    sky.sun_rotation=math.radians(64)
    sky.sun_size=math.radians(.65)
    sky.sun_intensity=.65
    sky.altitude=.25
    sky.air_density=1.05;sky.aerosol_density=1.6;sky.ozone_density=1
    background.inputs['Strength'].default_value=.18
    links.new(sky.outputs['Color'],background.inputs['Color'])
    links.new(background.outputs[0],output.inputs['Surface'])
    key=bpy.data.objects['Window softbox']
    key.data.energy=165;key.data.color=(1,.79,.57)
    key.data.specular_factor=0
    aim(key,(0,-.3,.9))
    fill=bpy.data.objects['BackWindow sky fill']
    fill.data.energy=95;fill.data.color=(.65,.78,1)
    fill.data.specular_factor=0
    direction=Vector((math.cos(math.radians(64))*math.cos(math.radians(8)),
                      math.sin(math.radians(64))*math.cos(math.radians(8)),math.sin(math.radians(8))))
    sun=bpy.data.objects['Exterior sunset direction']
    sun.location=direction*100
    aim(sun,(0,0,0))
    sun.data.energy=1.15;sun.data.angle=math.radians(1.2);sun.data.color=(1,.77,.52)
    for name,energy in [('Task light',18),('Front bounce',26),('Room ceiling fill',14)]:
        obj=bpy.data.objects.get(name)
        if obj:
            obj.data.energy=energy
            if name!='Task light':obj.data.specular_factor=0
    # A low-density bounded aerial layer separates remote terrain naturally.
    fog,shader=lake_landscape.material('Lake / distant aerial perspective',(.6,.68,.78),1)
    nodes,links=fog.node_tree.nodes,fog.node_tree.links
    nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');volume=nodes.new('ShaderNodeVolumeScatter')
    volume.inputs['Color'].default_value=(.66,.75,.86,1)
    volume.inputs['Density'].default_value=.0014
    volume.inputs['Anisotropy'].default_value=.12
    links.new(volume.outputs[0],out.inputs['Volume'])
    mist=box('Lake_DistantAtmosphere',(0,285,70),(710,390,215),fog,0)
    lake_landscape.attach(mist)
    scene.view_settings.view_transform='AgX'
    scene.view_settings.exposure=.15
    scene.render.engine='CYCLES'
    scene.cycles.samples=512
    scene.cycles.use_denoising=True
    scene.cycles.use_adaptive_sampling=True
    scene.cycles.adaptive_threshold=.012
    scene.cycles.preview_samples=96
    scene.cycles.use_preview_denoising=True
    scene.cycles.use_preview_adaptive_sampling=True
    scene.cycles.preview_adaptive_threshold=.035
    scene.cycles.max_bounces=10
    scene.cycles.transparent_max_bounces=16
    scene.cycles.volume_bounces=1
    scene.cycles.sample_clamp_indirect=6
    return {'keyWatts':165,'skyFillWatts':95,'sunElevationDegrees':8,'sunEnergy':1.15,
            'previewSamples':96,'previewDenoising':True,'renderSamples':512}


def cameras():
    scene=bpy.context.scene
    for obj in scene.objects:
        if obj.type=='CAMERA': obj.data.clip_end=1200
    overview=bpy.data.objects['WindowRoom_01_Overview']
    overview.data.lens=34
    overview.data.dof.aperture_fstop=11
    # Desk shot aims between open book and monitor, retaining the window above.
    desk=bpy.data.objects['WindowRoom_02_Desk']
    desk.location=(-.62,-.62,1.34)
    target=Vector((-.12,.96,1.06))
    aim(desk,target)
    bpy.data.objects['WindowRoom_02_Desk_Focus'].location=target
    desk.data.lens=40;desk.data.dof.aperture_fstop=8
    col=bpy.data.collections['14 Reference window cameras']
    extra=[('WindowRoom_05_Book',(-.58,.04,1.34),(-.58,.89,.864),54,'book thickness and desk'),
           ('WindowRoom_06_Screen',(.44,-.07,1.37),(.48,1.157,1.25),45,'monitor interior border and back window')]
    for name,pos,target,lens,role in extra:
        focus=empty(name+'_Focus',target);obj=camera(name,pos,target,lens)
        for item in (focus,obj):
            for old in list(item.users_collection):old.objects.unlink(item)
            col.objects.link(item)
        obj.data.clip_end=1200
        obj.data.dof.use_dof=True;obj.data.dof.focus_object=focus;obj.data.dof.aperture_fstop=8
        obj['reference_role']=role
    scene.camera=overview
    scene.frame_set(72)
    scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active
                space.clip_end=1200
                space.shading.type='MATERIAL'
                space.shading.use_scene_lights=True;space.shading.use_scene_world=True
                space.overlay.show_overlays=False
                space.region_3d.view_perspective='CAMERA'
    text=bpy.data.texts.get('START HERE - Window room review')
    text.clear()
    text.write('''LAKE WINDOW / MODEL REVIEW
Canonical file updated in place. Website export is intentionally unchanged.
Default: WindowRoom_01_Overview, frame 72 (open book).
01 Overview / 02 Desk / 03 Window / 04 Structure / 05 Book / 06 Screen.
Select a camera in the Outliner and use Ctrl+Numpad0 to look through it.
Frame 1: closed book. Frame 72: open book. Existing animation tracks preserved.
Collection 15: editable lake basin, mountain ridges, water and shared tree meshes.
Collection 16: curtain rings and window joinery details.
Glass uses thin Fresnel glazing compatible with material preview and Cycles.
Material Preview: scene lights/world on. Cycles Rendered: preview denoising on.
No final artistic acceptance was performed; tim judges the result.
''')


def technical_report():
    scene=bpy.context.scene
    unique_meshes={o.data.name:o.data for o in scene.objects if o.type=='MESH'}
    triangles=0
    for mesh in unique_meshes.values():
        assert all(math.isfinite(v) for vert in mesh.vertices for v in vert.co),mesh.name
        mesh.calc_loop_triangles();triangles+=len(mesh.loop_triangles)
    assert not missing_dependencies(),missing_dependencies()
    for obj in scene.objects:
        assert all(math.isfinite(v) for row in obj.matrix_world for v in row),obj.name
    terrain=bpy.data.objects['Lake_Terrain']
    assert terrain.dimensions.y>450 and terrain.dimensions.z>30
    glass=bpy.data.materials['Window / low iron glass']
    assert any(n.type=='BSDF_TRANSPARENT' for n in glass.node_tree.nodes)
    return {'objects':len(scene.objects),'uniqueMeshes':len(unique_meshes),'uniqueMeshBaseTriangles':triangles,
            'missingDependencies':[],'defaultCamera':scene.camera.name,'defaultFrame':scene.frame_current,
            'version':scene.get('lake_window_finish_version'),'sourceSha256':digest(SOURCE)}


def main():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    if bpy.context.scene.get('lake_window_finish_version')==VERSION:
        print('LAKE_WINDOW_REOPEN='+json.dumps(technical_report()))
        return
    expected=digest(SOURCE)
    inventory=blend_inventory()
    protected=contract()
    landscape=lake_landscape.build()
    glazing();details();lights=lighting();cameras()
    assert contract()==protected,'Chapter contract changed'
    bpy.context.scene.frame_set(72)
    bpy.context.scene['lake_window_finish_version']=VERSION
    bpy.context.scene['lake_window_author']='PM direct implementation'
    bpy.ops.file.pack_all()
    assert digest(SOURCE)==expected,'Concurrent source save detected'
    assert not missing_dependencies()
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    assert blend_inventory()==inventory,'Unexpected extra blend file'
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    report=technical_report()
    assert contract()==protected,'Reopened animation/reading surfaces differ'
    report.update({'previousSourceSha256':expected,'protectedContractUnchanged':True,
                   'blendInventoryUnchanged':True,'landscape':landscape,'lighting':lights,
                   'rendered':False,'visualAcceptance':'pending tim','websiteExported':False})
    REVIEW.mkdir(parents=True,exist_ok=True)
    (REVIEW/'lake-finish-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print('LAKE_WINDOW_SAVED='+json.dumps(report))


if __name__=='__main__': main()

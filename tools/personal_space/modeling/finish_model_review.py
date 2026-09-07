"""Finish the canonical Blender scene in place, with no web exports.

Run once on the current source. On subsequent runs it only refreshes the technical
manifest; it does not rebuild over hand edits. Rendering is a separate read-only
operation in render_model_review.py.
"""
from pathlib import Path
import sys
import json
import hashlib
import math
import bpy

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(Path(__file__).parent))
from model_finish_common import own, shader
from primitives import camera, area
from model_finish_work import finish_work
from model_finish_details import finish_frame, finish_stack, finish_paper, finish_room

OUT=ROOT/'art/personal-archive/reviews/current'
SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
PUBLIC=ROOT/'apps/landing/public'
VERSION='2026-09-07-model-review-1'
VIEWS=[
    ('01-room','Review_01_Room',(-.65,-3.45,1.82),(0,.92,1.22),31,1),
    ('02-about','Review_02_About',(-.48,.05,1.53),(-.66,.88,.85),42,25),
    ('03-life','Review_03_Life',(-.71,.12,1.57),(-1.37,1.08,1.22),48,25),
    ('04-frame','Review_04_Frame',(.54,-.97,1.81),(1.74,.20,1.59),40,1),
    ('05-stack','Review_05_Stack',(.36,-.04,1.48),(.49,1.14,1.20),42,1),
    ('06-work','Review_06_Work',(1.56,-.65,1.28),(.955,.33,.62),43,110),
    ('07-room-open','Review_07_RoomOpen',(-.65,-3.45,1.82),(0,.92,1.22),31,110),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def web_boundary():
    baseline=json.loads((OUT/'website-assets-before.json').read_text())
    actual={name:digest(ROOT/name) for name in baseline}
    assert actual==baseline, 'Website model resources changed; stop and investigate.'
    return actual


def inspect(scene):
    required=['NotebookReadingSurface','NotebookReadingAnchor','LifeEnvelopeHinge',
              'LifeMemoryPhoto','LifePhotoAnchor','FramePrintPivot','FrameEntryAnchor',
              'StackScreenSurface','StackScreenAnchor','WorkDrawerRoot','WorkFolderPivot','WorkCoverAnchor']
    missing=[name for name in required if name not in scene.objects]
    assert not missing, f'Missing required objects: {missing}'
    mesh_count=0;triangles=0
    for obj in scene.objects:
        assert all(math.isfinite(v) for row in obj.matrix_world for v in row),obj.name
        if obj.type=='MESH':
            mesh_count+=1;obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    image_info=[]
    for image in bpy.data.images:
        if image.users and image.type=='IMAGE':
            assert image.size[0]>0 and image.size[1]>0, image.name
            if not image.packed_file:image.pack()
            image_info.append({'name':image.name,'size':list(image.size),'packed':bool(image.packed_file)})
    poses={}
    for frame in [1,25,72,110]:
        scene.frame_set(frame)
        poses[str(frame)]={name:list(scene.objects[name].matrix_world.translation) for name in required}
    assert poses['110']['WorkDrawerRoot'][1]<poses['1']['WorkDrawerRoot'][1]-.4
    assert poses['110']['WorkFolderPivot'][2]>poses['1']['WorkFolderPivot'][2]+.19
    scene.frame_set(1)
    return {'version':VERSION,'source':str(SOURCE),'objects':len(scene.objects),'meshObjects':mesh_count,
            'baseMeshTriangles':triangles,'actions':[a.name for a in bpy.data.actions if a.users],
            'requiredObjects':required,'images':image_info,'poses':poses,
            'views':[{'output':v[0]+'.png','camera':v[1],'frame':v[5]} for v in VIEWS],
            'visualAcceptance':'pending tim; no agent visual inspection',
            'websiteIntegration':'blocked until explicit user instruction'}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    web=web_boundary();before=digest(SOURCE)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    if scene.get('model_review_version')!=VERSION:
        scene.frame_set(1)
        finish_work(PUBLIC)
        scene.frame_set(1)
        finish_frame(PUBLIC)
        scene.frame_set(1)
        finish_stack(PUBLIC)
        finish_paper(PUBLIC)
        finish_room(PUBLIC)
        for slug,name,location,target,lens,frame in VIEWS:
            obj=own(camera(name,location,target,lens),'08 Model review cameras')
            obj['review_frame']=frame;obj['review_output']=slug+'.png'
            obj.data.clip_start=.02
        scene.frame_end=120
        scene.render.fps=30
        for marker in list(scene.timeline_markers):scene.timeline_markers.remove(marker)
        for frame,name in [(1,'01 REST / ROOM'),(25,'02 BOOK + LIFE OPEN'),(72,'03 DRAWER OPEN'),(110,'04 FILE LIFT')]:
            scene.timeline_markers.new(name,frame=frame)
        # Balanced daylight and a local warm task source; no tone overrides on photos.
        bpy.data.lights['Window softbox'].energy=190
        bpy.data.lights['Front bounce'].energy=55
        bpy.data.lights['Task light'].energy=18
        own(area('Room ceiling fill',(0,.1,2.65),(0,.85,.70),35,(.88,.91,1),2.2),'07 Cameras and lighting')
        scene.view_settings.exposure=0
        scene.render.engine='CYCLES'
        scene.cycles.samples=64
        scene.cycles.use_denoising=True
        scene.cycles.use_adaptive_sampling=True
        scene.cycles.adaptive_threshold=.035
        scene.cycles.max_bounces=8
        scene.render.resolution_x=1600;scene.render.resolution_y=1000
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format='PNG'
        scene.render.image_settings.color_mode='RGB'
        scene.render.film_transparent=False
        scene.camera=bpy.data.objects['Review_01_Room']
        scene.frame_set(1)
        scene['model_review_version']=VERSION
        scene['website_integration']='Await tim approval; no web assets exported in this pass.'
        scene['review_instructions']='Review_* cameras: custom property review_frame gives pose. Frame 1 rest; 25 book + Life; 72 drawer; 110 file lift.'
        for screen in bpy.data.screens:
            for editor in screen.areas:
                if editor.type=='VIEW_3D':
                    editor.spaces.active.shading.type='MATERIAL'
                    editor.spaces.active.shading.use_scene_lights=True
                    editor.spaces.active.shading.use_scene_world=True
    manifest=inspect(scene)
    assert digest(SOURCE)==before,'Source changed on disk during modeling; refusing to overwrite user save.'
    web_boundary()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    manifest['sourceSha256']=digest(SOURCE)
    manifest['websiteAssetsUnchanged']=web
    (OUT/'model-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print('MODEL_REVIEW_SAVED',json.dumps({'objects':manifest['objects'],'triangles':manifest['baseMeshTriangles'],'source':str(SOURCE)}),flush=True)


if __name__=='__main__':main()

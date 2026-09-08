"""Bounded near-field pass on the canonical source; never exports website assets."""
from pathlib import Path
import sys
import json
import math
import bpy
from mathutils import Vector

sys.path.insert(0,str(Path(__file__).resolve().parent))
from finish_model_review import SOURCE, ROOT, PUBLIC, inspect, digest, web_boundary
from model_finish_common import own, anchor, parent_keep, remove_named, fit_image, text_label
from primitives import camera

VERSION='2026-09-07-transition-closeups-1'
OUT=ROOT/'art/personal-archive/reviews/closeups'
COL='09 Transition handoff anchors'


def corners(name, surface, width, height):
    """Stable named four-corner references in the reading anchor's local XY plane."""
    for suffix,x,y in [('TL',-.5,.5),('TR',.5,.5),('BR',.5,-.5),('BL',-.5,-.5)]:
        obj=anchor(name+'_'+suffix,(0,0,0),COL)
        obj.parent=surface;obj.location=(width*x,height*y,0)
        obj['corner_order']='TL TR BR BL'
    surface['surface_width_m']=width;surface['surface_height_m']=height


def paper_mesh(name, vertices, faces, parent=None):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    mesh.materials.append(bpy.data.materials['Paper_fiber'])
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    own(obj,'02 About - notebook' if name.startswith('About') else '03 Life - objects')
    thickness=obj.modifiers.new('Paper thickness','SOLIDIFY');thickness.thickness=.0005
    if parent:
        bpy.context.view_layer.update();parent_keep(obj,parent)
    return obj


def refine_reading_surfaces():
    # Preserve the broad flat reading area; turn up only the outer page margin.
    verts=[]
    for j in range(17):
        t=j/16;y=.714+t*.332
        verts.extend([(-.713,y,.8638+.0018*math.sin(math.pi*t)),(-.705,y,.8638)])
    paper_mesh('About_TurnedMargin',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(16)])
    reading=bpy.data.objects['NotebookReadingAnchor']
    reading['content_role']='AboutDossier; keep center planar for DOM handoff'
    corners('AboutReading',reading,.250,.314)
    # Thin envelope stock replaces the old solid block; the photo and flap stay independent.
    body=bpy.data.objects['Life envelope']
    body.dimensions.z=.0012;body.location.z=1.130
    for side in [-1,1]:
        edge=-1.19+side*.08
        paper_mesh('Life_PocketFold_'+('Left' if side<0 else 'Right'),
                   [(edge,.98,1.135),(edge,1.20,1.135),(-1.19+side*.052,1.09,1.137)],[(0,1,2)] if side<0 else [(0,2,1)])
    paper_mesh('Life_PocketLowerFold',[(-1.27,.98,1.136),(-1.11,.98,1.136),(-1.19,1.04,1.137)],[(0,1,2)])
    life=bpy.data.objects['LifePhotoAnchor']
    life['content_resource']='life/football-action.webp'
    photo=bpy.data.objects['LifeMemoryPhoto']
    bpy.context.view_layer.update()
    corners('LifeReading',life,photo.dimensions.x,photo.dimensions.y)


def bind_photographs():
    # Life's football photo is wall print 04. Move the primary entry identity there.
    for base in ['FrameEntryAnchor','FramePrintPivot']:
        bpy.data.objects[base].name=base+'_01'
        bpy.data.objects[base+'_04'].name=base
    entry=bpy.data.objects['FrameEntryAnchor']
    photo=bpy.data.objects['ArchivePhoto_04']
    entry['content_resource']='life/football-action.webp'
    entry['surface_object']=photo.name
    # Curved print corners must follow its actual mesh, not an approximate flat rectangle.
    uv=photo.data.uv_layers.active
    for suffix,target in [('TL',(0,1)),('TR',(1,1)),('BR',(1,0)),('BL',(0,0))]:
        loop=min(photo.data.loops,key=lambda l:(uv.data[l.index].uv-Vector(target)).length)
        world=photo.matrix_world@photo.data.vertices[loop.vertex_index].co
        obj=anchor('FrameReading_'+suffix,world,COL)
        bpy.context.view_layer.update();parent_keep(obj,bpy.data.objects['FramePrintPivot'])
    # The same existing landscape is carried from wall print 02 onto the display.
    old=bpy.data.objects['StackScreenSurface']
    old.data.materials[0].use_fake_user=True
    remove_named(old.name)
    display=fit_image('StackScreenSurface',PUBLIC/'frame/scenery/scenery-05-720.webp',(.48,1.159,1.25),.726,.385,'05 Stack - workstation',(math.pi/2,0,0),.28)
    display['content_resource']='frame/scenery/scenery-05-720.webp'
    display['previous_workstation_resource']='projects/pulsegraph/live-monitor.webp'
    bpy.context.view_layer.update()
    screen=bpy.data.objects['StackScreenAnchor']
    corners('StackReading',screen,display.dimensions.x,display.dimensions.z)
    screen['content_role']='Frame landscape then Stack DOM; runtime switching pending'


def refine_work_cover():
    pivot=bpy.data.objects['WorkFolderPivot']
    title=bpy.data.objects['Work_FileTitle_01'];title.data.body='WORK / SELECTED PROJECTS'
    sub=bpy.data.objects['Work_FileIndex_01'];sub.data.body='TIM CAI / SIX PROJECTS / 2026'
    evidence=bpy.data.objects['Work_CoverEvidence'];evidence.scale*=.75;evidence.location.z-=.020
    text_label('Work_IntroHeading','Six things I made\nin 2026.',(.735,.6805,.605),.013,
               bpy.data.materials['Archive Ink'],'06 Work - archive',(math.pi/2,0,0),pivot)
    cover=bpy.data.objects['WorkCoverAnchor']
    cover['content_role']='ProjectsIntro'
    cover['content_heading']='Six things I made\nin 2026.'
    corners('WorkReading',cover,.456,.208)


def contact_camera():
    obj=own(camera('Review_08_Contact',(-.15,-1.90,1.85),(.27,.96,1.18),38),'08 Model review cameras')
    obj['review_frame']=110;obj['review_output']='08-contact.png'
    contact=anchor('ContactCameraAnchor',tuple(obj.location),COL)
    contact.rotation_euler=obj.rotation_euler
    contact['lens_mm']=38
    contact['text_safe_rect_normalized']=[.08,.12,.42,.62]
    contact['safe_rect_status']='proposal; tim visual acceptance pending'
    contact['content_role']='FooterContact; camera-space layout, not modeled body text'
    for name,loc,target,lens,frame in [
        ('Review_09_BookClose',(-.55,.34,1.33),(-.61,.88,.862),48,25),
        ('Review_10_FileClose',(1.25,-.34,1.04),(.955,.10,.74),45,110),
    ]:
        obj=own(camera(name,loc,target,lens),'08 Model review cameras')
        obj['review_frame']=frame


def main():
    web_boundary();before=digest(SOURCE)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    if scene.get('transition_closeups_version')==VERSION:
        print('CLOSEUPS_ALREADY_APPLIED');return
    scene.frame_set(1)
    refine_reading_surfaces();bind_photographs();refine_work_cover();contact_camera()
    bpy.context.view_layer.update()
    for role in ['AboutReading','LifeReading','FrameReading','StackReading','WorkReading']:
        for corner in ['TL','TR','BR','BL']:assert role+'_'+corner in scene.objects
    life=bpy.data.objects['LifeMemoryPhoto'].data.materials[0]
    wall=bpy.data.objects['ArchivePhoto_04'].data.materials[0]
    assert life==wall,'Life and Frame must carry the same photograph'
    scene['transition_closeups_version']=VERSION
    scene.camera=bpy.data.objects['Review_01_Room'];scene.frame_set(1)
    manifest=inspect(scene)
    manifest['version']=VERSION
    manifest['contentBindings']={'lifeToFrame':'life/football-action.webp','frameToStack':'frame/scenery/scenery-05-720.webp','work':'ProjectsIntro','contact':'FooterContact'}
    # Sample moving corner positions for later integration without touching website configuration.
    manifest['surfaceCorners']={}
    for frame in [1,25,72,110]:
        scene.frame_set(frame)
        manifest['surfaceCorners'][str(frame)]={o.name:list(o.matrix_world.translation) for o in scene.objects if o.name.startswith(('AboutReading_','LifeReading_','FrameReading_','StackReading_','WorkReading_'))}
    scene.frame_set(1)
    assert digest(SOURCE)==before,'Source changed on disk; refusing to overwrite a user save'
    web_boundary()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    manifest['sourceSha256']=digest(SOURCE)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'model-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print('CLOSEUPS_SAVED',manifest['sourceSha256'],flush=True)


if __name__=='__main__':main()

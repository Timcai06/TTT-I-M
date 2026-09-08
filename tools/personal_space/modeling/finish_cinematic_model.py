"""Model-only cinema pass. One canonical save, no renders, no web export.

Checks source-on-disk concurrency, sampled chapter rigs, real image bindings,
and a fresh hash snapshot of frontend source/assets before saving in place.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
import bpy

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(Path(__file__).parent))
from cinematic_materials import finish_surfaces
from cinematic_details import finish_details
from cinematic_stage import setup_lighting, setup_cameras, setup_quality, setup_compositor, setup_workspace, CAMERAS

SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
OUT=ROOT/'art/personal-archive/reviews/cinema'
VERSION='2026-09-07-cinema-1'
FRAMES=[1,12,25,50,72,90,110,130,160]


def digest(path):
    return hashlib.file_digest(path.open('rb'),'sha256').hexdigest()


def web_snapshot():
    result={}
    for folder in ['apps/landing/src','apps/landing/public','apps/studio/src','packages']:
        for path in sorted((ROOT/folder).rglob('*')):
            if path.is_file() and 'node_modules' not in path.parts:
                result[str(path.relative_to(ROOT))]=digest(path)
    return result


def contract(scene):
    names=['NotebookHinge','NotebookCover','NotebookReadingSurface','NotebookReadingAnchor',
           'LifeEnvelopeHinge','LifeMemoryPhoto','LifePhotoAnchor','FramePrintPivot',
           'FrameEntryAnchor','StackScreenAnchor','WorkDrawerRoot','WorkFolderPivot',
           'WorkCoverAnchor','Monitor stem','Monitor base','Monitor rear support bracket']
    names+=sorted(o.name for o in scene.objects if o.name.startswith(
        ('AboutReading_','LifeReading_','FrameReading_','StackReading_','WorkReading_')))
    result={}
    for frame in FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        result[str(frame)]={name:[round(v,7) for row in scene.objects[name].matrix_world for v in row] for name in names}
        for name in ['StackScreenSurface','StackPhotoViewerSurface']:
            obj=scene.objects[name]
            result[str(frame)][name]={'hidden':obj.hide_render,'images':[
                n.image.name for mat in obj.data.materials if mat and mat.use_nodes
                for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]}
    scene.frame_set(1)
    return result


def inspect(scene):
    triangles=0
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for obj in scene.objects:
        assert all(math.isfinite(x) for row in obj.matrix_world for x in row),obj.name
        if obj.type=='MESH':
            evaluated=obj.evaluated_get(depsgraph)
            mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
            triangles+=len(mesh.loop_triangles);evaluated.to_mesh_clear()
    assert triangles<2_000_000, 'Unexpected topology expansion'
    images=[]
    for img in bpy.data.images:
        if img.users and img.type=='IMAGE':
            assert img.size[0]>0 and img.size[1]>0,img.name
            assert img.packed_file,img.name+' is not packed'
            images.append({'name':img.name,'size':list(img.size)})
    return {'objects':len(scene.objects),'evaluatedTriangles':triangles,'packedImages':images}


def verify_saved(scene, web):
    """Read-only model check; also recover a manifest if report writing was interrupted."""
    report=inspect(scene)
    assert scene.render.engine=='CYCLES' and scene.cycles.device=='GPU'
    assert scene.render.resolution_x==3840 and scene.render.resolution_y==2160
    assert scene.cycles.samples==1024
    assert bpy.data.objects['Notebook_pages'].get('physical_leaves')==72
    assert scene.compositing_node_group
    for slug,_,_,lens,fstop,frame in CAMERAS:
        cam=scene.objects['Cinema_'+slug]
        assert cam['review_frame']==frame and cam.data.lens==lens
        assert cam.data.dof.use_dof and cam.data.dof.focus_object
        assert abs(cam.data.dof.aperture_fstop-fstop)<.0001
    sampled=contract(scene)
    assert not sampled['1']['StackScreenSurface']['hidden']
    assert sampled['1']['StackPhotoViewerSurface']['hidden']
    assert sampled['130']['StackScreenSurface']['hidden']
    assert not sampled['130']['StackPhotoViewerSurface']['hidden']
    path=OUT/'model-manifest.json'
    previous=json.loads(path.read_text()) if path.exists() else {}
    if previous:
        assert previous['protectedContract']==sampled
        assert previous['sourceSha256']==digest(SOURCE)
        assert json.loads((OUT/'website-baseline.json').read_text())==web
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.get_devices()
    devices=[d.name for d in prefs.devices if d.type=='METAL' and d.use]
    assert prefs.compute_device_type=='METAL' and devices
    report.update(version=VERSION,source=str(SOURCE),sourceSha256=digest(SOURCE),
                  previousSourceSha256=scene['cinematic_model_source_before'],
                  metalDevices=devices,protectedContract=sampled,
                  existingActions=sorted(a.name for a in bpy.data.actions if a.users and not a.name.startswith('Cinema')),
                  websiteFilesChecked=len(web),websiteUnchanged=True,noNewBlendFiles=True,
                  cameras=[{'name':'Cinema_'+c[0],'frame':c[5],'lens':c[3],'fstop':c[4]} for c in CAMERAS],
                  rendered=False,visualAcceptance='pending tim',webBakeRequired=True,
                  verification='reopened source; structural/settings checks only',
                  originalSaveContractCheck='passed before save; first report write failed after save')
    OUT.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    if not previous:
        (OUT/'website-baseline.json').write_text(json.dumps(web,indent=2)+'\n')
    print('CINEMA_REOPEN_VERIFIED',json.dumps({k:report[k] for k in ['sourceSha256','objects','evaluatedTriangles','metalDevices','websiteFilesChecked']}),flush=True)


def main():
    original=digest(SOURCE)
    web=web_snapshot()
    blend_files=sorted(str(p.relative_to(ROOT)) for p in (ROOT/'art').rglob('*.blend*'))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene=bpy.context.scene
    if scene.get('cinematic_model_version')==VERSION:
        verify_saved(scene,web)
        assert digest(SOURCE)==original, 'Verification must not save the model'
        return
    before=contract(scene)
    actions={a.name for a in bpy.data.actions if a.users}
    finish_surfaces();finish_details();setup_lighting();setup_cameras()
    devices=setup_quality();setup_compositor();setup_workspace()
    assert contract(scene)==before, 'A protected rig, surface corner or monitor state changed'
    assert actions.issubset({a.name for a in bpy.data.actions if a.users})
    report=inspect(scene)
    assert web_snapshot()==web,'Frontend changed concurrently; do not save until reconciled'
    assert digest(SOURCE)==original,'Source changed on disk during this pass; preserving user save'
    scene['cinematic_model_version']=VERSION
    scene['cinematic_model_source_before']=original
    scene['cinematic_model_visual_acceptance']='Pending tim; no agent renders or visual inspection'
    scene['website_integration']='Existing web version retained; cinema model requires later bake/export'
    OUT.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(OUT/'tim-personal-archive-')
    previous_save_versions=bpy.context.preferences.filepaths.save_version
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    assert sorted(str(p.relative_to(ROOT)) for p in (ROOT/'art').rglob('*.blend*'))==blend_files
    # Persist just the required render-device selection, using the loaded preferences.
    # Restore the user's backup preference before saving preferences globally.
    bpy.context.preferences.filepaths.save_version=previous_save_versions
    bpy.ops.wm.save_userpref()
    report.update(version=VERSION,source=str(SOURCE),sourceSha256=digest(SOURCE),
                  previousSourceSha256=original,metalDevices=devices,
                  protectedContract=before,existingActions=sorted(actions),
                  websiteFilesChecked=len(web),websiteUnchanged=True,noNewBlendFiles=True,
                  cameras=[{'name':'Cinema_'+c[0],'frame':c[5],'lens':c[3],'fstop':c[4]} for c in CAMERAS],
                  rendered=False,visualAcceptance='pending tim',webBakeRequired=True)
    (OUT/'model-manifest.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    (OUT/'website-baseline.json').write_text(json.dumps(web,indent=2)+'\n')
    print('CINEMA_SAVED',json.dumps({k:report[k] for k in ['sourceSha256','objects','evaluatedTriangles','metalDevices','websiteFilesChecked']}),flush=True)


if __name__=='__main__':main()

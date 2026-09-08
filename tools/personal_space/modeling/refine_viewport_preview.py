"""Improve Cycles viewport convergence in place; final rendering is unchanged."""
import json
import sys
from pathlib import Path
import bpy

sys.path.insert(0,str(Path(__file__).parent))
from finish_cinematic_model import SOURCE, ROOT, OUT, digest, contract, web_snapshot

VERSION='2026-09-07-viewport-clean-1'
SETTINGS={
    'preview_samples':512,
    'use_preview_adaptive_sampling':True,
    'preview_adaptive_threshold':.01,
    'preview_adaptive_min_samples':32,
    'use_preview_denoising':True,
    'preview_denoiser':'OPENIMAGEDENOISE',
    'preview_denoising_input_passes':'RGB_ALBEDO_NORMAL',
    'preview_denoising_start_sample':1,
}


def check(scene):
    for key,value in SETTINGS.items():
        actual=getattr(scene.cycles,key)
        assert abs(actual-value)<1e-6 if isinstance(value,float) else actual==value,key
    atmosphere=scene.objects['Cinema_Atmosphere']
    assert all(atmosphere.hide_get(view_layer=layer) for layer in scene.view_layers)
    assert not atmosphere.hide_render


def main():
    before_sha=digest(SOURCE)
    web=web_snapshot()
    files=sorted(str(p) for p in (ROOT/'art').rglob('*.blend*'))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene=bpy.context.scene
    if scene.get('viewport_preview_version')==VERSION:
        check(scene)
        print('VIEWPORT_REOPEN_VERIFIED',before_sha)
        return
    frame=scene.frame_current
    protected=contract(scene)
    final={k:getattr(scene.cycles,k) for k in ['samples','adaptive_threshold','use_denoising','max_bounces']}
    old={k:getattr(scene.cycles,k) for k in SETTINGS}
    for key,value in SETTINGS.items():setattr(scene.cycles,key,value)
    atmosphere=scene.objects['Cinema_Atmosphere']
    assert not atmosphere.hide_render
    for layer in scene.view_layers:atmosphere.hide_set(True,view_layer=layer)
    instructions=bpy.data.texts.get('START HERE - Cinema review')
    if instructions:
        text=instructions.as_string().replace('(96 samples)','(512 samples, adaptive threshold 0.01)')
        text+='\nVIEWPORT UPDATE: denoising starts at sample 1. Atmosphere is hidden in the viewport only; F12 retains it.\n'
        instructions.clear();instructions.write(text)
    scene['viewport_preview_version']=VERSION
    check(scene)
    assert contract(scene)==protected
    assert final=={k:getattr(scene.cycles,k) for k in final}
    scene.frame_set(frame)
    assert web_snapshot()==web
    assert digest(SOURCE)==before_sha,'Source changed on disk; preserving user save'
    previous=bpy.context.preferences.filepaths.save_version
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version=previous
    assert files==sorted(str(p) for p in (ROOT/'art').rglob('*.blend*'))
    report={'version':VERSION,'sourceSha256':digest(SOURCE),'previousSourceSha256':before_sha,
            'before':old,'after':SETTINGS,'atmosphere':'hidden in viewport; enabled for final render',
            'finalRenderingUnchanged':True,'chapterContractUnchanged':True,
            'websiteFilesUnchanged':len(web),'rendered':False,'visualAcceptance':'pending tim'}
    (OUT/'viewport-preview.json').write_text(json.dumps(report,indent=2)+'\n')
    manifest_path=OUT/'model-manifest.json'
    manifest=json.loads(manifest_path.read_text())
    manifest['sourceSha256']=report['sourceSha256']
    manifest['viewportPreview']=report
    manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print('VIEWPORT_SAVED',json.dumps(report),flush=True)


if __name__=='__main__':main()

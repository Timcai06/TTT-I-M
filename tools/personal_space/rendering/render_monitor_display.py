"""Render project/photo screen states for tim; no model save or web export."""
from pathlib import Path
import sys,json
import bpy

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'modeling'))
from refine_monitor_display import OUT,VERSION
from finish_model_review import SOURCE,digest,web_boundary

before=digest(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
assert scene.get('monitor_window_version')==VERSION
scene.cycles.device='CPU'
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL';prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
except (TypeError,RuntimeError,AttributeError):pass
for frame,slug in [(1,'01-project-default'),(130,'02-photo-viewer')]:
    scene.frame_set(frame);scene.camera=bpy.data.objects['Review_11_MonitorClose']
    scene.render.filepath=str(OUT/(slug+'.png'))
    bpy.ops.render.render(write_still=True)
    print('MONITOR_RENDER_DONE',slug,flush=True)
assert digest(SOURCE)==before
web_boundary()
(OUT/'renders.json').write_text(json.dumps({'sourceSha256':before,'frames':[1,130],'visualAcceptance':'pending tim'},indent=2)+'\n')

"""Generate near-field review images for tim without saving/exporting the model."""
from pathlib import Path
import sys
import json
import time
import bpy

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'modeling'))
from finish_model_review import SOURCE, VIEWS, digest, web_boundary
from finish_transition_closeups import OUT, VERSION

before=digest(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
assert scene.get('transition_closeups_version')==VERSION
device='CPU';scene.cycles.device='CPU'
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL';prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU';device='METAL'
except (TypeError,RuntimeError,AttributeError):pass
views=[(v[0],v[1],v[5]) for v in VIEWS]
views += [('08-contact','Review_08_Contact',110),('09-book-close','Review_09_BookClose',25),('10-file-close','Review_10_FileClose',110)]
results=[]
for slug,name,frame in views:
    scene.frame_set(frame);scene.camera=bpy.data.objects[name]
    scene.render.filepath=str(OUT/(slug+'.png'))
    start=time.time();bpy.ops.render.render(write_still=True)
    results.append({'file':slug+'.png','camera':name,'frame':frame,'seconds':round(time.time()-start,2)})
    print('CLOSEUP_RENDER_DONE',slug,flush=True)
assert digest(SOURCE)==before
web_boundary()
(OUT/'renders-all.json').write_text(json.dumps({'sourceSha256':before,'device':device,'views':results},indent=2)+'\n')

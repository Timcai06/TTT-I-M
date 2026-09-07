"""Render saved review cameras for tim. Does not save or export the scene."""
from pathlib import Path
import sys
import json
import time
import bpy

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'modeling'))
from finish_model_review import SOURCE, OUT, VIEWS, digest, web_boundary

before=digest(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
# Use available Metal hardware, with CPU as a supported fallback.
device='CPU'
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL'
    prefs.get_devices()
    gpu=[d for d in prefs.devices if d.type=='METAL']
    if gpu:
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU';device='METAL'
except (TypeError,RuntimeError,AttributeError):
    scene.cycles.device='CPU'
print('REVIEW_RENDER_DEVICE',device,flush=True)
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
results=[]
for slug,name,location,target,lens,frame in VIEWS:
    if requested and slug not in requested:continue
    scene.frame_set(frame);scene.camera=bpy.data.objects[name]
    scene.render.filepath=str(OUT/(slug+'.png'))
    started=time.time()
    bpy.ops.render.render(write_still=True)
    result={'file':slug+'.png','camera':name,'frame':frame,'seconds':round(time.time()-started,2),'device':device}
    results.append(result)
    print('REVIEW_RENDER_DONE',json.dumps(result),flush=True)
assert digest(SOURCE)==before,'Render must not modify the source'
web_boundary()
(OUT/('renders-'+('-'.join(requested) or 'all')+'.json')).write_text(json.dumps(results,indent=2)+'\n')

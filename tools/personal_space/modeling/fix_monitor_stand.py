"""Move the monitor support behind the display and verify camera sightlines."""
from pathlib import Path
import sys,json
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0,str(Path(__file__).resolve().parent))
from finish_model_review import SOURCE,ROOT,digest,web_boundary
from model_finish_common import own
from primitives import box

OUT=ROOT/'art/personal-archive/reviews/monitor'
VERSION='monitor-rear-support-20260907-1'


def bounds(obj):
    points=[obj.matrix_world@Vector(v) for v in obj.bound_box]
    return [[min(v[i] for v in points),max(v[i] for v in points)] for i in range(3)]


def main():
    web_boundary();before=digest(SOURCE)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    if scene.get('monitor_stand_version')==VERSION:
        print('MONITOR_STAND_ALREADY_FIXED');return
    scene.frame_set(1)
    stem=bpy.data.objects['Monitor stem'];base=bpy.data.objects['Monitor base']
    old={'stem':bounds(stem),'base':bounds(base)}
    stem.location.y=1.265
    base.location.y=1.190
    plate=own(box('Monitor rear support bracket',(.48,1.243,1.14),(.09,.032,.06),
                  bpy.data.materials['Charcoal powder coat'],.003),'05 Stack - workstation')
    bpy.context.view_layer.update()
    screen=bounds(bpy.data.objects['Monitor screen'])
    assert bounds(stem)[1][0]>screen[1][1]
    assert bounds(plate)[1][0]>screen[1][1]
    assert bounds(base)[2][1]<screen[2][0]
    assert bounds(base)[1][0]<bounds(stem)[1][0]<bounds(stem)[1][1]<bounds(base)[1][1]
    # Technical ray intersections only: no image inspection or aesthetic verdict.
    depsgraph=bpy.context.evaluated_depsgraph_get()
    checks=0
    for name in ['Review_01_Room','Review_05_Stack','Review_11_MonitorClose']:
        cam=bpy.data.objects[name]
        for i in range(5):
            for j in range(5):
                target=Vector((.12+i*.18,1.155,1.06+j*.095))
                for support in [stem,base,plate]:
                    inv=support.matrix_world.inverted()
                    start=inv@cam.matrix_world.translation;end=inv@target
                    direction=end-start
                    tree=BVHTree.FromObject(support,depsgraph)
                    hit=tree.ray_cast(start,direction.normalized(),direction.length)[0]
                    assert hit is None,f'{name}: {support.name} blocks screen point {i},{j}'
                    checks+=1
    assert digest(SOURCE)==before,'Model changed on disk during edit'
    web_boundary()
    scene['monitor_stand_version']=VERSION
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    report={'source':str(SOURCE),'sourceSha256':digest(SOURCE),'version':VERSION,'before':old,
            'after':{'stem':bounds(stem),'base':bounds(base),'bracket':bounds(plate)},
            'unobstructedRayChecks':checks,'screenStatesUnchanged':True,'visualAcceptance':'pending tim'}
    (OUT/'stand-fix.json').write_text(json.dumps(report,indent=2)+'\n')
    print('MONITOR_STAND_FIXED',json.dumps({'sha':report['sourceSha256'],'rayChecks':checks}),flush=True)


if __name__=='__main__':main()

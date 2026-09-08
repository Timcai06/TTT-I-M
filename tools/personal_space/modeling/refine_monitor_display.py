"""Restore the project desktop and model a separate photo-viewer preview state."""
from pathlib import Path
import sys,json,math
import bpy

sys.path.insert(0,str(Path(__file__).resolve().parent))
from finish_model_review import SOURCE,ROOT,PUBLIC,digest,web_boundary
from model_finish_common import own,remove_named,fit_image,text_label,get_material,shader
from primitives import box,cylinder,camera
from finish_transition_closeups import corners

OUT=ROOT/'art/personal-archive/reviews/monitor'
COL='10 Monitor - screen interface'
VERSION='monitor-window-20260907-1'
ROT=(math.pi/2,0,0)


def luminous(name,color):
    m=get_material(name,color,roughness=.72)
    bs=shader(m);bs.inputs['Emission Color'].default_value=(*color,1)
    bs.inputs['Emission Strength'].default_value=.65
    return m


def panel(name,x,z,w,h,mat,y=1.158):
    return own(box(name,(x,y,z),(w,.00015,h),mat,0),COL)


def label(name,body,x,z,size,mat):
    return text_label(name,body,(x,1.155,z),size,mat,COL,ROT)


def state(objects,photo):
    for o in objects:
        o['monitor_state']='photo' if photo else 'project'
        for frame,show_photo in [(1,False),(129,False),(130,True),(159,True),(160,False),(180,False)]:
            o.hide_render=show_photo!=photo;o.hide_viewport=show_photo!=photo
            o.keyframe_insert(data_path='hide_render',frame=frame)
            o.keyframe_insert(data_path='hide_viewport',frame=frame)
        o.animation_data.action.name=o.name+'_PreviewVisibility'


def main():
    web_boundary();before=digest(SOURCE)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    if scene.get('monitor_window_version')==VERSION:
        print('MONITOR_ALREADY_UPDATED');return
    scene.frame_set(1)
    remove_named('StackScreenSurface')
    background=luminous('Monitor desktop charcoal',(.025,.029,.036))
    chrome=luminous('Monitor window toolbar',(.067,.073,.083))
    sidebar=luminous('Monitor viewer sidebar',(.042,.047,.055))
    ink=luminous('Monitor interface text',(.69,.72,.76))
    muted=luminous('Monitor interface secondary',(.33,.37,.43))
    line=luminous('Monitor interface separators',(.11,.125,.15))
    panel('MonitorUI_Background',.48,1.25,.740,.396,background)
    panel('MonitorUI_Toolbar',.48,1.431,.738,.031,chrome,1.157)
    panel('MonitorUI_Statusbar',.48,1.061,.738,.019,chrome,1.157)
    panel('MonitorUI_ToolbarRule',.48,1.4145,.738,.001,line,1.156)
    for i,(name,color) in enumerate([('Close',(.66,.20,.17)),('Minimize',(.69,.49,.16)),('Expand',(.24,.53,.26))]):
        obj=own(cylinder('MonitorUI_'+name,(.129+i*.013,1.155,1.432),.0035,.0002,luminous('Monitor control '+name,color),24),COL)
        obj.rotation_euler=ROT
    # These are editable screen elements, not a generated or modified screenshot.
    project=fit_image('StackScreenSurface',PUBLIC/'projects/pulsegraph/live-monitor.webp',(.48,1.156,1.243),.724,.336,COL,ROT,.65)
    project['content_resource']='projects/pulsegraph/live-monitor.webp'
    project_title=label('MonitorProject_Title','PulseGraph  /  Live Monitor',.205,1.428,.008,ink)
    project_status=label('MonitorProject_Status','PROJECT WORKSPACE',.128,1.058,.0055,muted)
    state([project,project_title,project_status],False)
    photo_objects=[]
    photo_objects.append(panel('MonitorPhoto_Sidebar',.174,1.243,.122,.337,sidebar,1.156))
    photo_objects.append(panel('MonitorPhoto_SidebarRule',.236,1.243,.001,.337,line,1.1555))
    photo_objects.append(panel('MonitorPhoto_Selection',.174,1.345,.102,.093,line,1.1555))
    original=PUBLIC/'frame/scenery/scenery-05.webp'
    photo_objects.append(fit_image('MonitorPhoto_Thumbnail',original,(.174,1.155,1.351),.067,.073,COL,ROT,.65))
    photo_objects.append(label('MonitorPhoto_ThumbnailName','scenery-05',.133,1.307,.0055,ink))
    image=fit_image('StackPhotoViewerSurface',original,(.54,1.155,1.244),.462,.303,COL,ROT,.65)
    image['content_resource']='frame/scenery/scenery-05.webp'
    photo_objects.append(image)
    photo_objects.append(label('MonitorPhoto_Title','Preview  /  scenery-05.webp',.205,1.428,.008,ink))
    photo_objects.append(label('MonitorPhoto_Fit','FIT',.73,1.428,.0065,ink))
    photo_objects.append(label('MonitorPhoto_ZoomOut','-',.772,1.428,.009,ink))
    photo_objects.append(label('MonitorPhoto_ZoomIn','+',.800,1.428,.009,ink))
    photo_objects.append(label('MonitorPhoto_Status','1206 x 1305 px   /   Fit to window',.128,1.058,.0055,muted))
    state(photo_objects,True)
    screen=bpy.data.objects['StackScreenAnchor']
    corners('StackReading',screen,.738,.394)
    screen['content_role']='Default: PulseGraph workspace. Photo window is a temporary transition state.'
    bpy.context.view_layer.update()
    scene.frame_end=max(scene.frame_end,180)
    for f,n in [(130,'SCREEN / PHOTO VIEWER'),(160,'SCREEN / PROJECT RESTORED')]:scene.timeline_markers.new(n,frame=f)
    close=own(camera('Review_11_MonitorClose',(.48,.19,1.30),(.48,1.16,1.25),42),'08 Model review cameras')
    close['review_frame']=130
    scene['monitor_window_version']=VERSION
    scene['monitor_preview_note']='Frames 1-129 and 160+: project. 130-159: photo viewer. Visibility keys are Blender preview only; website integration must implement the state switch.'
    scene.frame_set(1)
    assert not project.hide_render and image.hide_render
    scene.frame_set(130)
    bpy.context.view_layer.update()
    assert project.hide_render and not image.hide_render
    img=next(n.image for n in image.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
    assert tuple(img.size)==(1206,1305)
    width=max(v.co.x for v in image.data.vertices)-min(v.co.x for v in image.data.vertices)
    height=max(v.co.y for v in image.data.vertices)-min(v.co.y for v in image.data.vertices)
    assert abs(width/height-1206/1305)<1e-5
    scene.frame_set(1)
    assert digest(SOURCE)==before,'Source changed on disk while editing'
    web_boundary()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    OUT.mkdir(parents=True,exist_ok=True)
    report={'version':VERSION,'source':str(SOURCE),'sourceSha256':digest(SOURCE),'default':'PulseGraph project workspace',
            'photoViewerFrames':[130,159],'projectRestoredFrame':160,'photoPixels':list(img.size),
            'photoSurfaceDimensions':[width,height],'previewVisibilityIsBlenderOnly':True,'visualAcceptance':'pending tim'}
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print('MONITOR_UPDATED',report['sourceSha256'],flush=True)


if __name__=='__main__':main()

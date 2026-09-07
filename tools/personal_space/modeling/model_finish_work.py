"""A mechanically coherent deep upper archive drawer and six independent files."""
import math
import bpy
from model_finish_common import (
    own, parent_keep, remove_named, get_material, text_label, key_action, anchor,
    box, rod, empty, fit_image,
)

COL = '06 Work - archive'


def finish_work(public):
    paper = bpy.data.materials['Paper_fiber']
    metal = bpy.data.materials['Charcoal powder coat']
    silver = bpy.data.materials['Brushed hardware']
    red = bpy.data.materials['Archive red']
    ink = get_material('Archive Ink', (.055,.043,.033), roughness=.88)
    # Four small bottom drawers remain; the upper four become one usable file drawer.
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(tuple(f'Drawer_{i:02}_' for i in range(5,9))):
            remove_named(obj.name)
        elif obj.name.startswith(('Drawer handle','Drawer face rivet')) and obj.location.z > .39:
            remove_named(obj.name)
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('ArchiveFolder_', 'ArchiveTab_', 'ArchiveTray')):
            remove_named(obj.name)
    root = anchor('WorkDrawerRoot', (.955,.90,.43), COL)
    parts = [
        ('Work_DrawerBottom', (.955,.90,.43), (.572,.55,.012)),
        ('Work_DrawerLeft', (.674,.90,.56), (.012,.55,.26)),
        ('Work_DrawerRight', (1.236,.90,.56), (.012,.55,.26)),
        ('Work_DrawerRear', (.955,1.169,.56), (.574,.012,.26)),
        ('Work_DrawerFront', (.955,.606,.574), (.598,.023,.313)),
    ]
    for name, loc, size in parts:
        obj = own(box(name,loc,size,metal,.003),COL)
        bpy.context.view_layer.update()
        parent_keep(obj,root)
    label = own(box('Work_DrawerLabelFrame',(.955,.590,.578),(.14,.008,.037),silver,.002),COL)
    insert = own(box('Work_DrawerLabelPaper',(.955,.585,.578),(.122,.002,.025),paper,.0005),COL)
    bpy.context.view_layer.update()
    for obj in (label,insert): parent_keep(obj,root)
    text_label('Work_DrawerLabelText','SELECTED WORK',(.900,.582,.573),.0075,ink,COL,(math.pi/2,0,0),root)
    for x in [.865,1.045]:
        obj = own(rod('Work_HandleMount', (x,.595,.661),(x,.554,.661),.007,silver),COL)
        bpy.context.view_layer.update();parent_keep(obj,root)
    obj=own(rod('Work_HandleGrip',(.865,.554,.661),(1.045,.554,.661),.009,silver),COL)
    bpy.context.view_layer.update();parent_keep(obj,root)
    for side,x in [('Left',.65),('Right',1.26)]:
        own(box('Work_RailFixed_'+side,(x,.94,.47),(.012,.57,.024),silver,.001),COL)
        slider=own(box('Work_RailSliding_'+side,(x,.90,.485),(.010,.52,.014),metal,.001),COL)
        bpy.context.view_layer.update();parent_keep(slider,root)
        bar=own(rod('Work_HangingRail_'+side,(x+(.026 if side=='Left' else -.026),.65,.699),(x+(.026 if side=='Left' else -.026),1.15,.699),.003,silver),COL)
        bpy.context.view_layer.update();parent_keep(bar,root)
    names=['BDI / INFRA SCAN','PULSEGRAPH','EARNLYTICS','FORMULA LAB','MODELING LAB','SCISCOPE']
    cover = None
    for i, title in enumerate(names):
        y=.685+i*.080
        pivot=own(empty('WorkFolderPivot' if i==0 else f'Work_FolderPivot_{i+1:02}',(.955,y,.445)),COL)
        bpy.context.view_layer.update();parent_keep(pivot,root)
        for suffix,offset in [('Front',-.003),('Back',.004)]:
            obj=own(box(f'ArchiveFolder_{i+1:02}_{suffix}',(.955,y+offset,.568),(.496,.002,.228),paper,.0007),COL)
            bpy.context.view_layer.update();parent_keep(obj,pivot)
            if i==0 and suffix=='Front': cover=obj
        tabx=.76+i*.069
        tab=own(box(f'ArchiveTab_{i+1:02}',(tabx,y-.003,.697),(.064,.003,.028),red,.002),COL)
        bpy.context.view_layer.update();parent_keep(tab,pivot)
        text_label(f'Work_TabNumber_{i+1:02}',f'{i+1:02}',(tabx-.018,y-.005,.692),.010,paper,COL,(math.pi/2,0,0),pivot)
        text_label(f'Work_FileTitle_{i+1:02}',title,(.735,y-.0042,.645),.010,ink,COL,(math.pi/2,0,0),pivot)
        text_label(f'Work_FileIndex_{i+1:02}','TIM CAI / PROJECT ARCHIVE',(.735,y-.0042,.623),.0055,ink,COL,(math.pi/2,0,0),pivot)
        # The first real project screenshot gives the cover an identifiable visual, preserving aspect.
        if i==0:
            image=fit_image('Work_CoverEvidence',public/'projects/bdi/spalling.webp',(.955,y-.0045,.537),.32,.11,COL,(math.pi/2,0,0))
            bpy.context.view_layer.update();parent_keep(image,pivot)
            read=anchor('WorkCoverAnchor',(.955,y-.005,.568),COL,(.496,.228),(math.pi/2,0,0))
            bpy.context.view_layer.update();parent_keep(read,pivot)
            origin=tuple(pivot.location)
            key_action(pivot,'location',[(1,origin),(74,origin),(110,(origin[0],origin[1]-.12,origin[2]+.20))],'WorkFolderLift')
    key_action(root,'location',[(1,(.955,.90,.43)),(30,(.955,.90,.43)),(72,(.955,.43,.43)),(120,(.955,.43,.43))],'WorkDrawerOpen')
    return root, cover

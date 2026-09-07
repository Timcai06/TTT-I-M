"""Editable near-field furniture and paper details for Blender review only."""
import math
import bpy
from mathutils import Vector
from model_finish_common import (
    own, parent_keep, remove_named, get_material, shader, text_label,
    key_action, anchor, fit_image, box, rod, tube, lathe, projected_uv,
)


def curved_print(name, center_y, center_z, width, height, mat, inset=0):
    # Shared world-space bend keeps the image attached to its paper backing.
    vertices, faces = [], []
    for j in range(17):
        v=j/16
        z=center_z+(v-.5)*height
        bend=.009*((1.85-z)/.52)**2
        for i in range(5):
            u=i/4
            vertices.append((1.746-inset-bend, center_y+(.5-u)*width, z))
    for j in range(16):
        for i in range(4):
            k=j*5+i
            faces.append((k,k+1,k+6,k+5))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Print UV')
    for face in mesh.polygons:
        face.use_smooth=True
        for loop in face.loop_indices:
            vi=mesh.loops[loop].vertex_index
            uv.data[loop].uv=(vi%5/4,vi//5/16)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return own(obj,'04 Frame - photographs')


def finish_frame(public):
    col='04 Frame - photographs'
    paper=bpy.data.materials['Paper_fiber']
    silver=bpy.data.materials['Brushed hardware']
    for i in range(1,5):
        y=-.40+(i-1)*.43
        old=bpy.data.objects[f'ArchivePhoto_{i:02}']
        mat=old.data.materials[0]
        image=next(n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
        aspect=image.size[0]/image.size[1]
        w=min(.29,.38*aspect);h=w/aspect
        remove_named(old.name);remove_named(f'PhotoMount_{i:02}')
        pivot=anchor('FramePrintPivot' if i==1 else f'FramePrintPivot_{i:02}',(1.739,y,1.85),col)
        backing=curved_print(f'PhotoMount_{i:02}',y,1.58,.35,.49,paper)
        thickness=backing.modifiers.new('Cotton paper thickness','SOLIDIFY');thickness.thickness=.0008
        photo=curved_print(f'ArchivePhoto_{i:02}',y,1.59,w,h,mat,.0012)
        bpy.context.view_layer.update()
        for obj in (backing,photo):parent_keep(obj,pivot)
        entry=anchor('FrameEntryAnchor' if i==1 else f'FrameEntryAnchor_{i:02}',(1.74,y,1.59),col,(w,h),(math.pi/2,0,-math.pi/2))
        bpy.context.view_layer.update();parent_keep(entry,pivot)
        bpy.ops.mesh.primitive_torus_add(major_radius=.022,minor_radius=.0035,major_segments=24,minor_segments=8,location=(1.75,y,1.94),rotation=(math.pi/2,0,0))
        ring=own(bpy.context.object,col);ring.name=f'Frame_RailRing_{i:02}';ring.data.materials.append(silver)
        own(rod(f'Frame_ClipHook_{i:02}',(1.75,y,1.918),(1.739,y,1.882),.003,silver),col)
        # A small ready-to-use settle motion, deliberately separate from navigation.
        key_action(pivot,'rotation_euler',[(1,(0,0,0)),(34,(0,0,0)),(44,(0,.018,0)),(56,(0,-.008,0)),(70,(0,0,0))],f'FramePrintSettle_{i:02}')
    sources=['frame/scenery/scenery-05-720.webp','frame/buildings/03-720.webp']
    graphics=sorted([o for o in bpy.context.scene.objects if o.name.startswith('Back wall graphic')],key=lambda o:o.location.x)
    for i,obj in enumerate(graphics):
        loc=tuple(obj.location);w=obj.dimensions.x;h=obj.dimensions.z
        remove_named(obj.name)
        fit_image(f'Frame_BackWallPrint_{i+1:02}',public/sources[i%2],(loc[0],loc[1]-.002,loc[2]),w,h,col,(math.pi/2,0,0))


def finish_stack(public):
    col='05 Stack - workstation'
    metal=bpy.data.materials['Charcoal powder coat']
    silver=bpy.data.materials['Brushed hardware']
    keymat=get_material('Graphite keycaps',(.031,.034,.036),roughness=.48)
    legend=get_material('Warm key legends',(.62,.60,.54),roughness=.72)
    display=fit_image('StackScreenSurface',public/'projects/pulsegraph/live-monitor.webp',(.48,1.159,1.25),.726,.385,col,(math.pi/2,0,0),.28)
    bpy.context.view_layer.update()
    anchor('StackScreenAnchor',(.48,1.157,1.25),col,(display.dimensions.x,display.dimensions.z),(math.pi/2,0,0))
    own(box('Stack_RearHousing',(.48,1.218,1.25),(.59,.026,.33),metal,.012),col)
    for i in range(15):
        own(box('Stack_RearVent',(.26+i*.031,1.233,1.36),(.017,.002,.040),keymat,.001),col)
    own(box('Stack_DisplayBadge',(.48,1.160,1.038),(.041,.0015,.003),silver,.0005),col)
    led=get_material('Display standby amber',(.23,.10,.03),roughness=.3)
    shader(led).inputs['Emission Color'].default_value=(.7,.27,.06,1)
    shader(led).inputs['Emission Strength'].default_value=.35
    own(box('Stack_StatusLight',(.815,1.159,1.039),(.004,.001,.002),led,.0004),col)
    keyboard=bpy.data.objects['Keyboard'];keyboard.dimensions.y=.225;keyboard.location.y=.754
    rows=['1234567890-=','QWERTYUIOP[]','ASDFGHJKL;\\\'','ZXCVBNM,./<>']
    keys=sorted([o for o in bpy.context.scene.objects if o.name=='Key' or o.name.startswith('Key.')],key=lambda o:(-round(o.location.y,4),o.location.x))
    for index,key in enumerate(keys):
        key.data.materials.clear();key.data.materials.append(keymat)
        row=index//12;column=index%12
        text_label(f'Stack_KeyLegend_{index+1:02}',rows[row][column],(key.location.x-.009,key.location.y-.006,.8655),.008,legend,col)
    own(box('Stack_Spacebar',(.43,.668,.861),(.19,.025,.009),keymat,.002),col)
    for x,label in [(.23,'CTRL'),(.28,'ALT'),(.58,'ALT'),(.635,'FN')]:
        own(box('Stack_ModifierKey',(x,.668,.861),(.035,.025,.009),keymat,.002),col)
        text_label('Stack_ModifierLegend',label,(x-.013,.664,.866),.005,legend,col)
    own(rod('Stack_MouseWheel',(.954,.805,.864),(.966,.805,.864),.006,silver),col)
    own(tube('Stack_MouseSplit',[(.96,.823,.861),(.96,.814,.865),(.96,.814,.861)],.0005,keymat),col)
    own(tube('Stack_PowerLead',[(.48,1.232,1.13),(.50,1.30,.91),(.60,1.30,.83),(.78,1.27,.83),(1.08,1.10,.84)],.0025,metal),col)
    for x in [.23,.285]:
        own(box('Stack_RearPort',(x,1.234,1.11),(.031,.003,.012),silver,.001),col)
    for i in range(4):
        own(box('Stack_DeviceVent',(1.045+i*.019,1.007,.846),(.009,.002,.004),metal,.0005),col)


def finish_paper(public):
    col='03 Life - objects'
    paper=bpy.data.materials['Paper_fiber']
    ink=get_material('Archive Ink',(.055,.043,.033),roughness=.88)
    hinge=bpy.data.objects['LifeEnvelopeHinge']
    remove_named('LifeEnvelopeFlap')
    mesh=bpy.data.meshes.new('Envelope triangular flap')
    mesh.from_pydata([(-.08,0,0),(.08,0,0),(0,-.105,-.0003)],[],[(0,2,1)])
    mesh.update();mesh.materials.append(paper)
    flap=bpy.data.objects.new('LifeEnvelopeFlap',mesh);bpy.context.collection.objects.link(flap)
    flap.parent=hinge;own(flap,col)
    thick=flap.modifiers.new('Paper stock','SOLIDIFY');thick.thickness=.0012
    projected_uv(flap)
    for a,b in [((-1.27,1.195,1.137),(-1.19,1.075,1.137)),((-1.11,1.195,1.137),(-1.19,1.075,1.137))]:
        own(rod('Life_EnvelopeFold',a,b,.0004,ink),col)
    # Replace the insert with an existing personal Life photograph, keeping its action.
    photo=bpy.data.objects['LifeMemoryPhoto']
    mat=bpy.data.materials['ArchivePhoto_04_paper_ink']
    tex=next(n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
    aspect=tex.size[0]/tex.size[1];w=min(.13,.18*aspect)
    photo.data.materials.clear();photo.data.materials.append(mat)
    photo.dimensions.x=w;photo.dimensions.y=w/aspect
    mount=own(box('Life_PhotoPaper',tuple(photo.location), (w+.012,w/aspect+.018,.0008),paper,.0004),col)
    mount.location.z-=.0007
    bpy.context.view_layer.update();parent_keep(mount,photo)
    entry=anchor('LifePhotoAnchor',tuple(photo.location),col,(w,w/aspect))
    bpy.context.view_layer.update();parent_keep(entry,photo)
    # Book remains a physical blank reading surface until approved site integration.
    text_label('About_PageFolio','01 / PERSONAL ARCHIVE',(-.690,.734,.8642),.004,ink,'02 About - notebook')
    own(tube('About_SpineCrease',[(-.713,.73,.864),(-.710,.88,.864),(-.713,1.025,.864)],.0005,ink),'02 About - notebook')
    page=bpy.data.objects.get('NotebookReadingAnchor')
    if page:
        page['surface_width_m']=.266;page['surface_height_m']=.332


def finish_room(public):
    col='01 Furniture and lamp'
    wood=bpy.data.materials['Walnut_oiled']
    metal=bpy.data.materials['Charcoal powder coat']
    ceramic=bpy.data.materials['Ceramic_speckle']
    branch=get_material('Dry branches',(.105,.067,.037),roughness=.89)
    own(lathe('Room_SillVase',(-1.69,-.78,.601),[(0,0),(.042,0),(.046,.02),(.041,.14),(.020,.22),(.019,.225),(.015,.225),(.017,.215),(.037,.14),(.036,.018),(0,.018)],ceramic,32),col)
    for i in range(7):
        theta=i*2.399
        x=-1.69+math.cos(theta)*.085;y=-.78+math.sin(theta)*.19;z=.97+(i%3)*.09
        own(tube('Room_DryStem',[(-1.69,-.78,.70),(-1.69+(x+1.69)*.3,-.78+(y+.78)*.3,.88),(x,y,z)],.0014,branch),col)
        own(rod('Room_Twig',(x,y,z-.045),(x+.025,y+.035,z+.015),.0008,branch),col)
    seat=own(lathe('Room_StoolSeat',(-1.30,-.99,.48),[(0,0),(.17,0),(.18,.01),(.177,.035),(0,.035)],wood,48),col)
    projected_uv(seat,1.8)
    for i in range(3):
        a=i*math.tau/3
        foot=(-1.30+.16*math.cos(a),-.99+.16*math.sin(a),.045)
        top=(-1.30+.10*math.cos(a),-.99+.10*math.sin(a),.484)
        own(rod('Room_StoolLeg',foot,top,.017,metal),col)
    # Shift UV offsets, not color, so floorboards do not repeat the same wood knot.
    for i,obj in enumerate(sorted(bpy.context.scene.objects,key=lambda o:o.name)):
        if obj.name.startswith('Floorboard') and obj.data.uv_layers.active:
            for uv in obj.data.uv_layers.active.data:
                uv.uv.x+=(i*.173)%1;uv.uv.y+=(i*.317)%1
    for name,strength in [('Walnut_oiled',.28),('Plaster_warm',.18),('Paper_fiber',.12),('Rug_archive',.30)]:
        mat=bpy.data.materials.get(name)
        if mat:
            for node in mat.node_tree.nodes:
                if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=strength
    bs=shader(wood);bs.inputs['Coat Weight'].default_value=.12;bs.inputs['Coat Roughness'].default_value=.34
    # The real landscape is visible through the window, behind the window light.
    fit_image('Room_WindowLandscape',public/'frame/scenery/scenery-05-720.webp',(-2.38,-.25,1.55),3.5,2.8,'00 Architecture',(math.pi/2,0,math.pi/2),.35)

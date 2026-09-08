"""Warm industrial study: textiles, joinery and personal objects, in place."""
import bpy
import json
import math
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).parent))
from finish_cinematic_model import SOURCE, ROOT, OUT, digest, contract, web_snapshot
from model_finish_common import own, get_material, fit_image
from primitives import box, rod
from refine_scene import lathe, tube
from cinematic_materials import Surface

VERSION='2026-09-07-warm-archive-1'
COL='13 Warm archive - furnishings'


def put(obj):
    own(obj,COL);obj['warm_archive_detail']=True
    return obj


def fabric(name, vertices, faces, material, thickness=.001):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    mesh.materials.append(material)
    obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj)
    for face in mesh.polygons:face.use_smooth=True
    solid=obj.modifiers.new('Fabric stock','SOLIDIFY');solid.thickness=thickness
    put(obj)
    return obj


def smooth_materials():
    for mat in bpy.data.materials:
        if not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type=='BUMP' and node.name.startswith('Cinema /'):
                node.inputs['Strength'].default_value*=.32
            if node.type=='TEX_NOISE' and node.name.startswith('Cinema /'):
                node.inputs['Detail'].default_value=min(node.inputs['Detail'].default_value,2)
    for name,colors in [
        ('Paper_fiber',[(.76,.72,.635),(.80,.76,.68)]),
        ('Linen_natural',[(.32,.28,.215),(.39,.345,.27)]),
        ('Plaster_warm',[(.355,.327,.282),(.405,.38,.333)]),
    ]:
        mat=bpy.data.materials[name]
        for node in mat.node_tree.nodes:
            if node.type=='VALTORGB' and node.label in ['Natural stock','Lime plaster']:
                for element,color in zip(node.color_ramp.elements,colors):element.color=(*color,1)
    wood=bpy.data.materials['Walnut_oiled']
    ramp=wood.node_tree.nodes.get('Cinema / Walnut heartwood')
    for e,c in zip(ramp.color_ramp.elements,[(.058,.024,.009),(.10,.041,.015),(.145,.064,.025),(.195,.091,.039)]):
        e.color=(*c,1)


def furnish():
    linen=get_material('Warm oatmeal upholstery',(.46,.405,.32),roughness=.86)
    rust=get_material('Warm muted clay wool',(.23,.092,.049),roughness=.91)
    leather=get_material('Warm saddle desk leather',(.12,.065,.034),roughness=.65)
    for mat in [linen,rust,leather]:
        s=Surface(mat.name);s.bump(s.noise(650,2),.000045,.10)
        s.bs.inputs['Sheen Weight'].default_value=.18 if mat!=leather else .03
    wood=bpy.data.materials['Walnut_oiled'];metal=bpy.data.materials['Charcoal powder coat']
    brass=bpy.data.materials['Brushed hardware'];ceramic=bpy.data.materials['Ceramic_speckle']
    paper=bpy.data.materials['Paper_fiber']
    # Parted narrow curtains preserve the central daylight opening and frame view.
    put(rod('Warm_CurtainRail',(-1.69,-1.26,2.56),(-1.69,.75,2.56),.009,metal))
    for side,y0 in [('Front',-1.24),('Rear',.49)]:
        verts=[]
        for j in range(33):
            v=j/32;z=.65+v*1.85
            for i in range(25):
                u=i/24
                x=-1.69+.022*math.sin(u*math.tau*4)*(1+.35*(1-v))
                y=y0+u*.25+.012*math.sin(v*math.pi)*math.sin(u*math.pi)
                verts.append((x,y,z+.007*math.sin(u*math.tau*4)*(1-v)))
        faces=[(j*25+i,j*25+i+1,(j+1)*25+i+1,(j+1)*25+i) for j in range(32) for i in range(24)]
        fabric('Warm_LinenCurtain_'+side,verts,faces,linen,.001)
        for i in range(6):
            y=y0+.02+i*.042
            put(tube('Warm_CurtainLoop_'+side+str(i),[(-1.69,y,2.50),(-1.675,y,2.56),(-1.705,y,2.56),(-1.69,y,2.50)],.002,linen))
    put(box('Warm_ChairSeatCushion',(.22,-.32,.514),(.443,.38,.042),linen,.018))
    # Throw follows the left arm, leaving the back slats and desk sightline open.
    verts=[]
    for j in range(25):
        t=j/24
        x=-.045-.11*math.sin(t*math.pi/2)
        z=.697-.32*t*t
        for i in range(13):
            u=i/12;y=-.45+u*.25
            verts.append((x+.005*math.sin(u*math.tau*3),y,z+.006*math.sin(u*math.tau*3)))
    fabric('Warm_ChairThrow',verts,[(j*13+i,j*13+i+1,(j+1)*13+i+1,(j+1)*13+i) for j in range(24) for i in range(12)],rust,.0018)
    put(box('Warm_WritingMat',(-.58,.91,.8235),(.74,.66,.0016),leather,.0005))
    # Upper joinery adds habitation without occupying chapter interaction surfaces.
    put(box('Warm_UpperShelf',(.30,1.39,2.405),(1.76,.20,.028),wood,.004))
    for x in [-.37,.97]:
        put(box('Warm_ShelfBracket', (x,1.425,2.35),(.022,.13,.11),metal,.002))
    for i in range(6):
        x=-.45+i*.041;h=.19+(i%3)*.025
        put(box('Warm_ShelfBook_%02d'%i,(x,1.40,2.42+h/2),(.03,.135,h),linen if i%2 else rust,.001))
        put(box('Warm_BookSpineRule_%02d'%i,(x,1.331,2.46),(.020,.001,.002),paper,.0002))
    put(lathe('Warm_ShelfBowl',(.64,1.38,2.42),[(0,0),(.055,0),(.076,.037),(.071,.043),(.064,.036),(.048,.008),(0,.008)],ceramic,64))
    put(lathe('Warm_ShelfVase',(.94,1.40,2.42),[(0,0),(.042,0),(.044,.075),(.027,.145),(.027,.15),(.023,.15),(.023,.142),(.038,.074),(.036,.008),(0,.008)],ceramic,64))
    put(box('Warm_MemoryFrame',(.19,1.40,2.515),(.235,.018,.175),wood,.003))
    fit_image('Warm_TeamMemory',ROOT/'apps/landing/public/life/team-photo.webp',(.19,1.389,2.515),.212,.150,COL,(math.pi/2,0,0))
    # Small usable accessories on existing furniture, clear of book/screen/file anchors.
    put(lathe('Warm_StoolPad',(-1.30,-.99,.514),[(0,0),(.151,0),(.159,.010),(.151,.026),(0,.028)],linen,64))
    put(box('Warm_LetterTray',(-.96,1.15,.836),(.20,.21,.025),wood,.008))
    for i in range(3):
        obj=put(box('Warm_StoredLetter_%d'%i,(-.96+i*.003,1.15,.850+i*.001),(.16,.175,.0007),paper,.0003))
        obj.rotation_euler.z=(i-1)*.025
    # Warm shelf practical, with a modeled diffuser instead of a bare floating light.
    glass=get_material('Warm shelf diffuser',(.71,.57,.35),roughness=.6)
    s=Surface(glass.name);s.bs.inputs['Emission Color'].default_value=(1,.64,.30,1);s.bs.inputs['Emission Strength'].default_value=.65
    put(box('Warm_ShelfDiffuser',(.30,1.325,2.389),(1.35,.014,.006),glass,.002))
    data=bpy.data.lights.new('Warm shelf light','AREA');data.energy=6;data.color=(1,.72,.44);data.shape='RECTANGLE';data.size=1.25;data.size_y=.025
    light=bpy.data.objects.new('Warm shelf light',data);bpy.context.scene.collection.objects.link(light);light.location=(.3,1.32,2.38);put(light)


def main():
    before=digest(SOURCE);web=web_snapshot()
    files=sorted(str(p) for p in (ROOT/'art').rglob('*.blend*'))
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE));scene=bpy.context.scene
    if scene.get('warm_archive_version')==VERSION:
        print('WARM_ARCHIVE_ALREADY_SAVED');return
    protected=contract(scene)
    smooth_materials();furnish();scene.frame_set(1)
    bpy.context.view_layer.update()
    assert contract(scene)==protected
    assert web_snapshot()==web and digest(SOURCE)==before
    scene['warm_archive_version']=VERSION
    scene['warm_archive_references']='Norm Architects / Chancery House; FRAMA / Bracket Shelf. Original industrial archive palette retained.'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    assert files==sorted(str(p) for p in (ROOT/'art').rglob('*.blend*'))
    report={'sourceSha256':digest(SOURCE),'previousSourceSha256':before,'version':VERSION,'objects':len(scene.objects),'websiteUnchanged':True,'visualAcceptance':'pending tim','rendered':False}
    (OUT/'warm-furnishing.json').write_text(json.dumps(report,indent=2)+'\n')
    manifest_path=OUT/'model-manifest.json';manifest=json.loads(manifest_path.read_text());manifest['sourceSha256']=report['sourceSha256'];manifest['warmFurnishing']=report
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print('WARM_ARCHIVE_SAVED',json.dumps(report),flush=True)


if __name__=='__main__':main()

"""Desktop tools and the shelf's paper/ceramic objects."""
from common import *

def bezier(a,b,c,d,n=32):
    a,b,c,d=map(Vector,(a,b,c,d))
    return [(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d for t in [i/n for i in range(n+1)]]

def desktop():
    mouse=bpy.data.objects['Mouse'];case=mat('graphite mouse shell',(.025,.033,.036),.39)
    rubber=mat('mouse seams and scroll rubber',(.009,.012,.012),.8)
    grain(case,amount=.12,distance=.000035,frequency=620)
    center=Vector((.96,.79,.831));v=[];f=[];rings=28;sides=72
    for i in range(rings+1):
        theta=math.pi/2*(1-i/rings);radius=max(.0001,math.sin(theta))
        for j in range(sides):
            a=math.tau*j/sides;xx=.026*radius*math.cos(a)*(1-.07*math.sin(a));yy=.045*radius*math.sin(a)
            zz=.003+.027*math.cos(theta)*(1-.13*yy/.045)
            v.append(center+Vector((xx,yy,zz)))
    for i in range(rings):
        for j in range(sides):f.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    f.append(tuple(reversed(range(sides))))
    mesh('Mouse',v,f,case,smooth=True)
    def top(x,y):return .834+.027*math.sqrt(max(0,1-(x/.026)**2-(y/.045)**2))*(1-.13*y/.045)
    tube(PREFIX+'mouse button split',[(.96,.79+y,top(0,y)+.00015) for y in [.004+i*.037/30 for i in range(31)]],.00038,rubber,mouse,8)
    tube(PREFIX+'mouse transverse joint',[(.96+x,.784,top(x,-.006)+.00016) for x in [-.024+i*.048/48 for i in range(49)]],.00025,rubber,mouse,8)
    axis=Vector((0,0,1)).rotation_difference(Vector((1,0,0))).to_matrix()
    lathe(PREFIX+'scroll wheel',[(.0001,-.003),(.0045,-.003),(.005,-.002),(.005,.002),(.0045,.003),(.0001,.003)],(.96,.809,.858),rubber,mouse,48,axis)
    wheelink=mat('scroll ribs',(.055,.062,.06),.7)
    for j in range(16):
        a=math.tau*j/16
        tube(PREFIX+'scroll tread %02d'%j,[(.957,.809+.0051*math.cos(a),.858+.0051*math.sin(a)),(.963,.809+.0051*math.cos(a),.858+.0051*math.sin(a))],.00022,wheelink,mouse,6)
    pad=bpy.data.objects['Mouse mat'];felt=mat('sage felt desk pad',(.13,.16,.14),.94);grain(felt,amount=.28,distance=.00015,frequency=650)
    box('Mouse mat',(.96,.78,.827),(.28,.22,.005),felt,bevel=.002)
    hem=mat('felt edge thread',(.24,.265,.224),.94)
    points=[]
    for cx,cy,start in [(1.092,.882,0),(.828,.882,90),(.828,.678,180),(1.092,.678,270)]:
        for j in range(13):
            a=math.radians(start+j*90/12);points.append((cx+.006*math.cos(a),cy+.006*math.sin(a),.8294))
    points.append(points[0]);tube(PREFIX+'mouse pad bound seam',points,.00045,hem,pad,6)
    cable=mat('muted brick braided cable',(.19,.047,.029),.75);grain(cable,amount=.2,distance=.00008,frequency=850)
    p=bezier((1.135,1.05,.839),(1.23,1.075,.827),(1.31,1.07,.825),(1.316,.94,.825))
    tube('Signal cable',p,.0022,cable)
    p=bezier((1.316,.94,.825),(1.32,.79,.825),(1.319,.67,.825),(1.32,.59,.825))
    p+=bezier((1.32,.59,.825),(1.32,.548,.825),(1.32,.545,.797),(1.317,.552,.739))[1:]
    tube('Signal cable edge',p,.0022,cable)
    connector=mat('connector graphite',(.028,.035,.034),.6)
    box(PREFIX+'cable strain relief',(1.140,1.05,.839),(.012,.008,.007),connector,bevel=.002)
    # A shallow bevel around the keyboard case distinguishes case and bottom shell.
    keyboard=bpy.data.objects['Keyboard'];housing=mat('keyboard satin housing',(.032,.043,.045),.48)
    assign(keyboard,housing)
    tube(PREFIX+'keyboard case seam',[(.204,.646,.842),(.676,.646,.842)],.00055,rubber,keyboard,8)
    print('Desktop: curved mouse, button seams, scroll wheel, felt pad and resting cable')

def life_objects():
    cup=bpy.data.objects['Life cup ceramic']
    glaze=mat('warm stoneware glaze',(.29,.23,.151),.29)
    nodes,links=glaze.node_tree.nodes,glaze.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    if not nodes.get('Glaze pooling'):
        noise=nodes.new('ShaderNodeTexNoise');noise.name='Glaze pooling';noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=3
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.22,.164,.101,1);ramp.color_ramp.elements[1].color=(.34,.273,.19,1)
        links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color'])
    grain(glaze,amount=.14,distance=.00007,frequency=320);bs.inputs['Coat Weight'].default_value=.15;bs.inputs['Coat Roughness'].default_value=.25
    profile=[(.0001,0),(.034,0),(.039,.003),(.042,.012),(.047,.098),(.0495,.115),(.049,.120),(.0468,.122),(.0445,.119),(.043,.110),(.038,.021),(.0001,.018)]
    lathe('Life cup ceramic',profile,(-1.37,1.07,1.107),glaze,cup,96)
    assign(bpy.data.objects['Life cup handle'],glaze)
    for i,z in enumerate([1.133,1.208]):
        axis=Vector((0,0,1)).rotation_difference(Vector((1,0,0))).to_matrix()
        lathe(PREFIX+'handle join %d'%i,[(.0001,-.003),(.007,-.003),(.009,0),(.007,.003),(.0001,.004)],(-1.324,1.07,z),glaze,cup,48,axis)
    coffee=mat('deep coffee meniscus',(.022,.009,.0035),.20)
    liquid=lathe('Life coffee',[(.0001,0),(.035,0),(.041,.0002),(.043,.0012)],(-1.37,1.07,1.201),coffee,cup,96)
    bm=bmesh.new();bm.from_mesh(liquid.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(liquid.data);bm.free()
    grain(coffee,amount=.06,distance=.000012,frequency=55)
    paper=mat('warm folded paper',(.68,.624,.50),.89);grain(paper,amount=.2,distance=.00007,frequency=730)
    ink=mat('map charcoal print',(.075,.093,.077),.92);blue=mat('map river ink',(.085,.18,.18),.92);faint=mat('map contour ink',(.32,.35,.24),.93)
    atlas=bpy.data.objects['Life folded map'];v=[];f=[]
    def height(x,y,layer=2):
        u=(x+1.67)/.2
        folded=abs(((u*3)%1)-.5)*.003
        return 1.113+layer*.002+folded+.0005*math.sin(y*45)
    for layer in range(3):
        off=len(v);nx=30;ny=30
        for i in range(nx+1):
            for j in range(ny+1):
                x=-1.669+i*.198/nx;y=.947+j*.226/ny
                v.append((x,y,height(x,y,layer)))
        for i in range(nx):
            for j in range(ny):a=off+i*(ny+1)+j;f.append((a,a+ny+1,a+ny+2,a+1))
    mesh(atlas.name,v,f,paper,smooth=True)
    if not any(m.type=='SOLIDIFY' for m in atlas.modifiers):
        mod=atlas.modifiers.new('Folded paper stock','SOLIDIFY');mod.thickness=.00025
    # An original schematic map, not a geographic claim or borrowed map image.
    for k in range(7):
        pts=[]
        for i in range(65):
            t=i/64;x=-1.652+.165*t;y=.967+k*.021+.005*math.sin(t*7+k*.8)
            pts.append((x,y,height(x,y)+.00025))
        tube(PREFIX+'map contour %02d'%k,pts,.00023,faint,atlas,5)
    pts=[]
    for i in range(81):
        t=i/80;y=.961+.185*t;x=-1.56+.022*math.sin(t*5+.4)
        pts.append((x,y,height(x,y)+.0005))
    tube(PREFIX+'map river',pts,.00125,blue,atlas,8)
    for k in range(4):
        x=-1.647+k*.043
        tube(PREFIX+'map street %d'%k,[(x,y,height(x,y)+.0004) for y in [.970+i*.17/24 for i in range(25)]],.00045,ink,atlas,5)
    text('map title','WALKING ATLAS',(-1.571,1.153,1.121),.008,ink,atlas)
    text('map edition','FIELD NOTES / 01',(-1.571,.957,1.121),.0048,ink,atlas)
    envelope=bpy.data.objects['Life envelope'];assign(envelope,paper)
    for name in ['LifeEnvelopeFlap','Life_PocketFold_Left','Life_PocketFold_Right','Life_PocketLowerFold']:
        o=bpy.data.objects.get(name)
        if o and o.type=='MESH':assign(o,paper)
    # Keep the existing hinge and photo anchors; print rests on the static body.
    stamp=mat('envelope ochre stamp',(.35,.22,.08),.9)
    box(PREFIX+'envelope stamp',(-1.137,1.021,1.1312),(.024,.029,.00022),stamp,envelope,bevel=.0005)
    attach(text('stamp number','01',(-1.137,1.021,1.1315),.010,paper,envelope),envelope)
    attach(text('envelope address','PERSONAL ARCHIVE',(-1.196,1.063,1.1315),.006,ink,envelope),envelope)
    for k in range(3):
        o=tube(PREFIX+'envelope address line %d'%k,[(-1.227,1.043-k*.007,1.1314),(-1.175,1.043-k*.007,1.1314)],.00018,faint,envelope,5);attach(o,envelope)
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('Life_EnvelopeFold'):
            subtle=mat('paper crease',(.38,.339,.266),.94);assign(o,subtle)
    print('Life objects: stoneware rim and glaze, coffee meniscus, folded printed atlas and envelope')

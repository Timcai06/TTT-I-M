"""Cabinet assembly and window joinery, retaining moving-object hierarchies."""
from common import *

def details():
    cabinet=mat('fine graphite cabinet enamel',(.030,.037,.038),.53,.18);grain(cabinet,amount=.14,distance=.000035,frequency=550)
    nickel=mat('brushed cabinet nickel',(.28,.30,.285),.34,.80);grain(nickel,(1,16,1),.10,.00002,400)
    dark=mat('hardware recesses',(.008,.011,.011),.86)
    label=mat('archive label stock',(.64,.595,.485),.94);grain(label,amount=.14,distance=.000025,frequency=1000)
    for o in list(bpy.context.scene.objects):
        if not o.visible_get() or o.type!='MESH':continue
        if o.name.startswith('Cabinet ') or (o.name.startswith('Drawer_') and o.name.endswith('_front')) or o.name=='Work_DrawerFront':assign(o,cabinet)
        if o.name.startswith(('Drawer handle','Work_Handle','Drawer face rivet')) or (o.name.startswith('Drawer_') and o.name.endswith('_label')):assign(o,nickel)
        if o.name.startswith('Drawer_') and o.name.endswith('_label_insert'):assign(o,label)
    ref=bpy.data.objects['Cabinet left']
    for i,z in enumerate([.1455,.2265,.3075,.407]):
        box(PREFIX+'cabinet reveal %02d'%i,(.955,.621,z),(.60,.008,.010 if i<3 else .045),dark,ref,.001)
    box(PREFIX+'cabinet lower folded rail',(.955,.618,.052),(.603,.018,.022),cabinet,ref,.0015)
    for i in range(4):
        name='Drawer handle'+('' if i==0 else '.%03d'%i);o=bpy.data.objects[name];lo,hi=bounds(o);z=(lo.z+hi.z)/2
        for side,x in enumerate([.897,1.013]):
            mount=box(PREFIX+'drawer grip mount %d %d'%(i,side),(x,.589,z),(.011,.019,.014),nickel,o,.002)
            attach(mount,o)
            axis=Vector((0,0,1)).rotation_difference(Vector((0,-1,0))).to_matrix()
            screw=lathe(PREFIX+'drawer mount screw %d %d'%(i,side),[(.0001,0),(.0025,0),(.0028,.0008),(.002,.0014),(.0001,.0014)],(x,.579,z),nickel,o,24,axis)
            attach(screw,o)
        front=bpy.data.objects['Drawer_%02d_front'%(i+1)]
        # Folded lower lip gives the enamel panel a readable edge.
        lip=box(PREFIX+'drawer folded lip %d'%i,(.955,.612,.073+i*.081),(.575,.012,.003),cabinet,front,.0008);attach(lip,front)
    # Existing top-drawer labels and the rail animation remain attached to their root.
    root=bpy.data.objects['WorkDrawerRoot']
    for x in [.865,1.045]:
        plate=box(PREFIX+'top grip escutcheon %.3f'%x,(x,.596,.661),(.022,.003,.028),nickel,root,.002);attach(plate,root)
    gasket=mat('matte EPDM window gasket',(.010,.014,.013),.90)
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('BackWindow_Seal_'):
            deform(o,lambda p:(p.x,p.y+.097,p.z));assign(o,gasket)
    frame=mat('satin anodised window fittings',(.045,.055,.054),.38,.70)
    for i in range(1,4):
        glass=bpy.data.objects['BackWindow_Glass_%d'%i];lo,hi=bounds(glass)
        for z in [lo.z+.003,hi.z-.003]:box(PREFIX+'window seal %d %.3f'%(i,z),((lo.x+hi.x)/2,1.509,z),(hi.x-lo.x,.006,.006),gasket,glass,.0008)
    for i in range(1,3):
        plate=bpy.data.objects['WindowJoinery_HandlePlate_%d'%i];assign(plate,frame);lo,hi=bounds(plate);x=(lo.x+hi.x)/2
        pts=[(x,1.315,1.394),(x,1.305,1.394),(x,1.297,1.392),(x,1.292,1.387),(x,1.291,1.379),(x,1.291,1.341)]
        tube('WindowJoinery_Handle_%d'%i,pts,.0055,frame,plate,32)
        for z in [1.348,1.412]:
            axis=Vector((0,0,1)).rotation_difference(Vector((0,-1,0))).to_matrix()
            lathe(PREFIX+'window screw %d %.3f'%(i,z),[(.0001,0),(.0022,0),(.0025,.0006),(.002,.001),(.0001,.001)],(x,1.311,z),nickel,plate,24,axis)
            box(PREFIX+'window screw slot %d %.3f'%(i,z),(x,1.3099,z),(.0025,.0002,.00032),dark,plate,0)
    for i,x in enumerate([-1.021,1.421]):
        for j,z in enumerate([1.02,2.33]):
            tube(PREFIX+'window hinge barrel %d %d'%(i,j),[(x,1.367,z-.023),(x,1.367,z+.023)],.0065,frame,ref,32)
            box(PREFIX+'window hinge plate %d %d'%(i,j),(x,1.374,z),(.023,.004,.049),frame,ref,.0015)
    print('Hardware: cabinet reveals, folded lips, grip mounts, labels, window gaskets, handles and hinges')

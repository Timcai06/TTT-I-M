"""Chair construction and textiles, with deterministic shapes."""
from common import *

def chair():
    wood=bpy.data.materials['Walnut_oiled']
    fabric=mat('oatmeal woven cushion',(.44,.385,.29),.88);grain(fabric,(1,1,1),.25,.00024,440)
    seam=mat('unbleached seams',(.32,.27,.19),.91)
    metal=mat('satin chair steel',(.035,.042,.043),.42,.45)
    rubber=mat('soft caster rubber',(.019,.022,.021),.9)
    for i in range(5):
        o=bpy.data.objects['Chair back slat'+('' if i==0 else '.%03d'%i)]
        lo,hi=bounds(o);cx=(lo.x+hi.x)/2;cz=(lo.z+hi.z)/2
        verts=[];faces=[];n=30
        for k in range(n+1):
            u=-1+2*k/n;x=cx+u*.2375;y=-.520-.026*(1-u*u)
            for dy,dz in [(-.0175,-.035),(.0175,-.035),(.0175,.035),(-.0175,.035)]:
                verts.append((x,y+dy,cz+dz))
            if k:
                for j in range(4):a=(k-1)*4+j;b=(k-1)*4+(j+1)%4;faces.append((a,b,b+4,a+4))
        faces += [(3,2,1,0),tuple(n*4+j for j in range(4))]
        mesh(o.name,verts,faces,wood,bevel=.0023)
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('Chair slat rivet'):
            deform(o,lambda p: (p.x,p.y-.026*(1-((p.x-.22)/.2375)**2),p.z))
    cushion=bpy.data.objects['Warm_ChairSeatCushion']
    v=[];f=[];profile=[(.0001,-.004),(.85,-.004),(1,.003),(1,.011),(.94,.027),(.74,.037),(.4,.034),(.0001,.031)]
    for r,z in profile:
        for j in range(96):
            a=math.tau*j/96;cc=math.cos(a);ss=math.sin(a)
            x=.22+.220*r*math.copysign(abs(cc)**.40,cc);y=-.32+.188*r*math.copysign(abs(ss)**.40,ss)
            v.append((x,y,.499+z-.003*r*math.sin(a+.5)))
    for i in range(len(profile)-1):
        for j in range(96):f.append((i*96+j,i*96+(j+1)%96,(i+1)*96+(j+1)%96,(i+1)*96+j))
    mesh(cushion.name,v,f,fabric,smooth=True)
    ring=[]
    for j in range(129):
        a=math.tau*j/128;cc=math.cos(a);ss=math.sin(a)
        ring.append((.22+.219*math.copysign(abs(cc)**.40,cc),-.32+.187*math.copysign(abs(ss)**.40,ss),.510-.003*math.sin(a+.5)))
    tube(PREFIX+'cushion piping',ring,.00135,seam,cushion)
    for i in range(5):
        name='Chair caster'+('' if i==0 else '.%03d'%i);o=bpy.data.objects[name]
        a=i*math.tau/5;c=Vector((.22+.30*math.cos(a),-.32+.30*math.sin(a),.076))
        axle=Vector((-math.sin(a),math.cos(a),0));rot=Vector((0,0,1)).rotation_difference(axle).to_matrix()
        vv=[];ff=[]
        for side in [-1,1]:
            center=c+axle*side*.016
            profile=[(.0001,-.009),(.025,-.009),(.030,-.005),(.030,.005),(.025,.009),(.0001,.009)]
            n=48;off=len(vv)
            vv += [center+rot@Vector((r*math.cos(math.tau*j/n),r*math.sin(math.tau*j/n),z)) for r,z in profile for j in range(n)]
            ff += [tuple(off+k for k in (q*n+j,q*n+(j+1)%n,(q+1)*n+(j+1)%n,(q+1)*n+j)) for q in range(len(profile)-1) for j in range(n)]
        mesh(name,vv,ff,rubber,smooth=True)
        tube(PREFIX+'caster axle %02d'%i,[c-axle*.030,c+axle*.030],.007,metal,o,24)
        tube(PREFIX+'caster swivel %02d'%i,[c+Vector((0,0,.013)),c+Vector((0,0,.04))],.010,metal,o,24)
    # The throw passes over the left arm before falling; it is not a hanging plane.
    throw=bpy.data.objects['Warm_ChairThrow'];cloth=mat('muted clay woven throw',(.25,.105,.069),.94);grain(cloth,(1,1,1),.24,.00032,340)
    v=[];f=[];rows=64;cols=24
    def point(t,u):
        if t<.22:
            q=t/.22;x=.025-.065*q;z=.686+.014*math.sin(q*math.pi/2)
        elif t<.43:
            q=(t-.22)/.21;x=-.040-.033*math.sin(q*math.pi/2);z=.700-.045*(1-math.cos(q*math.pi/2))
        else:
            q=(t-.43)/.57;x=-.073-.012*math.sin(q*math.pi);z=.655-.292*q
        fold=.006*math.sin(u*math.pi*3+.3)+.003*math.sin(u*math.pi*7+t*3)
        x=x+fold*(.4+.6*t);y=-.32+u*.126;z=z+.005*u+.008*math.sin(u*5)*t*t
        # Clearance from the real cylindrical arm, including cloth thickness.
        if abs(x+.045)<.020 and -.48<y<-.13 and z>.66:
            z=max(z,.681+math.sqrt(max(0,.020**2-(x+.045)**2)))
        return (x,y,z)
    for i in range(rows+1):
        for j in range(cols+1):v.append(point(i/rows,-1+2*j/cols))
    for i in range(rows):
        for j in range(cols):a=i*(cols+1)+j;f.append((a,a+1,a+cols+2,a+cols+1))
    mesh(throw.name,v,f,cloth,smooth=True)
    for mod in throw.modifiers:
        if mod.type=='SOLIDIFY':mod.thickness=.002
    for side in [-1,1]:tube(PREFIX+'throw hem '+str(side),[point(i/64,side*.985) for i in range(65)],.0009,seam,throw)
    for j in range(23):
        u=-.94+j*1.88/22;p=Vector(point(1,u))
        tube(PREFIX+'throw fringe %02d'%j,[p,p+Vector((.001*math.sin(j),.001,.008*-1)),p+Vector((.002*math.sin(j),.002,-.014))],.00055,seam,throw,6)
    print('Chair: curved slats, shaped cushion, twin-wheel casters and draped throw')

def textiles():
    linen=mat('warm flax curtains',(.56,.50,.39),.92);grain(linen,(1,1,1),.22,.00016,520)
    bs=next(n for n in linen.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Subsurface Weight'].default_value=.05
    seam=mat('flax hem thread',(.39,.335,.25),.93)
    names=['Warm_LinenCurtain_Front','Warm_LinenCurtain_Rear','BackWindow_CurtainLeft','BackWindow_CurtainRight']
    for index,name in enumerate(names):
        o=bpy.data.objects[name];pts=[o.matrix_world@v.co for v in base(o).vertices]
        lo=Vector([min(p[k] for p in pts) for k in range(3)]);hi=Vector([max(p[k] for p in pts) for k in range(3)]);side=index<2
        a0=lo.y if side else lo.x;a1=hi.y if side else hi.x
        z0=lo.z;z1=hi.z;fixed=(lo.x+hi.x)/2 if side else (lo.y+hi.y)/2
        rows=64;cols=48;v=[];f=[]
        def point(t,u):
            # t is distance below the hanging line; small spread at the hem.
            width=(a1-a0)*(1+.09*t*t);along=(a0+a1)/2+(u-.5)*width
            wave=.019*math.sin(u*math.tau*5+.12*math.sin(t*4+index))+.006*math.sin(u*math.tau*9+.8)
            wave*=.72+.28*t
            sag=.009*(math.sin(u*math.pi*5)**2)*(1-t)**7
            z=z1-(z1-z0)*t-sag+.010*math.sin(u*8+index)*t**9
            depth=fixed+wave+.006*math.sin(t*math.pi)*math.sin(u*math.pi)
            return (depth,along,z) if side else (along,depth,z)
        for i in range(rows+1):
            for j in range(cols+1):v.append(point(i/rows,j/cols))
        for i in range(rows):
            for j in range(cols):a=i*(cols+1)+j;f.append((a,a+1,a+cols+2,a+cols+1))
        mesh(name,v,f,linen,smooth=True)
        for mod in o.modifiers:
            if mod.type=='SOLIDIFY':mod.thickness=.0013
            elif mod.type=='SUBSURF':mod.levels=1;mod.render_levels=1
        for t in [.985,.016]:tube(PREFIX+'curtain hem %d %.3f'%(index,t),[point(t,j/96) for j in range(97)],.00085,seam,o,6)
    rug=bpy.data.objects['Rug'];m=mat('heather oatmeal rug',(.31,.295,.255),.96);grain(m,(1,1,1),.34,.0005,700)
    # Lower-contrast woven field replaces the geometric checker material.
    nodes,links=m.node_tree.nodes,m.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    if not nodes.get('Heather variation'):
        n=nodes.new('ShaderNodeTexNoise');n.name='Heather variation';n.inputs['Scale'].default_value=9;n.inputs['Detail'].default_value=3
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.26,.245,.211,1);ramp.color_ramp.elements[1].color=(.34,.323,.28,1)
        links.new(n.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color'])
    nx,ny=70,48;verts=[];faces=[]
    def rug_height(x,y):
        contact=1-math.exp(-((x-.22)**2+(y+.32)**2)/.16)
        return .046+.0015*math.sin(x*2.8)*math.sin(y*4)*contact
    for i in range(nx+1):
        for j in range(ny+1):
            x=-1.17+2.34*i/nx;y=-1.365+1.49*j/ny;verts.append((x,y,rug_height(x,y)))
    for i in range(nx):
        for j in range(ny):a=i*(ny+1)+j;faces.append((a,a+ny+1,a+ny+2,a+1))
    mesh('Rug',verts,faces,m,smooth=True)
    if not any(mod.type=='SOLIDIFY' for mod in rug.modifiers):
        mod=rug.modifiers.new('Woven rug thickness','SOLIDIFY');mod.thickness=.014;mod.offset=-1

    binding=mat('woven rug binding',(.23,.218,.19),.96);grain(binding,amount=.2,distance=.00022,frequency=800)
    positions=[((-1.157,-.62,.045),(.022,1.46,.004)),((1.157,-.62,.045),(.022,1.46,.004)),((0,-1.352,.045),(2.32,.022,.004)),((0,.112,.045),(2.32,.022,.004))]
    for i,(pos,size) in enumerate(positions):box('Rug border'+('' if i==0 else '.%03d'%i),pos,size,binding,bevel=.0015)
    for o in list(bpy.context.scene.objects):
        if o.name.startswith('Cinema_RugFringe'):
            deform(o,lambda p: (p.x,p.y+(.272 if p.y>-.62 else 0),p.z))
            assign(o,binding)
    print('Textiles: four irregularly gathered curtains, hems and bound heather rug')

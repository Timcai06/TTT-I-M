"""Reference-white probes: verify Blender flux conversion against three's BRDF."""
import bpy, math, json
from pathlib import Path
import numpy as np
import sys
sys.path.insert(0,str(Path(__file__).parent))
from bake_light_falloff import finite_falloff
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=16
s.world=bpy.data.worlds.new('Black');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=0
bpy.ops.mesh.primitive_plane_add(size=.02)
plane=bpy.context.object;mat=bpy.data.materials.new('Reference white');mat.use_nodes=True;plane.data.materials.append(mat)
nodes,links=mat.node_tree.nodes,mat.node_tree.links
bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=1
img=bpy.data.images.new('Probe',width=16,height=16,float_buffer=True);img.colorspace_settings.name='Non-Color'
tex=nodes.new('ShaderNodeTexImage');tex.image=img;nodes.active=tex
light=bpy.data.lights.new('Reference point','POINT');obj=bpy.data.objects.new('Reference point',light);s.collection.objects.link(obj)
light.shadow_soft_size=0;light.energy=4*math.pi;obj.location=(0,0,1)
s.render.bake.use_pass_direct=True;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=False
results=[]
for kind in ['POINT','SPOT']:
    light=bpy.data.lights.new('Reference '+kind,kind);obj.data=light
    light.shadow_soft_size=0;light.energy=4*math.pi
    if kind=='SPOT':light.spot_size=1.7;light.spot_blend=1
    finite_falloff(light,2.5)
    for distance in [.5,1.,2.]:
        obj.location.z=distance
        bpy.ops.object.bake(type='DIFFUSE')
        values=np.array(img.pixels[:]).reshape(16,16,4)[4:12,4:12,:3]
        actual=float(values.mean());expected=(max(1-(distance/2.5)**4,0))**2/(math.pi*distance**2)
        results.append({'kind':kind,'distance':distance,'actual':actual,'expected':expected,'ratio':actual/expected})
        print('LIGHT_PROBE',results[-1],flush=True)
    if kind=='SPOT':
        for angle in [.3,.55,.75]:
            obj.location=(math.sin(angle),0,math.cos(angle))
            bpy.ops.object.bake(type='DIFFUSE')
            actual=float(np.array(img.pixels[:]).reshape(16,16,4)[4:12,4:12,:3].mean())
            weight=(math.cos(angle)-math.cos(.85))/(1-math.cos(.85));cone=weight*weight*(3-2*weight)
            expected=(1-(1/2.5)**4)**2/math.pi*math.cos(angle)*cone
            results.append({'kind':kind,'angle':angle,'actual':actual,'expected':expected,'ratio':actual/expected})
            print('LIGHT_PROBE',results[-1],flush=True)
out=Path(__file__).resolve().parents[3]/'output/material-optimization/light-calibration.json'
out.write_text(json.dumps(results,indent=2))

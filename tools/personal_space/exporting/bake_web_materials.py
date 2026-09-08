"""Bake editable cinema shaders to portable PBR maps; never save the source."""
from pathlib import Path
import json, hashlib
import bpy

ROOT=Path(__file__).resolve().parents[3]
SOURCE=ROOT/'art/personal-archive/source/tim-cai-personal-archive.blend'
OUT=ROOT/'art/personal-archive/textures/web-cinema'
source_sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
materials=[m for m in bpy.data.materials if m.get('cinematic_surface') and 'paper_ink' not in m.name and not m.name.startswith('Leaf_')]
names=[m.name for m in materials]
# Bake in an isolated scene with no room geometry, lights, volume or camera.
scene=bpy.data.scenes.new('Web material bake workspace')
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.cycles.device='GPU'
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='METAL'
scene.render.bake.margin=8
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,0))
plane=bpy.context.object
# The UV domain is a 1 metre material swatch. Export uses the existing metric UVs.
for vertex in plane.data.vertices:vertex.co.x+=.5;vertex.co.y+=.5
OUT.mkdir(parents=True,exist_ok=True)
report={}
for material in materials:
    bs=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    output=next(n for n in material.node_tree.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output)
    nodes,links=material.node_tree.nodes,material.node_tree.links
    original=output.inputs['Surface'].links[0].from_socket
    plane.data.materials.clear();plane.data.materials.append(material)
    record={}
    for channel,input_name in [('color','Base Color'),('roughness','Roughness'),('normal',None)]:
        size=2048 if material.name=='Walnut_oiled' and channel=='color' else 1024
        image=bpy.data.images.new('WebBake_'+material.name+'_'+channel,width=size,height=size,alpha=False)
        if channel!='color':image.colorspace_settings.name='Non-Color'
        target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target;target.select=True
        emit=None
        if input_name:
            emit=nodes.new('ShaderNodeEmission')
            socket=bs.inputs[input_name]
            if socket.is_linked:links.new(socket.links[0].from_socket,emit.inputs['Color'])
            else:
                value=socket.default_value
                emit.inputs['Color'].default_value=tuple(value) if input_name=='Base Color' else (value,value,value,1)
            links.new(emit.outputs[0],output.inputs['Surface'])
        else:links.new(original,output.inputs['Surface'])
        bpy.context.view_layer.objects.active=plane;plane.select_set(True)
        bpy.ops.object.bake(type='NORMAL' if channel=='normal' else 'EMIT')
        slug=material.name.lower().replace(' ','-').replace('/','-')
        path=OUT/(slug+'-'+channel+'.png')
        image.filepath_raw=str(path);image.file_format='PNG';image.save()
        record[channel]=str(path.relative_to(ROOT))
        nodes.remove(target)
        if emit:nodes.remove(emit)
        bpy.data.images.remove(image)
        links.new(original,output.inputs['Surface'])
    report[material.name]=record
    print('MATERIAL_BAKED',material.name,flush=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_sha
(OUT/'manifest.json').write_text(json.dumps({'sourceSha256':source_sha,'materials':report,'method':'Cycles material swatches; no room light baked; original model unchanged'},indent=2)+'\n')
print('MATERIAL_BAKES_COMPLETE',len(report),flush=True)

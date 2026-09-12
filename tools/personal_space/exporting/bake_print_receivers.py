"""Rebake existing receiver UVs without movable prints; never re-export geometry.

Run after bake_sunrise.py. Its saved transport scene and UV sidecars are required.
Only the wood, plaster and static paper atlases change. Other bakes stay intact.
"""
from pathlib import Path
import json
import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'output/material-optimization/bake'
OUT = ROOT / 'output/print-lighting'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'sunrise-bake-workspace.blend'))
scene = bpy.context.scene
scene.cycles.samples = 256
scene.cycles.use_adaptive_sampling = False
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'
prefs.get_devices()
for device in prefs.devices:
    device.use = device.type == 'METAL'
scene.cycles.device = 'GPU'
hidden = []
for obj in scene.objects:
    if obj.name.startswith(('ArchivePhoto_', 'PhotoMount_', 'LifeMemoryPhoto__', 'Life_PhotoPaper__', 'LifeEnvelopeFlap__')):
        obj.hide_render = True
        hidden.append(obj.name)
assert len(hidden) == 11, hidden


def coverage(objects, size):
    """Atlas coverage plus the same eight-pixel padding as the original bake."""
    mask = np.zeros((size, size), bool)
    for obj in objects:
        values = np.empty(len(obj.data.loops) * 2, np.float32)
        obj.data.uv_layers['UV2'].data.foreach_get('uv', values)
        for tri in values.reshape(-1, 3, 2) * size - .5:
            lo = np.maximum(np.floor(tri.min(axis=0)).astype(int), 0)
            hi = np.minimum(np.ceil(tri.max(axis=0)).astype(int), size - 1)
            if np.any(hi < lo):
                continue
            y, x = np.mgrid[lo[1]:hi[1]+1, lo[0]:hi[0]+1]
            edges = []
            for i in range(3):
                a, b = tri[i], tri[(i+1) % 3]
                edges.append((b[0]-a[0]) * (y-a[1]) - (b[1]-a[1]) * (x-a[0]))
            e = np.stack(edges)
            mask[lo[1]:hi[1]+1, lo[0]:hi[0]+1] |= (e >= -1e-5).all(axis=0) | (e <= 1e-5).all(axis=0)
    for _ in range(8):
        p = np.pad(mask, 1)
        mask = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return mask


report = {'samples': 256, 'hidden': hidden, 'unchangedUVs': True, 'materials': {}}
for mi in (3, 4, 5):
    objects = [o for o in scene.objects if o.get('gltf_material') == mi and not o.hide_render]
    assert objects
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
        obj.data.uv_layers.active_index = 2
    bpy.context.view_layer.objects.active = objects[0]
    mat = objects[0].data.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    output = nodes.get('Material Output')
    original = output.inputs['Surface'].links[0].from_socket
    record = {'name': mat.name}
    size = 1024
    for channel in ('ao', 'indirect'):
        image = bpy.data.images.new(f'PrintReceiver_{mi}_{channel}', width=size, height=size, alpha=False, float_buffer=True)
        image.colorspace_settings.name = 'Non-Color'
        target = nodes.new('ShaderNodeTexImage')
        target.image = image
        nodes.active = target
        ao = emit = None
        if channel == 'ao':
            ao = nodes.new('ShaderNodeAmbientOcclusion')
            ao.inputs['Distance'].default_value = .18
            ao.samples = 64
            emit = nodes.new('ShaderNodeEmission')
            links.new(ao.outputs['AO'], emit.inputs['Color'])
            links.new(emit.outputs[0], output.inputs['Surface'])
        else:
            links.new(original, output.inputs['Surface'])
            scene.render.bake.use_pass_direct = False
            scene.render.bake.use_pass_indirect = True
            scene.render.bake.use_pass_color = False
        print('PRINT_BAKE_START', mi, channel, flush=True)
        bpy.ops.object.bake(type='EMIT' if channel == 'ao' else 'DIFFUSE', use_clear=True)
        image.filepath_raw = str(OUT / f'material-{mi}-{channel}.exr')
        image.file_format = 'OPEN_EXR'
        image.save()
        values = np.empty(size * size * 4, np.float32)
        image.pixels.foreach_get(values)
        values = values.reshape(size, size, 4)
        assert np.isfinite(values).all()
        scale = max(1., float(values[:, :, :3].max())) if channel == 'indirect' else 1.
        values[:, :, :3] /= scale
        if channel == 'ao':
            values[:, :, :3][~coverage(objects, size)] = 1
        image.pixels.foreach_set(values.ravel())
        image.filepath_raw = str(OUT / f'material-{mi}-{channel}.png')
        image.file_format = 'PNG'
        image.save()
        record[channel] = {'png': str(Path(image.filepath_raw).relative_to(ROOT)), 'scale': scale}
        nodes.remove(target)
        if emit:
            nodes.remove(emit)
            nodes.remove(ao)
        links.new(original, output.inputs['Surface'])
        bpy.data.images.remove(image)
        print('PRINT_BAKE_DONE', mi, channel, flush=True)
    report['materials'][str(mi)] = record
    (OUT / 'receivers.json').write_text(json.dumps(report, indent=2) + '\n')
print('PRINT_RECEIVERS_COMPLETE', flush=True)

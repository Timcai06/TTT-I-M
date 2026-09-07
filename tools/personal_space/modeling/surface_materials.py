"""Deterministic, packed PBR textures shared by Blender and glTF. No external assets."""
import bpy
import numpy as np


def surface(name, kind, dark, light, directory, metallic=0, roughness=.65, size=512):
    rng = np.random.default_rng(41)
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    noise = rng.random((size, size)).astype(np.float32)
    broad = (.5 + .25*np.sin(2*np.pi*(3*x+2*y)) + .25*np.sin(2*np.pi*(7*x-5*y)))
    if kind == 'wood':
        warp = .018*np.sin(2*np.pi*y) + .006*np.sin(2*np.pi*(3*y+2*x))
        grain = .5+.5*np.sin(2*np.pi*(x*43+warp*70))
        pores = np.power(.5+.5*np.sin(2*np.pi*(x*157+warp*150)), 16)
        height = .34*grain+.30*broad+.16*noise-.2*pores
        tone = np.clip(.22+.52*grain+.22*broad-.15*pores, 0, 1)
        strength = 1.4
    elif kind in ('linen', 'rug'):
        weave = np.sin(2*np.pi*x*128)*np.sin(2*np.pi*y*128)
        height = .5+.22*weave+.08*noise
        tone = .42+.17*weave+.12*noise
        if kind == 'rug':
            diamond = np.abs((x*8)%1-.5)+np.abs((y*12)%1-.5)
            border = (np.minimum.reduce([x, y, 1-x, 1-y]) < .07)
            tone += .23*(diamond < .31)-.18*border
        strength = 1.0
    else:
        height = .52*noise+.24*broad+.12*np.sin(2*np.pi*(x*37+y*23))
        tone = .48+.17*broad+.10*noise
        strength = .6 if kind == 'paper' else 1.4

    directory.mkdir(parents=True, exist_ok=True)
    def image(suffix, rgb, noncolor=False):
        pixels = np.ones((size, size, 4), dtype=np.float32)
        pixels[:, :, :3] = np.clip(rgb, 0, 1)
        img = bpy.data.images.new(name+'_'+suffix, width=size, height=size, alpha=False)
        if noncolor:
            img.colorspace_settings.name = 'Non-Color'
        img.pixels.foreach_set(pixels.ravel())
        img.filepath_raw = str(directory/(name+'_'+suffix+'.png'))
        img.file_format = 'PNG'
        img.save()
        img.pack()
        return img

    color = np.array(dark)+(np.array(light)-np.array(dark))*tone[:, :, None]
    dx = (np.roll(height, -1, axis=1)-np.roll(height, 1, axis=1))*strength
    dy = (np.roll(height, -1, axis=0)-np.roll(height, 1, axis=0))*strength
    normals = np.stack([-dx, -dy, np.ones_like(dx)], axis=2)
    normals /= np.linalg.norm(normals, axis=2, keepdims=True)
    maps = {
        'color': image('color', color),
        'normal': image('normal', normals*.5+.5, True),
        'roughness': image('roughness', np.repeat(np.clip(roughness+(height-.5)*.12, .05, .99)[:, :, None], 3, axis=2), True),
    }
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*((np.array(dark)+np.array(light))*.5), 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Metallic'].default_value = metallic
    for suffix, img in maps.items():
        node = nodes.new('ShaderNodeTexImage')
        node.image = img
        node.label = suffix
        if suffix == 'normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .35 if kind == 'paper' else .65
            links.new(node.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else:
            links.new(node.outputs['Color'], shader.inputs['Base Color' if suffix == 'color' else 'Roughness'])
    return mat


def projected_uv(obj, scale=1):
    """Metric box projection with grain running along X on desk surfaces."""
    layer = obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for face in obj.data.polygons:
        axis = max(range(3), key=lambda a: abs(face.normal[a]))
        axes = [(1, 2), (0, 2), (1, 0)][axis]
        for index in face.loop_indices:
            co = obj.data.vertices[obj.data.loops[index].vertex_index].co
            layer.data[index].uv = (co[axes[0]]*scale, co[axes[1]]*scale)

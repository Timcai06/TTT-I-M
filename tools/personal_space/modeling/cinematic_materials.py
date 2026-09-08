"""Native, metric procedural surfaces for close photography in Cycles.

The original image nodes remain available. These shader networks need a later
texture bake for glTF; this module intentionally does not export website assets.
"""
import bpy
from model_finish_common import shader


class Surface:
    def __init__(self, name):
        self.mat = bpy.data.materials[name]
        self.nodes, self.links = self.mat.node_tree.nodes, self.mat.node_tree.links
        self.bs = shader(self.mat)
        self.frame = self.node('NodeFrame', 'CINEMA / metric surface')
        self.frame.label = 'CINEMA / local metres / bake before web export'
        self.coord = self.node('ShaderNodeTexCoord', 'Local coordinates')
        self.mat['cinematic_surface'] = 'native procedural; web bake required'

    def node(self, kind, label):
        n = self.nodes.new(kind)
        n.name = 'Cinema / ' + label
        n.label = label
        if hasattr(self, 'frame'):
            n.parent = self.frame
        return n

    def noise(self, scale, detail=3, vector=None, label='Microstructure'):
        n = self.node('ShaderNodeTexNoise', label)
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = .68
        self.links.new(vector or self.coord.outputs['Object'], n.inputs['Vector'])
        return n.outputs['Fac']

    def stretch(self, scale):
        n = self.node('ShaderNodeVectorMath', 'Directional grain')
        n.operation = 'MULTIPLY'
        n.inputs[1].default_value = scale
        self.links.new(self.coord.outputs['Object'], n.inputs[0])
        return n.outputs['Vector']

    def ramp(self, value, stops, label):
        n = self.node('ShaderNodeValToRGB', label)
        ramp = n.color_ramp
        ramp.interpolation = 'EASE'
        for i, (position, color) in enumerate(stops):
            e = ramp.elements[i] if i < 2 else ramp.elements.new(position)
            e.position = position
            e.color = (*color, 1)
        self.links.new(value, n.inputs[0])
        return n.outputs[0]

    def bind(self, value, target):
        self.links.new(value, self.bs.inputs[target])

    def bump(self, height, distance, strength, previous=None):
        n = self.node('ShaderNodeBump', 'Relief %.3f mm' % (distance * 1000))
        n.inputs['Distance'].default_value = distance
        n.inputs['Strength'].default_value = strength
        self.links.new(height, n.inputs['Height'])
        if previous:
            self.links.new(previous, n.inputs['Normal'])
        self.bind(n.outputs['Normal'], 'Normal')
        return n.outputs['Normal']


def finish_surfaces():
    wood = Surface('Walnut_oiled')
    grain = wood.noise(1, 5, wood.stretch((3.5, 145, 95)), 'Long walnut fibres')
    broad = wood.noise(3.2, 3, label='Slow growth variation')
    warp = wood.node('ShaderNodeMixRGB', 'Growth and fibres')
    warp.blend_type = 'MULTIPLY'; warp.inputs[0].default_value = .32
    wood.links.new(grain, warp.inputs[1]); wood.links.new(broad, warp.inputs[2])
    wood.bind(wood.ramp(warp.outputs[0], [
        (.12, (.033, .012, .005)), (.82, (.24, .103, .036)),
        (.42, (.10, .035, .011)), (.60, (.16, .063, .021)),
    ], 'Walnut heartwood'), 'Base Color')
    wood.bind(wood.ramp(grain, [(.15, (.30,)*3), (.85, (.46,)*3)], 'Oil roughness'), 'Roughness')
    wood.bump(grain, .00016, .24)
    wood.bs.inputs['Coat Weight'].default_value = .20
    wood.bs.inputs['Coat Roughness'].default_value = .28

    plaster = Surface('Plaster_warm')
    broad = plaster.noise(5, 3, label='Trowel mottling')
    plaster.bind(plaster.ramp(broad, [(.15, (.30,.278,.241)), (.85, (.44,.415,.365))], 'Lime plaster'), 'Base Color')
    base = plaster.bump(plaster.noise(110, 4), .00065, .30)
    plaster.bump(plaster.noise(1500, 2), .00006, .22, base)
    plaster.bs.inputs['Roughness'].default_value = .88

    for name, roughness, distance in [('Linen_natural', .85, .00013), ('Paper_fiber', .84, .000018)]:
        s = Surface(name)
        fibre = s.noise(1, 3, s.stretch((180, 2400, 850)), 'Long fibres')
        if name == 'Linen_natural':
            warp = s.noise(1, 2, s.stretch((2400, 180, 850)), 'Cross fibres')
            mix = s.node('ShaderNodeMixRGB', 'Warp and weft')
            mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = .65
            s.links.new(fibre, mix.inputs[1]); s.links.new(warp, mix.inputs[2])
            fibre = mix.outputs[0]
            colors = [(.1, (.25,.207,.152)), (.9, (.45,.39,.29))]
            s.bs.inputs['Sheen Weight'].default_value = .22
        else:
            colors = [(.1, (.70,.657,.555)), (.9, (.82,.775,.670))]
        s.bind(s.ramp(fibre, colors, 'Natural stock'), 'Base Color')
        s.bump(fibre, distance, .30)
        s.bs.inputs['Roughness'].default_value = roughness

    for name, low, high, depth in [
        ('Charcoal powder coat', .36, .51, .000026),
        ('Brushed hardware', .23, .36, .000008),
        ('Ceramic_speckle', .20, .32, .000035),
        ('Graphite keycaps', .35, .48, .000014),
    ]:
        s = Surface(name)
        vector = s.stretch((70, 3200, 70)) if name == 'Brushed hardware' else None
        grain = s.noise(1 if vector else 1600, 2, vector)
        s.bind(s.ramp(grain, [(.1, (low,)*3), (.9, (high,)*3)], 'Finish variation'), 'Roughness')
        s.bump(grain, depth, .22)
        if name == 'Brushed hardware':
            s.bs.inputs['Anisotropic'].default_value = .32
        if name == 'Ceramic_speckle':
            s.bs.inputs['Coat Weight'].default_value = .32
            s.bs.inputs['Coat Roughness'].default_value = .20

    rug = Surface('Rug_archive')
    # Keep the existing woven pattern; add only fibre relief and grazing sheen.
    rug.bump(rug.noise(1500, 2), .00035, .28)
    rug.bs.inputs['Sheen Weight'].default_value = .40
    rug.bs.inputs['Sheen Roughness'].default_value = .75
    for name in ['Leaf_0', 'Leaf_1', 'Leaf_2']:
        s = Surface(name)
        s.bump(s.noise(500, 2), .000035, .18)
        s.bs.inputs['Subsurface Weight'].default_value = .045
        s.bs.inputs['Subsurface Radius'].default_value = (.001, .0006, .0003)
        s.bs.inputs['Coat Weight'].default_value = .10
        s.bs.inputs['Coat Roughness'].default_value = .32

    # Keep every real photo/project texture and its colour connection intact.
    for mat in bpy.data.materials:
        if 'paper_ink' not in mat.name or not mat.use_nodes:
            continue
        if not mat.name.startswith(('ArchivePhoto', 'Frame_BackWall', 'Work_Cover')):
            continue
        s = Surface(mat.name)
        s.bump(s.noise(2000, 2), .000008, .13)
        s.bs.inputs['Roughness'].default_value = .48
        s.bs.inputs['Coat Weight'].default_value = .075
        s.bs.inputs['Coat Roughness'].default_value = .34

    # Arrange only new nodes, keeping the original graph available for baking.
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nodes = [n for n in mat.node_tree.nodes if n.name.startswith('Cinema /') and n.type != 'FRAME']
        for i, node in enumerate(nodes):
            node.location = ((i // 4) * 240 - 1400, -(i % 4) * 210)

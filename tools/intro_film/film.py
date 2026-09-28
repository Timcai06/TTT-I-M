"""The darkroom intro film: builds the set from the GPT asset library, animates six shots, renders.

    blender -b --factory-startup -P tools/intro_film/film.py -- [frames=0-341|still=120] [res=100]
            [samples=128] [mb=1] [out=art/intro-film/work/frames] [step=1]

Everything that moves is a pure function of the frame number, so any frame renders on its own and
in any order. The liquid surface is the one exception: its ripples come from a small wave
simulation that is re-run from the start of the frame's shot.
"""
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'art/intro-film'
LIB = ART / 'assets/darkroom_assets.blend'
PRINTS = ART / 'work/prints'

ARGS = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
sys.path.insert(0, str(Path(__file__).parent))
from timing import BELL, CUTS, DRIP_START, FLICKER, FPS, N_FRAMES, SAFELIGHT_FLICKER, SHOTS, SWITCH  # noqa: E402

SAFE = (1.0, 0.045, 0.014)
WARM = (1.0, 0.86, 0.70)
TUBE = (1.0, 0.95, 0.88)


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_io(x):
    x = clamp01(x)
    return x * x * x * (x * (x * 6 - 15) + 10)


def span(f, a, b):
    return clamp01((f - a) / (b - a))


def lerp(a, b, t):
    return a + (b - a) * t


def vlerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)


def shot_of(f):
    for i in range(len(SHOTS)):
        if CUTS[i] <= f < CUTS[i + 1]:
            return i, f - CUTS[i]
    return len(SHOTS) - 1, f - CUTS[-2]


def wobble(f, seed, amp):
    """Handheld drift: a few incommensurate sines, smooth and deterministic."""
    t = f / FPS
    return Vector((
        amp * (math.sin(t * 0.9 + seed) * 0.6 + math.sin(t * 2.3 + seed * 2.1) * 0.3 + math.sin(t * 5.1 + seed * 3.7) * 0.1),
        amp * (math.sin(t * 0.7 + seed * 1.3) * 0.6 + math.sin(t * 1.9 + seed * 0.4) * 0.4),
        amp * (math.sin(t * 1.1 + seed * 0.7) * 0.6 + math.sin(t * 2.9 + seed * 1.9) * 0.4),
    ))


# ───────────────────────────── render setup ─────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
except Exception as e:  # noqa: BLE001
    print('GPU unavailable', e)
scene.cycles.samples = int(ARGS.get('samples', 128))
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 10
scene.cycles.glossy_bounces = 6
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 0.5
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = int(ARGS.get('res', 100))
scene.render.fps = FPS
scene.render.use_persistent_data = True
scene.render.use_motion_blur = ARGS.get('mb', '1') == '1'
scene.render.motion_blur_shutter = 0.5
scene.render.motion_blur_position = 'START'   # never straddle a cut
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'AgX'
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.frame_start, scene.frame_end = 0, N_FRAMES - 1

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.0012, 0.001, 0.001, 1)

# ───────────────────────────── the asset library ─────────────────────────────
FAMILIES = ['DR_Sink', 'DR_Tray', 'DR_Tongs', 'DR_Paper', 'DR_Clothespin', 'DR_Line', 'DR_Timer',
            'DR_Safelight', 'DR_Bottles', 'DR_Enlarger', 'DR_Shelf']
with bpy.data.libraries.load(str(LIB), link=False) as (src, dst):
    dst.collections = FAMILIES
COL = {c.name: c for c in dst.collections}
for name in ['DR_Sink', 'DR_Tray', 'DR_Tongs', 'DR_Paper', 'DR_Line', 'DR_Timer', 'DR_Safelight',
             'DR_Bottles', 'DR_Enlarger', 'DR_Shelf']:
    scene.collection.children.link(COL[name])
O = bpy.data.objects


def unparent_keep(ob):
    mw = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = mw


def instance(coll, loc, rot=(0, 0, 0), name=None):
    e = bpy.data.objects.new(name or f'inst_{coll.name}', None)
    e.instance_type = 'COLLECTION'
    e.instance_collection = coll
    e.location = loc
    e.rotation_euler = rot
    scene.collection.objects.link(e)
    return e


# ───────────────────────────── materials ─────────────────────────────

def principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        p.inputs[k].default_value = (*v, 1.0) if isinstance(v, tuple) and len(v) == 3 else v
    return m, p


def noise_bump(m, p, scale, strength, rough=None):
    nt = m.node_tree
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 8
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    if rough:
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value, mr.inputs['To Max'].default_value = rough
        nz2 = nt.nodes.new('ShaderNodeTexNoise')
        nz2.inputs['Scale'].default_value = scale / 30
        nt.links.new(tc.outputs['Object'], nz2.inputs['Vector'])
        nt.links.new(nz2.outputs['Fac'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], p.inputs['Roughness'])


def shadow_clear(m, tint=(1, 1, 1)):
    """Shadow rays pass the liquid, so what lies under it is lit without caustics."""
    nt = m.node_tree
    out = nt.nodes['Material Output']
    p = nt.nodes['Principled BSDF']
    lp = nt.nodes.new('ShaderNodeLightPath')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    tr.inputs['Color'].default_value = (*tint, 1)
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mix.inputs['Fac'])
    nt.links.new(p.outputs['BSDF'], mix.inputs[1])
    nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])


developer, _ = principled('developer', **{'Base Color': (0.99, 0.97, 0.9), 'Roughness': 0.012, 'IOR': 1.335,
                                          'Transmission Weight': 1.0})
shadow_clear(developer, (0.96, 0.94, 0.88))
wall, wall_p = principled('wall', **{'Base Color': (0.06, 0.052, 0.046), 'Roughness': 0.9})
noise_bump(wall, wall_p, 40, 0.25)
counter, counter_p = principled('counter', **{'Base Color': (0.018, 0.017, 0.016), 'Roughness': 0.3, 'Coat Weight': 0.4})
noise_bump(counter, counter_p, 120, 0.03, rough=(0.22, 0.5))
slat, slat_p = principled('slat', **{'Base Color': (0.07, 0.042, 0.024), 'Roughness': 0.35, 'Coat Weight': 0.6,
                                     'Coat Roughness': 0.1})
noise_bump(slat, slat_p, 60, 0.2)


def print_material(name, image_path, landscape, wet=0.6, window=0.34):
    """A fibre print that develops: `progress` 0 is a blank sheet, 1 the finished print.

    Each tone arrives at its own time (shadows first), pushed around by a mottled
    front: developer does not reach every fibre at once.
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    p = N['Principled BSDF']
    p.inputs['Roughness'].default_value = 0.32
    p.inputs['Coat Weight'].default_value = wet
    p.inputs['Coat Roughness'].default_value = 0.06
    uv = N.new('ShaderNodeUVMap')
    tex = N.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(image_path), check_existing=True)
    tex.image.colorspace_settings.name = 'Non-Color'   # density is read from the print's own values
    tex.interpolation = 'Cubic'
    tex.extension = 'EXTEND'
    if landscape:
        # The 10x8 sheet's UVs run down its short side: turn them into (right, up).
        sep = N.new('ShaderNodeSeparateXYZ')
        com = N.new('ShaderNodeCombineXYZ')
        inv = N.new('ShaderNodeMath')
        inv.operation = 'SUBTRACT'
        inv.inputs[0].default_value = 1.0
        L.new(uv.outputs['UV'], sep.inputs['Vector'])
        L.new(sep.outputs['Y'], com.inputs['X'])
        L.new(sep.outputs['X'], inv.inputs[1])
        L.new(inv.outputs['Value'], com.inputs['Y'])
        L.new(com.outputs['Vector'], tex.inputs['Vector'])
    else:
        L.new(uv.outputs['UV'], tex.inputs['Vector'])
    # density: 0 = paper, 1 = full black
    bw = N.new('ShaderNodeRGBToBW')
    L.new(tex.outputs['Color'], bw.inputs['Color'])
    dens = N.new('ShaderNodeMapRange')
    dens.inputs['From Min'].default_value = 0.9
    dens.inputs['From Max'].default_value = 0.09
    L.new(bw.outputs['Val'], dens.inputs['Value'])
    # arrival time of each tone, with a mottled front and a slight wipe across the sheet
    arrive = N.new('ShaderNodeMapRange')
    arrive.inputs['From Min'].default_value = 1.0
    arrive.inputs['From Max'].default_value = 0.0
    arrive.inputs['To Min'].default_value = 0.1
    arrive.inputs['To Max'].default_value = 0.72
    arrive.clamp = False
    L.new(dens.outputs['Result'], arrive.inputs['Value'])
    tc = N.new('ShaderNodeTexCoord')
    blot = N.new('ShaderNodeTexNoise')
    blot.inputs['Scale'].default_value = 16
    blot.inputs['Detail'].default_value = 10
    blot.inputs['Roughness'].default_value = 0.62
    speck = N.new('ShaderNodeTexNoise')
    speck.inputs['Scale'].default_value = 520
    speck.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], blot.inputs['Vector'])
    L.new(tc.outputs['Object'], speck.inputs['Vector'])
    sepu = N.new('ShaderNodeSeparateXYZ')
    L.new(uv.outputs['UV'], sepu.inputs['Vector'])

    def math_node(op, a, b=None, value_b=None):
        n = N.new('ShaderNodeMath')
        n.operation = op
        L.new(a, n.inputs[0])
        if b is not None:
            L.new(b, n.inputs[1])
        elif value_b is not None:
            n.inputs[1].default_value = value_b
        return n.outputs['Value']

    jitter = math_node('MULTIPLY', math_node('SUBTRACT', blot.outputs['Fac'], value_b=0.5), value_b=0.42)
    fine = math_node('MULTIPLY', math_node('SUBTRACT', speck.outputs['Fac'], value_b=0.5), value_b=0.12)
    wipe = math_node('MULTIPLY', sepu.outputs['Y' if landscape else 'X'], value_b=0.14)
    arrival = math_node('ADD', math_node('ADD', arrive.outputs['Result'], jitter), math_node('ADD', fine, wipe))
    progress = N.new('ShaderNodeValue')
    progress.name = 'progress'
    progress.outputs[0].default_value = 1.0
    since = math_node('SUBTRACT', progress.outputs[0], arrival)
    k = N.new('ShaderNodeMapRange')
    k.interpolation_type = 'SMOOTHSTEP'
    k.inputs['From Min'].default_value = 0.0
    k.inputs['From Max'].default_value = window
    L.new(since, k.inputs['Value'])
    d = math_node('MULTIPLY', dens.outputs['Result'], k.outputs['Result'])
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (0.93, 0.915, 0.88, 1)    # A: fibre base, display values
    mix.inputs[7].default_value = (0.075, 0.072, 0.065, 1)  # B: silver black
    L.new(d, mix.inputs['Factor'])
    to_linear = N.new('ShaderNodeGamma')
    to_linear.inputs['Gamma'].default_value = 2.2
    L.new(mix.outputs[2], to_linear.inputs['Color'])
    L.new(to_linear.outputs['Color'], p.inputs['Base Color'])
    # paper tooth
    tooth = N.new('ShaderNodeTexNoise')
    tooth.inputs['Scale'].default_value = 1400
    L.new(tc.outputs['Object'], tooth.inputs['Vector'])
    bump = N.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.035
    L.new(tooth.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m, progress, tex


# ───────────────────────────── the set ─────────────────────────────
# Sink at the origin; its basin floor sits a few mm up. A wooden duckboard raises the trays.
O['DR_Sink_Root'].location = (0, 0, 0)
DUCK_TOP = 0.085
for i in range(-17, 18):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(i * 0.048, -0.005, DUCK_TOP - 0.011))
    s = bpy.context.active_object
    s.scale = (0.032, 0.64, 0.022)
    s.data.materials.append(slat)
    b = s.modifiers.new('bevel', 'BEVEL')
    b.width, b.segments = 0.003, 2
for y in (-0.24, 0.23):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y, (DUCK_TOP - 0.022) / 2 + 0.006))
    r = bpy.context.active_object
    r.scale = (1.66, 0.04, DUCK_TOP - 0.028)
    r.data.materials.append(slat)

TRAY = Vector((-0.2, -0.015, DUCK_TOP))
O['DR_Tray_Root'].location = TRAY
O['DR_Tray_Root'].rotation_euler = (0, 0, math.radians(1.5))
TRAY2 = instance(COL['DR_Tray'], (0.2, -0.02, DUCK_TOP), (0, 0, math.radians(181)), 'tray_stop')
LIQ_TOP = 0.0385
FLOOR = 0.0051 + 0.0003

# counters either side of the sink, the wall behind
for x0, x1 in ((-2.2, -0.905), (0.905, 2.2)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, 0.0, 0.186 / 2))
    c = bpy.context.active_object
    c.scale = (x1 - x0, 0.74, 0.186)
    c.data.materials.append(counter)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.378, 1.0), rotation=(math.pi / 2, 0, 0))
w = bpy.context.active_object
w.scale = (6, 3, 1)
w.data.materials.append(wall)

# a wooden ledge along the wall, just above the backsplash
LEDGE_Z = 0.402
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.305, LEDGE_Z - 0.011))
ledge = bpy.context.active_object
ledge.scale = (2.7, 0.15, 0.022)
ledge.data.materials.append(slat)
lb_ = ledge.modifiers.new('bevel', 'BEVEL')
lb_.width, lb_.segments = 0.003, 2

# props
O['DR_Timer_Root'].location = (-1.14, 0.3, LEDGE_Z)
O['DR_Timer_Root'].rotation_euler = (0, 0, math.radians(18))
O['DR_Bottles_Root'].location = (-0.62, 0.31, LEDGE_Z)
O['DR_Bottles_Root'].rotation_euler = (0, 0, math.radians(-8))
O['DR_Enlarger_Root'].location = (1.35, 0.12, 0.186)
O['DR_Enlarger_Root'].rotation_euler = (0, 0, math.radians(-160))
O['DR_Shelf_Root'].location = (-1.1, 0.375, 1.02)
LAMP = Vector((0.4, 0.372, 0.56))
O['DR_Safelight_Root'].location = LAMP
O['DR_Safelight_Root'].rotation_euler = (math.radians(18), 0, math.radians(-16))

# the red filter glows; its strength follows the lamp
filt = O['DR_Safelight_Filter'].active_material
fp = next(n for n in filt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
fp.inputs['Emission Color'].default_value = (*SAFE, 1)

# tongs: plain pair only, driven directly in world space
for ob in bpy.data.collections['DR_Tongs_Ribbed'].all_objects:
    ob.hide_render = True
TONGS = O['DR_Tongs_Plain_TipPivot']
unparent_keep(TONGS)

# the line, sagging across above the sink
LINE_Y, LINE_Z, LINE_X0 = 0.14, 0.64, -1.0
O['DR_Line_Root'].location = (LINE_X0, LINE_Y, LINE_Z)


def line_z(x):
    u = (x - LINE_X0) / 2.0
    return LINE_Z - 0.085 * (1 - (2 * u - 1) ** 2)


bpy.context.view_layer.update()

# ───────────────────────────── prints ─────────────────────────────
paper_landscape = O['DR_Paper_10x8']
paper_portrait = O['DR_Paper_8x10']
for p in (paper_landscape, paper_portrait):
    p.data.shape_keys.key_blocks['DR_Hanging_Curl'].value = 0.0
paper_portrait.hide_render = True

# the one that develops in the tray (image swapped per shot)
tray_print = paper_landscape
unparent_keep(tray_print)
tray_mat, tray_progress, tray_tex = print_material('print_tray', PRINTS / 'football_p100.png', True, wet=0.2, window=0.6)
tray_print.material_slots[0].link = 'OBJECT'
tray_print.material_slots[0].material = tray_mat
TRAY_IMAGES = {name: bpy.data.images.load(str(PRINTS / f'{name}_p100.png'), check_existing=True)
               for name in ('football', 'sciscope', 'skyline')}
for _im in TRAY_IMAGES.values():
    _im.colorspace_settings.name = 'Non-Color'


def lay_in_tray(yaw_deg, dx=0.0, dy=0.0):
    yaw = math.radians(1.5 + yaw_deg)
    m = Matrix.Translation(TRAY) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Translation((dx, dy + 0.1015, FLOOR)) \
        @ Matrix.Rotation(math.radians(-90), 4, 'X')
    tray_print.matrix_world = m


lay_in_tray(-2.0)

HANG = {}


def hang(name, image, landscape, x, curl=0.35, tilt=0.0):
    src = paper_landscape if landscape else paper_portrait
    ob = src.copy()
    ob.data = src.data.copy()
    ob.name = f'hang_{name}'
    scene.collection.objects.link(ob)
    ob.parent = None
    ob.hide_render = False
    ob.data.shape_keys.key_blocks['DR_Hanging_Curl'].value = curl
    mat, prog, _ = print_material(f'print_{name}', PRINTS / f'{image}.png', landscape, wet=0.7)
    prog.outputs[0].default_value = 1.6
    ob.material_slots[0].link = 'OBJECT'
    ob.material_slots[0].material = mat
    w = 0.254 if landscape else 0.203
    top = line_z(x) - 0.006
    ob.matrix_world = Matrix.Translation((x, LINE_Y, top)) @ Matrix.Rotation(tilt, 4, 'Z')
    for side in (-1, 1):
        px = x + side * (w / 2 - 0.018)
        spring = Vector((px, LINE_Y, line_z(px) + 0.016))
        rot = Euler((math.pi / 2, math.pi / 2, tilt))
        e = instance(COL['DR_Clothespin'], (0, 0, 0), rot, f'pin_{name}_{side}')
        e.location = spring - rot.to_matrix() @ Vector((0, 0, 0.013))
    HANG[name] = ob
    return ob


hang('night', 'night_p100', False, -0.8, tilt=0.04)
hang('aboutme', 'aboutme_p100', False, -0.54, tilt=-0.03)
hang('football', 'football_p100', True, -0.23, tilt=0.02)
PORTRAIT_X = 0.1
hang('tim', 'tim_p100', False, PORTRAIT_X, curl=0.45, tilt=-0.05)
hang('sciscope', 'sciscope_p100', True, 0.7, tilt=0.03)

# a drip that gathers and falls from the portrait's lower corner
water, _ = principled('drip', **{'Base Color': (1, 1, 1), 'Roughness': 0.02, 'IOR': 1.333, 'Transmission Weight': 1.0})
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.0028)
DRIP = bpy.context.active_object
DRIP.data.materials.append(water)
for poly in DRIP.data.polygons:
    poly.use_smooth = True
DRIP_AT = Vector((PORTRAIT_X + 0.085, LINE_Y - 0.004, line_z(PORTRAIT_X) - 0.006 - 0.254))


bpy.context.view_layer.update()

# ───────────────────────────── the liquid ─────────────────────────────
class Liquid:
    """The developer's surface: a grid clipped to the tray's rounded inner wall, rippled by a
    damped 2-D wave simulation."""

    def __init__(self, nx=250, ny=318):
        lb = O['DR_Tray_LiquidBounds']
        pts = np.array([v.co[:] for v in lb.data.vertices])
        top = pts[pts[:, 2] > LIQ_TOP - 1e-4]
        self.a = np.abs(top[:, 0]).max() - 0.0004
        self.b = np.abs(top[:, 1]).max() - 0.0004
        diag = (np.abs(top[:, 0]) + np.abs(top[:, 1])).max()
        self.r = max(0.004, (self.a + self.b + 0.0008 - diag) / (2 - math.sqrt(2)))
        xs = np.linspace(-self.a, self.a, nx)
        ys = np.linspace(-self.b, self.b, ny)
        self.dx = xs[1] - xs[0]
        X, Y = np.meshgrid(xs, ys, indexing='ij')
        # Round the grid's corners without folding it: each corner square of side r is
        # mapped onto a quarter disc (elliptical grid mapping), so rows bend, never overlap.
        qx = np.abs(X) - (self.a - self.r)
        qy = np.abs(Y) - (self.b - self.r)
        corner = (qx > 0) & (qy > 0)
        u = np.clip(qx / self.r, 0, 1)
        v = np.clip(qy / self.r, 0, 1)
        mx = u * np.sqrt(1 - v * v / 2) * self.r
        my = v * np.sqrt(1 - u * u / 2) * self.r
        X = np.where(corner, np.sign(X) * (self.a - self.r + mx), X)
        Y = np.where(corner, np.sign(Y) * (self.b - self.r + my), Y)
        sd = self.sdf(X, Y)
        self.X, self.Y = X, Y
        self.mask = (sd < -0.0012).astype(np.float32)
        self.menisc = 0.00075 * np.exp(-np.maximum(-sd, 0) / 0.0022)
        self.nx, self.ny = nx, ny
        verts = np.stack([X, Y, np.full_like(X, LIQ_TOP)], -1).reshape(-1, 3)
        faces = []
        for i in range(nx - 1):
            base = i * ny
            for j in range(ny - 1):
                a = base + j
                faces.append((a, a + ny, a + ny + 1, a + 1))
        me = bpy.data.meshes.new('developer_surface')
        me.from_pydata(verts.tolist(), [], faces)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        me.materials.append(developer)
        ob = bpy.data.objects.new('developer_surface', me)
        scene.collection.objects.link(ob)
        ob.parent = O['DR_Tray_Root']
        sol = ob.modifiers.new('solid', 'SOLIDIFY')
        sol.thickness = LIQ_TOP - 0.004
        sol.offset = -1
        sol.use_even_offset = False
        self.ob = ob
        self.cache = {}

    def sdf(self, X, Y):
        qx = np.abs(X) - (self.a - self.r)
        qy = np.abs(Y) - (self.b - self.r)
        out = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
        return out + np.minimum(np.maximum(qx, qy), 0) - self.r

    def grad(self, X, Y):
        qx = np.abs(X) - (self.a - self.r)
        qy = np.abs(Y) - (self.b - self.r)
        corner = (qx > 0) & (qy > 0)
        n = np.hypot(qx, qy) + 1e-9
        gx = np.where(corner, qx / n, (qx >= qy).astype(float))
        gy = np.where(corner, qy / n, (qy > qx).astype(float))
        return gx * np.sign(X), gy * np.sign(Y)

    def simulate(self, shot, upto, events, seed):
        """Heights for local frame `upto` of a shot. events: [(frame, x, y, amp, sigma)].

        Continues from the last frame simulated for this shot, so rendering a shot in order
        costs one frame of simulation per frame."""
        st = self.cache.get(shot)
        if st is None or st['f'] > upto:
            rng = np.random.default_rng(seed)
            h = np.zeros((self.nx, self.ny), np.float32)
            # a surface that has been moving for a while: sparse old ripples
            for _ in range(6):
                cx, cy = rng.uniform(-self.a, self.a), rng.uniform(-self.b, self.b)
                R = np.hypot(self.X - cx, self.Y - cy)
                h += (rng.uniform(0.4, 1.0) * 0.00012 * np.sin(R * rng.uniform(260, 420)) * np.exp(-R / 0.08)).astype(np.float32)
            st = {'f': -1, 'h': h, 'v': np.zeros_like(h)}
            self.cache[shot] = st
        c, damp, sub = 0.2, 1.1, 20
        dt = 1 / FPS / sub
        k = (c * dt / self.dx) ** 2
        h, v = st['h'], st['v']
        while st['f'] < upto:
            f = st['f'] + 1
            for (ef, ex, ey, amp, sig) in events:
                if ef == f:
                    v += (amp * np.exp(-((self.X - ex) ** 2 + (self.Y - ey) ** 2) / (2 * sig * sig)) / dt / sub).astype(np.float32)
            for _ in range(sub):
                lap = (np.roll(h, 1, 0) + np.roll(h, -1, 0) + np.roll(h, 1, 1) + np.roll(h, -1, 1) - 4 * h)
                v += k * lap / dt
                v *= (1 - damp * dt)
                h += v * dt
                h *= self.mask
            st['f'] = f
        return h

    def show(self, h, t):
        slosh = 0.00006 * np.sin(self.X * 21 + t * 1.3) * np.sin(self.Y * 17 - t * 0.9)
        z = LIQ_TOP + h + self.menisc + slosh
        co = np.stack([self.X, self.Y, z], -1).reshape(-1).astype(np.float32)
        me = self.ob.data
        me.vertices.foreach_set('co', co)
        me.update()


LIQ = Liquid()


def tray_world(x, y):
    return O['DR_Tray_Root'].matrix_world @ Vector((x, y, 0))


def to_tray(p):
    q = O['DR_Tray_Root'].matrix_world.inverted() @ Vector(p)
    return q.x, q.y


bpy.context.view_layer.update()

# ───────────────────────────── lights ─────────────────────────────

def area(name, loc, target, energy, color, size, shape='DISK', spread=None, size_y=None):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy, ld.color, ld.shape, ld.size = energy, color, shape, size
    if size_y:
        ld.size_y = size_y
    if spread is not None:
        ld.spread = spread
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(ob)
    return ob


filter_world = O['DR_Safelight_Filter'].matrix_world.translation.copy()
lamp_axis = (O['DR_Safelight_Root'].matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
L_SAFE = area('safe_lamp', filter_world + lamp_axis * 0.012, filter_world + lamp_axis, 1, SAFE, 0.14)
L_KEY = area('safe_overhead', (-0.95, 0.25, 1.05), (-0.2, 0.0, 0.08), 1, SAFE, 0.3)
L_FILL = area('safe_fill', (-0.2, -1.4, 0.6), (-0.2, 0.0, 0.2), 1, (1.0, 0.32, 0.22), 1.6)
E = {'safe': float(ARGS.get('e_safe', 5)), 'key': float(ARGS.get('e_key', 22)), 'fill': float(ARGS.get('e_fill', 1.2)), 'tray': float(ARGS.get('e_tray', 10)),
     'filter': float(ARGS.get('e_filter', 3)), 'work': float(ARGS.get('e_work', 8)), 'tube': float(ARGS.get('e_tube', 0.4))}
L_TRAY = area('safe_tray', (TRAY.x + 0.05, TRAY.y - 0.55, 0.85), (TRAY.x, TRAY.y, TRAY.z), 1, SAFE, 0.45)
L_WORK = area('work', (-0.45, -0.5, 0.95), (PORTRAIT_X, LINE_Y, 0.44), 0, WARM, 0.3, spread=math.radians(30))
L_TUBE = area('tube', (0.0, -0.2, 1.7), (0.0, 0.0, 0.0), 0, TUBE, 1.4, shape='RECTANGLE', size_y=0.12)

TIMER_GLOW = bpy.data.materials['DR_TimerGlow']
tgp = next(n for n in TIMER_GLOW.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
TIMER_GLOW_BASE = tgp.inputs['Emission Strength'].default_value


def safelight_level(f):
    """Warm-up flicker at the start, full until the white light takes over."""
    if f < 10:
        return 0.0
    if f in SAFELIGHT_FLICKER:
        return SAFELIGHT_FLICKER[f]
    return smooth(span(f, 16, 30)) * 0.2 + 0.8 if f < 30 else 1.0


def work_level(f):
    if f < SWITCH:
        return 0.0
    i = f - SWITCH
    return FLICKER[i] if i < len(FLICKER) else 1.0


# ───────────────────────────── cameras ─────────────────────────────

def make_camera(name, lens, fstop):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.aperture_blades = 8
    ob = bpy.data.objects.new(name, cd)
    scene.collection.objects.link(ob)
    return ob


CAMS = {
    'safelight': make_camera('cam_safelight', 26, 2.0),
    'develop': make_camera('cam_develop', 60, 3.2),
    'sciscope': make_camera('cam_sciscope', 85, 2.4),
    'skyline': make_camera('cam_skyline', 50, 4.0),
    'timer': make_camera('cam_timer', 90, 2.8),
    'lights': make_camera('cam_lights', 50, 1.6),
}

TRAY_C = tray_world(0, 0) + Vector((0, 0, FLOOR))
TIMER_DIAL = O['DR_Timer_SecondHand'].matrix_world.translation.copy()
PORTRAIT_C = Vector((PORTRAIT_X, LINE_Y, line_z(PORTRAIT_X) - 0.006 - 0.127))


def camera_pose(shot, lf, f):
    """(position, target, focus point) for local frame lf of a shot."""
    if shot == 'safelight':
        k = ease_io(lf / 72)
        pos = vlerp((0.08, -0.58, 0.33), (0.0, -0.47, 0.3), k) + wobble(f, 1.0, 0.0025)
        tgt = vlerp((-0.1, 0.14, 0.22), (-0.12, 0.12, 0.19), k)
        return pos, tgt, TRAY_C + Vector((0.04, -0.04, 0))
    if shot == 'develop':
        k = ease_io(lf / 108)
        c = TRAY_C
        pos = c + vlerp((0.05, -0.2, 0.44), (0.02, -0.14, 0.36), k) + wobble(f, 2.0, 0.0012)
        tgt = c + vlerp((0.0, 0.0, 0.0), (-0.005, 0.012, 0.0), k)
        return pos, tgt, c + Vector((-0.02, 0.03, 0))
    if shot == 'sciscope':
        k = lf / 27
        c = TRAY_C
        pos = c + vlerp((-0.3, -0.17, 0.2), (-0.26, -0.21, 0.2), k) + wobble(f, 3.0, 0.001)
        tgt = c + Vector((0.02, 0.01, 0))
        return pos, tgt, tgt
    if shot == 'skyline':
        k = lf / 27
        c = TRAY_C
        a = math.radians(lerp(-8, 4, k))
        pos = c + Vector((math.sin(a) * 0.02, -0.02, lerp(0.42, 0.39, k)))
        tgt = c + Vector((math.sin(a + 1.5) * 0.004, 0.0, 0))
        return pos, tgt, c
    if shot == 'timer':
        k = lf / 18
        d = O['DR_Timer_Root'].matrix_world.to_3x3() @ Vector((0, -1, 0))
        pos = TIMER_DIAL + d * lerp(0.62, 0.57, k) + Vector((0.05, 0, 0.03)) + wobble(f, 4.0, 0.0006)
        return pos, TIMER_DIAL + Vector((0.004, 0, 0)), TIMER_DIAL
    # lights: push in on the portrait, settle on the hero's composition (print right of centre)
    k = ease_io(span(lf, 0, 78))
    pos = PORTRAIT_C + vlerp((-0.3, -0.86, 0.03), (-0.22, -0.66, 0.01), k) + wobble(f, 5.0, 0.0012 * (1 - k))
    tgt = PORTRAIT_C + vlerp((-0.1, 0, 0.01), (-0.085, 0, 0.0), k)
    return pos, tgt, PORTRAIT_C


def roll_for(shot, lf):
    if shot == 'skyline':
        return math.radians(lerp(-3, 3, lf / 27))
    return 0.0


def fcurves_of(ob):
    ad = ob.animation_data
    try:
        from bpy_extras import anim_utils
        return list(anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves)
    except Exception:  # noqa: BLE001
        return list(getattr(ad.action, 'fcurves', []))


def key_cameras():
    for i, shot in enumerate(SHOTS):
        cam = CAMS[shot]
        cam.rotation_mode = 'QUATERNION'
        prev = None
        a, b = CUTS[i], CUTS[i + 1]
        for f in range(a, b + 1):   # one extra key so the shutter after the last frame has motion
            pos, tgt, foc = camera_pose(shot, f - a, f)
            cam.location = pos
            q = (tgt - pos).to_track_quat('-Z', 'Y')
            q = q @ Euler((0, 0, roll_for(shot, f - a))).to_quaternion()
            if prev is not None and prev.dot(q) < 0:
                q.negate()
            prev = q
            cam.rotation_quaternion = q
            cam.data.dof.focus_distance = (foc - pos).length
            cam.keyframe_insert('location', frame=f)
            cam.keyframe_insert('rotation_quaternion', frame=f)
            cam.data.dof.keyframe_insert('focus_distance', frame=f)


# ───────────────────────────── the action ─────────────────────────────
REST = {'pos': tray_world(0.19, -0.16) + Vector((0, 0, 0.1)), 'pitch': 60, 'yaw': 150}


def tongs_pose(f):
    """Tip position (world) and (pitch, yaw) in degrees. Arms point up and away from the tip."""
    shot, lf = shot_of(f)
    name = SHOTS[shot]
    liquid = TRAY.z + LIQ_TOP
    if name == 'safelight':
        # comes down at the sheet's corner, presses twice
        corner = tray_world(0.095, -0.075)
        up = corner + Vector((0.04, -0.03, 0.12))
        down = corner.copy()
        down.z = TRAY.z + FLOOR + 0.004
        press = smooth(span(lf, 22, 34)) - 0.55 * smooth(span(lf, 40, 48)) + 0.55 * smooth(span(lf, 52, 58)) \
            - smooth(span(lf, 62, 72)) * 0.4
        return up.lerp(down, press), lerp(58, 52, press), 145
    if name == 'develop':
        # rocking the print: two slow pushes at its right edge
        edge = tray_world(0.12, 0.02)
        hover = edge + Vector((0.03, 0.02, 0.07))
        low = edge.copy()
        low.z = TRAY.z + FLOOR + 0.004
        rock = smooth(span(lf, 16, 26)) * (1 - smooth(span(lf, 34, 44))) + \
            smooth(span(lf, 58, 68)) * (1 - smooth(span(lf, 76, 88)))
        slide = Vector((0, -0.012 * math.sin(lf / 8), 0)) * rock
        return hover.lerp(low, rock) + slide, lerp(62, 55, rock), 120
    if name in ('sciscope', 'skyline'):
        edge = tray_world(0.13, 0.1 if name == 'sciscope' else -0.08)
        low = edge.copy()
        low.z = TRAY.z + FLOOR + 0.006
        return low + Vector((0, 0, 0.004 * math.sin(lf / 3))), 58, 125 if name == 'sciscope' else 60
    # out of the way on the right rim
    return REST['pos'], REST['pitch'], REST['yaw']


def key_tongs():
    for f in range(N_FRAMES + 1):
        pos, pitch, yaw = tongs_pose(f)
        TONGS.location = pos
        TONGS.rotation_euler = Euler((math.radians(pitch), 0, math.radians(yaw)))
        TONGS.keyframe_insert('location', frame=f)
        TONGS.keyframe_insert('rotation_euler', frame=f)
    # hold still across each cut: no motion blur smeared from one shot into the next
    for fc in fcurves_of(TONGS):
        for kp in fc.keyframe_points:
            if int(kp.co.x) + 1 in CUTS:
                kp.interpolation = 'CONSTANT'


def ripple_events(name):
    """Pokes into the developer, in tray coordinates, derived from where the tongs touch."""
    ev = []
    a = SHOTS.index(name)
    touching_prev = False
    for lf in range(CUTS[a + 1] - CUTS[a]):
        pos, _, _ = tongs_pose(CUTS[a] + lf)
        pos_next, _, _ = tongs_pose(CUTS[a] + lf + 1)
        z = TRAY.z + LIQ_TOP
        touching = pos.z < z
        x, y = to_tray(pos)
        if touching and not touching_prev:
            ev.append((lf, x, y, -0.0022, 0.004))
        elif touching:
            speed = (pos_next - pos).length * FPS
            if speed > 0.01:
                ev.append((lf, x, y, -0.0005 * min(speed / 0.1, 2.0), 0.0035))
        elif touching_prev:
            ev.append((lf, x, y, 0.0012, 0.004))
        touching_prev = touching
    return ev


EVENTS = {n: ripple_events(n) for n in ('safelight', 'develop', 'sciscope', 'skyline')}

PROGRESS = {
    'safelight': lambda lf: 0.0,
    'develop': lambda lf: lerp(0.02, 1.2, span(lf, 4, 106) ** 1.25),
    'sciscope': lambda lf: lerp(0.42, 1.0, smooth(span(lf, 0, 27))),
    'skyline': lambda lf: lerp(0.36, 0.98, smooth(span(lf, 0, 27))),
}
TRAY_IMAGE = {'safelight': 'football', 'develop': 'football', 'sciscope': 'sciscope', 'skyline': 'skyline'}
TRAY_YAW = {'safelight': -2.0, 'develop': -2.0, 'sciscope': 3.0, 'skyline': -5.0}


def remaining_seconds(f):
    return max(0.0, (BELL - f) / FPS)


def apply_frame(f):
    """Everything that is not keyframed: which camera, which print, lights, liquid, timer."""
    i, lf = shot_of(f)
    name = SHOTS[i]
    scene.camera = CAMS[name]
    # prints
    in_tray = name in TRAY_IMAGE
    tray_print.hide_render = not in_tray
    LIQ.ob.hide_render = False
    if in_tray:
        tray_tex.image = TRAY_IMAGES[TRAY_IMAGE[name]]
        tray_progress.outputs[0].default_value = PROGRESS[name](lf)
        lay_in_tray(TRAY_YAW[name])
        h = LIQ.simulate(name, lf, EVENTS[name], seed=i + 3)
        LIQ.show(h, f / FPS)
    else:
        LIQ.show(np.zeros((LIQ.nx, LIQ.ny), np.float32), f / FPS)
    # lights
    s = safelight_level(f)
    wl = work_level(f)
    L_SAFE.data.energy = E['safe'] * s
    L_KEY.data.energy = E['key'] * s * (1 - 0.6 * wl)
    L_FILL.data.energy = E['fill'] * s
    L_TRAY.data.energy = E['tray'] * s * (1.0 if name in ('develop', 'sciscope', 'skyline') else 0.5)
    fp.inputs['Emission Strength'].default_value = E['filter'] * s * (1 - 0.85 * wl)
    L_WORK.data.energy = E['work'] * wl
    L_TUBE.data.energy = E['tube'] * wl
    tgp.inputs['Emission Strength'].default_value = TIMER_GLOW_BASE * (2.5 if name == 'timer' else 1.2) * (1 - 0.7 * wl)
    scene.view_settings.exposure = {'timer': -0.2, 'lights': -0.35}.get(name, 0.0)
    # timer: counts down to zero on the bell, one step per second
    r = remaining_seconds(f)
    step = math.ceil(r - 1e-6)
    frac = r - (step - 1) if step > 0 else 0
    settle = 0.0
    if step > 0 and frac > 0.94:     # the instant after a tick: a small overshoot
        settle = -0.8 * (frac - 0.94) / 0.06
    O['DR_Timer_SecondHand'].rotation_euler = (0, math.radians(6 * (step % 60) + settle), 0)
    O['DR_Timer_MinuteHand'].rotation_euler = (0, math.radians(0.1 * step), 0)
    # the drip on the portrait: swells, lets go, falls
    df = f - DRIP_START
    DRIP.hide_render = not (0 <= df < 28)
    grow = smooth(df / 16)
    fall = max(0, df - 16) / FPS
    DRIP.scale = (0.6 + 0.4 * grow, 0.6 + 0.4 * grow, 0.8 + 0.7 * grow)
    DRIP.location = DRIP_AT + Vector((0, 0, -0.0025 * grow - 0.5 * 9.8 * fall * fall))


key_cameras()
key_tongs()


def frames_to_render():
    if 'still' in ARGS:
        return [int(x) for x in ARGS['still'].split(',')]
    a, b = (int(x) for x in ARGS.get('frames', f'0-{N_FRAMES - 1}').split('-'))
    return list(range(a, b + 1, int(ARGS.get('step', 1))))


OUT = Path(ARGS.get('out', str(ART / 'work/frames')))
OUT.mkdir(parents=True, exist_ok=True)
if ARGS.get('save'):
    apply_frame(int(ARGS.get('still', '0').split(',')[0]))
    bpy.ops.wm.save_as_mainfile(filepath=ARGS['save'])
import time as _time
for f in frames_to_render():
    _t0 = _time.time()
    scene.frame_set(f)
    apply_frame(f)
    _t1 = _time.time()
    scene.render.filepath = str(OUT / f'f{f:04d}.png')
    bpy.ops.render.render(write_still=True)
    print('FRAME', f, f'prep {_t1 - _t0:.2f}s render {_time.time() - _t1:.2f}s', flush=True)

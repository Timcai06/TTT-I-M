"""Darkroom style frames.  blender -b -P tools/intro_film/scene.py -- shot=1 res=50 samples=64 [out=path.png]"""
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ART = Path(__file__).resolve().parents[2] / 'art/intro-film'
ARGS = dict(a.split('=', 1) for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
SHOT = int(ARGS.get('shot', 1))
RES = int(ARGS.get('res', 50))
SAMPLES = int(ARGS.get('samples', 64))
OUT = ARGS.get('out', str(ART / f'work/renders/shot{SHOT}.png'))

SAFE = (1.0, 0.045, 0.014)          # safelight red
TIMER_GLOW = (0.25, 1.0, 0.72)      # the darkroom timer's luminous dial

# ───────────────────────── reset ─────────────────────────
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
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 12
scene.cycles.transmission_bounces = 12
scene.cycles.glossy_bounces = 6
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 0.6
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = RES
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'AgX'
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.view_settings.exposure = float(ARGS.get('ev', 0))

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.0015, 0.0012, 0.0012, 1)

# ───────────────────────── helpers ─────────────────────────


def mat(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    for key, value in kw.items():
        if isinstance(value, tuple) and len(value) == 3:
            value = (*value, 1.0)
        p.inputs[key].default_value = value
    return m, p


def link(m, a, b):
    m.node_tree.links.new(a, b)


def node(m, kind, **props):
    n = m.node_tree.nodes.new(kind)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def add_bump(m, p, scale=400.0, strength=0.05, detail=6.0, rough_mix=None):
    tc = node(m, 'ShaderNodeTexCoord')
    nz = node(m, 'ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = detail
    link(m, tc.outputs['Object'], nz.inputs['Vector'])
    bump = node(m, 'ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    link(m, nz.outputs['Fac'], bump.inputs['Height'])
    link(m, bump.outputs['Normal'], p.inputs['Normal'])
    if rough_mix:
        ramp = node(m, 'ShaderNodeMapRange')
        ramp.inputs['To Min'].default_value = rough_mix[0]
        ramp.inputs['To Max'].default_value = rough_mix[1]
        nz2 = node(m, 'ShaderNodeTexNoise')
        nz2.inputs['Scale'].default_value = scale / 40
        link(m, tc.outputs['Object'], nz2.inputs['Vector'])
        link(m, nz2.outputs['Fac'], ramp.inputs['Value'])
        link(m, ramp.outputs['Result'], p.inputs['Roughness'])
    return nz


def image_mat(name, path, rough=0.45, coat=0.0, bump=0.02):
    m, p = mat(name, Roughness=rough)
    tex = node(m, 'ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(path))
    tex.interpolation = 'Cubic'
    link(m, tex.outputs['Color'], p.inputs['Base Color'])
    if coat:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = 0.08
    # fibre paper tooth
    add_bump(m, p, scale=900, strength=bump, detail=8)
    return m


def obj_from_bm(name, bm, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if material:
        ob.data.materials.append(material)
    return ob


def smooth(ob):
    for poly in ob.data.polygons:
        poly.use_smooth = True


def box(name, size, loc, material=None, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 4
        smooth(ob)
    if material:
        ob.data.materials.append(material)
    return ob


def cylinder(name, r, h, loc, material=None, rot=(0, 0, 0), verts=64, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
    if material:
        ob.data.materials.append(material)
    return ob


def area(name, loc, target, energy, color, size=0.2, shape='DISK', spread=None):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = energy
    light.color = color
    light.shape = shape
    light.size = size
    if spread is not None:
        light.spread = spread
    ob = bpy.data.objects.new(name, light)
    ob.location = loc
    scene.collection.objects.link(ob)
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def camera(loc, target, lens, fstop, focus, shift=(0, 0)):
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.aperture_blades = 7
    cd.dof.aperture_ratio = 1.0
    cd.shift_x, cd.shift_y = shift
    ob = bpy.data.objects.new('cam', cd)
    scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if isinstance(focus, bpy.types.Object):
        cd.dof.focus_object = focus
    else:
        cd.dof.focus_distance = focus
    scene.camera = ob
    return ob


# ───────────────────────── materials ─────────────────────────
steel, steel_p = mat('steel', **{'Base Color': (0.42, 0.40, 0.38), 'Metallic': 1.0, 'Roughness': 0.32, 'Anisotropic': 0.6})
add_bump(steel, steel_p, scale=180, strength=0.02, rough_mix=(0.2, 0.42))

wall, wall_p = mat('wall', **{'Base Color': (0.035, 0.03, 0.028), 'Roughness': 0.85})
add_bump(wall, wall_p, scale=60, strength=0.15)

tray_m, _ = mat('tray', **{'Base Color': (0.82, 0.8, 0.76), 'Roughness': 0.28, 'Coat Weight': 0.3})

liquid_m, _ = mat('developer', **{'Base Color': (0.98, 0.95, 0.86), 'Roughness': 0.015, 'IOR': 1.335, 'Transmission Weight': 1.0})


def shadow_clear(m, tint=(1, 1, 1)):
    # Light passes a liquid surface on shadow rays (no caustics needed for the
    # paper under it to be lit); camera and bounce rays still refract.
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


shadow_clear(liquid_m, (0.97, 0.95, 0.9))
water_m, _ = mat('water', **{'Base Color': (1, 1, 1), 'Roughness': 0.02, 'IOR': 1.333, 'Transmission Weight': 1.0})
shadow_clear(water_m)
amber_m, _ = mat('amber', **{'Base Color': (0.55, 0.22, 0.05), 'Roughness': 0.06, 'IOR': 1.5, 'Transmission Weight': 1.0})
black_plastic, _ = mat('black_plastic', **{'Base Color': (0.02, 0.02, 0.02), 'Roughness': 0.4})
bamboo, bamboo_p = mat('bamboo', **{'Base Color': (0.5, 0.36, 0.18), 'Roughness': 0.5})
add_bump(bamboo, bamboo_p, scale=30, strength=0.2)
rubber, _ = mat('rubber', **{'Base Color': (0.25, 0.02, 0.02), 'Roughness': 0.6})
wood, wood_p = mat('wood', **{'Base Color': (0.55, 0.42, 0.28), 'Roughness': 0.6})
add_bump(wood, wood_p, scale=80, strength=0.1)
line_m, _ = mat('line', **{'Base Color': (0.5, 0.48, 0.45), 'Roughness': 0.6})
housing, _ = mat('housing', **{'Base Color': (0.05, 0.045, 0.04), 'Metallic': 0.8, 'Roughness': 0.35})

safe_glass = bpy.data.materials.new('safe_glass')
safe_glass.use_nodes = True
nt = safe_glass.node_tree
nt.nodes.remove(nt.nodes['Principled BSDF'])
em = nt.nodes.new('ShaderNodeEmission')
em.inputs['Color'].default_value = (*SAFE, 1)
em.inputs['Strength'].default_value = float(ARGS.get('safeglow', 2.2))
nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])

dial = bpy.data.materials.new('dial')
dial.use_nodes = True
nt = dial.node_tree
nt.nodes.remove(nt.nodes['Principled BSDF'])
em = nt.nodes.new('ShaderNodeEmission')
em.inputs['Color'].default_value = (*TIMER_GLOW, 1)
em.inputs['Strength'].default_value = 2.2
nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])

# ───────────────────────── set ─────────────────────────
# Counter (stainless sink bed) and the back wall.
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
counter = bpy.context.active_object
counter.data.materials.append(steel)
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.62, 2), rotation=(math.pi / 2, 0, 0))
bpy.context.active_object.data.materials.append(wall)

# Tray: open box, walls thickened outward, every edge rounded.
TW, TL, TD = 0.30, 0.38, 0.06
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co.x *= TW
    v.co.y *= TL
    v.co.z = (v.co.z + 0.5) * TD + 0.004
top = [f for f in bm.faces if f.normal.z > 0.9]
bmesh.ops.delete(bm, geom=top, context='FACES')
tray = obj_from_bm('tray', bm, tray_m)
sol = tray.modifiers.new('solid', 'SOLIDIFY')
sol.thickness = 0.004
sol.offset = 1
bev = tray.modifiers.new('bevel', 'BEVEL')
bev.width = 0.014
bev.segments = 6
bev.limit_method = 'ANGLE'
smooth(tray)
# floor ribs
for i in range(-3, 4):
    box(f'rib{i}', (TW * 0.86, 0.004, 0.002), (0, i * 0.05, 0.005), tray_m, bevel=0.0009)


def ripple_height(x, y, rings):
    h = 0.0
    for (cx, cy, amp, k, phase, decay) in rings:
        r = math.hypot(x - cx, y - cy)
        h += amp * math.exp(-r / decay) * math.sin(k * r - phase)
    return h


def liquid(z, rings, meniscus=0.0009):
    bm = bmesh.new()
    nx, ny = 220, 280
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
    for v in bm.verts:
        v.co.x *= TW - 0.001
        v.co.y *= TL - 0.001
        x, y = v.co.x, v.co.y
        edge = min(TW / 2 - abs(x), TL / 2 - abs(y))
        v.co.z = z + ripple_height(x, y, rings) + meniscus * math.exp(-max(edge, 0) / 0.003)
    ob = obj_from_bm('developer', bm, liquid_m)
    # give it a skin: a thin solid so refraction enters and leaves properly
    s = ob.modifiers.new('solid', 'SOLIDIFY')
    s.thickness = z - 0.004
    s.offset = -1
    smooth(ob)
    return ob


def paper(name, image, size, loc, rot=(0, 0, 0), curl=0.0, sag=0.0, coat=0.0, bump=0.02):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=60, size=1, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    for v in ob.data.vertices:
        x, y = v.co.x, v.co.y
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z = curl * (x * 2) ** 2 + sag * math.sin((y + 0.5) * math.pi) * (1 - (x * 2) ** 2)
    ob.location = loc
    ob.rotation_euler = rot
    s = ob.modifiers.new('solid', 'SOLIDIFY')
    s.thickness = 0.0003
    smooth(ob)
    ob.data.materials.append(image_mat(name, image, rough=0.35, coat=coat, bump=bump))
    return ob


def stick(name, a, b, thick, material, tip=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = box(name, (thick, d.length, thick * 0.55), (a + b) / 2, material, bevel=thick * 0.2)
    ob.rotation_euler = d.to_track_quat('Y', 'Z').to_euler()
    if tip:
        t0 = b - d.normalized() * 0.028
        tob = box(name + '_tip', (thick * 1.25, 0.03, thick * 0.75), (t0 + b) / 2, tip, bevel=thick * 0.3)
        tob.rotation_euler = ob.rotation_euler
    return ob


def droplets(n, region, seed=1, scale=(0.002, 0.009)):
    rnd = random.Random(seed)
    for i in range(n):
        x = rnd.uniform(*region[0])
        y = rnd.uniform(*region[1])
        r = rnd.uniform(*scale)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r, location=(x, y, 0))
        d = bpy.context.active_object
        d.scale = (1, rnd.uniform(0.8, 1.3), 0.38)
        smooth(d)
        d.data.materials.append(water_m)


def safelight(loc, aim, strength=18.0, size=0.14):
    """The lamp itself (visible housing and glowing filter) plus the light it throws."""
    d = (Vector(aim) - Vector(loc)).normalized()
    rot = d.to_track_quat('-Z', 'Y').to_euler()
    root = bpy.data.objects.new('safelight', None)
    root.location = loc
    root.rotation_euler = rot
    scene.collection.objects.link(root)
    h = cylinder('safe_housing', 0.085, 0.07, (0, 0, 0.035), housing, verts=64, bevel=0.004)
    g = cylinder('safe_filter', 0.072, 0.004, (0, 0, -0.001), safe_glass, verts=64)
    for ob in (h, g):
        ob.parent = root
    a = area('safe_light', (0, 0, 0), (0, 0, -1), strength, SAFE, size=size)
    a.parent = root
    a.location = (0, 0, -0.01)
    a.rotation_euler = (0, 0, 0)
    return root


def bottle(loc, h=0.19, r=0.038):
    cylinder('bottle', r, h, (loc[0], loc[1], h / 2), amber_m, verts=64, bevel=0.01)
    cylinder('neck', r * 0.45, 0.03, (loc[0], loc[1], h + 0.012), amber_m, verts=48)
    cylinder('cap', r * 0.5, 0.022, (loc[0], loc[1], h + 0.035), black_plastic, verts=48, bevel=0.002)


def timer(loc):
    box('timer_body', (0.13, 0.06, 0.14), (loc[0], loc[1], 0.07), black_plastic, bevel=0.01)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.042, minor_radius=0.0016, location=(loc[0], loc[1] - 0.031, 0.075), rotation=(math.pi / 2, 0, 0))
    bpy.context.active_object.data.materials.append(dial)
    for i in range(12):
        a = i / 12 * math.tau
        box(f'tick{i}', (0.002, 0.001, 0.007), (loc[0] + math.sin(a) * 0.034, loc[1] - 0.032, 0.075 + math.cos(a) * 0.034), dial, rot=(0, -a, 0))
    box('hand', (0.002, 0.001, 0.03), (loc[0] + 0.008, loc[1] - 0.033, 0.086), dial, rot=(0, -0.5, 0))


def clothesline(y, z, x0=-1.2, x1=1.2):
    cylinder('line', 0.0012, x1 - x0, ((x0 + x1) / 2, y, z), line_m, rot=(0, math.pi / 2, 0), verts=12)


def peg(x, y, z):
    box('peg_a', (0.012, 0.006, 0.07), (x, y - 0.004, z - 0.012), wood, bevel=0.002)
    box('peg_b', (0.012, 0.006, 0.07), (x, y + 0.004, z - 0.012), wood, bevel=0.002)


def hanging_print(image, x, y, z_line, size, tilt=0.0, sag=0.004, corners=False):
    w, h = size
    ob = paper(f'hang_{image.stem}_{x:.2f}', image, (w, h), (x, y, z_line - h / 2 - 0.01),
               rot=(math.pi / 2, 0, tilt), sag=sag, coat=0.25)
    if corners:
        for side in (-1, 1):
            peg(x + side * (w / 2 - 0.012) * math.cos(tilt), y + side * (w / 2 - 0.012) * math.sin(tilt), z_line)
    else:
        peg(x, y, z_line)
    return ob


P = ART / 'work/prints'

# ───────────────────────── shots ─────────────────────────
if SHOT == 1:
    # SAFELIGHT — the room, red. A blank sheet going under.
    rings = [(-0.06, -0.08, 0.00022, 520, 0.0, 0.07), (0.05, 0.1, 0.0001, 300, 1.3, 0.12)]
    liquid(0.032, rings)
    sheet = paper('sheet', P / 'blank.png', (0.203, 0.254), (-0.015, -0.01, 0.0072), rot=(0.0, 0.0, 0.1), curl=0.0015)
    # tongs resting across the rim
    stick('tongs', (0.3, -0.12, 0.15), (0.09, 0.02, 0.024), 0.011, bamboo, tip=rubber)
    bottle((0.36, 0.34))
    bottle((0.47, 0.44), h=0.23, r=0.042)
    timer((-0.38, 0.36))
    clothesline(0.52, 0.34)
    hanging_print(P / 'night_p100.png', -0.46, 0.52, 0.34, (0.18, 0.225), tilt=0.05)
    hanging_print(P / 'skyline_p100.png', -0.16, 0.52, 0.34, (0.225, 0.18), tilt=-0.03)
    hanging_print(P / 'aboutme_p100.png', 0.12, 0.52, 0.34, (0.18, 0.225), tilt=0.02)
    safelight((0.42, 0.58, 0.27), (0.1, -0.2, 0.0), strength=0.8)
    area('safe_key', (0.1, 0.05, 0.75), (0.0, 0.0, 0.0), float(ARGS.get('safe', 7)), SAFE, size=0.16)
    droplets(45, ((-0.45, 0.35), (-0.33, -0.2)), seed=4)
    # a whisper of fill so the black holds detail instead of dying
    area('bounce', (-0.6, -0.4, 0.5), (0, 0, 0), 1.2, (1.0, 0.35, 0.25), size=1.5)
    camera((0.02, -0.64, 0.27), (0.0, 0.12, 0.12), lens=36, fstop=1.6, focus=0.70)

elif SHOT == 2:
    # DEVELOPING — the image arriving under the liquid.
    rings = [(0.1, 0.075, 0.0007, 560, 0.9, 0.1), (-0.12, -0.15, 0.00025, 380, 0.3, 0.14)]
    liquid(0.030, rings)
    paper('print', P / 'football_p60.png', (0.254, 0.203), (0.0, 0.0, 0.0072), rot=(0, 0, -0.04), curl=0.001)
    safelight((-0.245, 0.58, 0.27), (0.0, 0.0, 0.03), strength=1.0)
    area('safe_key', (-0.05, 0.1, 0.7), (0.0, 0.0, 0.0), float(ARGS.get('safe', 6)), SAFE, size=0.16)
    stick('tongs', (0.3, 0.26, 0.11), (0.1, 0.075, 0.02), 0.011, bamboo, tip=rubber)
    area('bounce', (-0.5, -0.3, 0.4), (0, 0, 0), 0.6, (1.0, 0.35, 0.25), size=1.2)
    camera((0.03, -0.27, 0.19), (0.0, 0.0, 0.012), lens=70, fstop=4.0, focus=0.354)

elif SHOT == 3:
    # LIGHTS ON — the portrait print on the line, white light, the site's palette.
    counter.hide_render = True
    for ob in scene.objects:
        if ob.name.startswith(('tray', 'rib')):
            ob.hide_render = True
    line_m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.12, 0.11, 0.1, 1)
    clothesline(0.0, 0.42)
    main = hanging_print(P / 'tim_p100.png', 0.16, 0.0, 0.42, (0.203, 0.254), tilt=-0.08, sag=0.006, corners=True)
    hanging_print(P / 'football_p100.png', -0.24, 0.22, 0.42, (0.254, 0.203), tilt=0.12)
    hanging_print(P / 'sciscope_p100.png', 0.55, 0.26, 0.42, (0.254, 0.203), tilt=-0.1)
    droplets(1, ((0.16, 0.16), (0.0, 0.0)), seed=9)
    # white work-light from upper left, safelight still glowing as a red rim right
    area('work', (-0.55, -0.45, 0.75), (0.16, 0.0, 0.28), float(ARGS.get('work', 28)), (1.0, 0.94, 0.86), size=0.35, spread=math.radians(55))
    area('rim', (0.8, 0.3, 0.45), (0.16, 0.0, 0.3), 4, SAFE, size=0.3)
    camera((0.04, -0.9, 0.29), (0.04, 0.0, 0.29), lens=45, fstop=1.4, focus=0.9)

scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)

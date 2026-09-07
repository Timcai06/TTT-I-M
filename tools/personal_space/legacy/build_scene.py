"""Build the first personal archive blockout, export GLB, and render review views.

Run from anywhere with Blender --background --factory-startup --python FILE.
Use -- --skip-render to export only. Original user references remain read-only.
Dimensions are design assumptions, not measurements extracted from AI images.
"""
import json
import math
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent/'modeling'))
from primitives import area, box, camera, cylinder, empty, material, plane_image, radians, rod

ROOT = HERE.parents[2]
REFINED = True
OUT = ROOT / 'art/personal-archive/reviews/legacy-rebuild'
BLEND = ROOT / 'art/personal-archive/source/tim-cai-personal-archive.blend'
ASSETS = ROOT / 'apps/landing/src/assets/personal-archive'
PUBLIC = ROOT / 'apps/landing/public'
OUT.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
# This background process must not create additional .blend or .blend1 versions.
bpy.context.preferences.filepaths.save_version = 0

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 25

wall = material('Limestone • blockout', (0.39, 0.37, 0.33))
wood = material('Walnut • base tone', (0.19, 0.115, 0.064))
edge = material('Warm wood edge', (0.25, 0.17, 0.10))
metal = material('Charcoal powder coat', (0.035, 0.043, 0.045), 0.4, 0.4)
silver = material('Brushed hardware', (0.29, 0.32, 0.32), 0.8, 0.32)
paper = material('Warm paper', (0.77, 0.72, 0.61), roughness=0.88)
cloth = material('Notebook linen', (0.57, 0.53, 0.44), roughness=0.94)
red = material('Archive red', (0.27, 0.035, 0.021))
green = material('Foliage • blockout', (0.065, 0.12, 0.057))
screen = material('Display glass', (0.035, 0.058, 0.066), 0.2, 0.25)
floor_mats = [material(f'Floor tone {i}', (0.13+i*.013, .086+i*.008, .053+i*.005)) for i in range(5)]

# Envelope: one room, an open front for review, and a real opening in the left wall.
box('Floor foundation', (0, 0, -.065), (3.6, 3.1, .13), metal)
for i in range(18):
    for j in range(3):
        box(f'Floorboard_{i:02}_{j}', (-1.7+i*.2, -1.03+j*1.03, .01), (.196, 1.026, .025), floor_mats[(i+j)%5], .002)
box('Back wall', (0, 1.55, 1.4), (3.68, .12, 2.8), wall)
box('Right wall', (1.84, 0, 1.4), (.12, 3.1, 2.8), wall)
box('Window wall lower', (-1.84, 0, .28), (.12, 3.1, .56), wall)
box('Window wall upper', (-1.84, 0, 2.66), (.12, 3.1, .28), wall)
box('Window wall rear', (-1.84, 1.13, 1.54), (.12, .84, 1.96), wall)
box('Window wall front', (-1.84, -1.39, 1.54), (.12, .32, 1.96), wall)
for y in [-1.22, -.25, .72]:
    box('Window vertical mullion', (-1.82, y, 1.55), (.045, .035, 1.96), metal, .002)
for z in [.57, 1.55, 2.53]:
    box('Window horizontal mullion', (-1.82, -.25, z), (.045, 1.97, .035), metal, .002)
box('Window sill', (-1.73, -.25, .57), (.29, 2.08, .055), wall)
for i in range(13):
    box('Radiator fin', (-1.69, -.88+i*.105, .31), (.13, .063, .43), metal, .019)
box('Rug', (0, -.73, .039), (2.34, 1.27, .012), material('Rug • blockout', (.27, .21, .15)), .007)
for x in [-1.11, 1.11]:
    box('Rug border', (x, -.73, .047), (.022, 1.17, .003), paper, 0)
for y in [-1.30, -.16]:
    box('Rug border', (0, y, .047), (2.22, .022, .003), paper, 0)

# Desk and physically shallow archive drawers.
box('Desk slab', (.12, .95, .79), (2.46, .79, .065), wood, .012)
for x in [-1.04, 1.30]:
    for y in [.61, 1.28]:
        box('Desk leg', (x, y, .39), (.047, .047, .76), metal)
box('Desk apron', (.12, 1.28, .70), (2.4, .035, .095), metal)
box('Cabinet left', (.64, .96, .385), (.025, .68, .72), metal)
box('Cabinet right', (1.27, .96, .385), (.025, .68, .72), metal)
box('Cabinet back', (.955, 1.30, .385), (.65, .025, .72), metal)
for i in range(8):
    z = .105 + i*.081
    box(f'Drawer_{i+1:02}_front', (.955, .606, z), (.595, .023, .071), metal, .004)
    box(f'Drawer_{i+1:02}_label', (.955, .591, z), (.105, .008, .027), silver, .002)
    box(f'Drawer_{i+1:02}_label_insert', (.955, .585, z), (.087, .003, .016), paper, .001)
    rod('Drawer handle', (.89, .571, z+.018), (1.02, .571, z+.018), .006, silver)

# Visible, separate top tray and six flat sleeves; ready for the next slice.
drawer = empty('ArchiveTray', (.955, .90, .712))
box('ArchiveTray_bottom', (0, 0, 0), (.575, .55, .012), wood, .002, drawer)
for i in range(6):
    folder = box(f'ArchiveFolder_{i+1:02}', (0, .015, .009+i*.004), (.42, .30, .003), paper, .001, drawer)
    box(f'ArchiveTab_{i+1:02}', (-.175+i*.065, -.144, .010+i*.004), (.046, .029, .003), red, .001, drawer)

# Left shelf and simplified life objects.
for x in [-1.69, -1.14]:
    for y in [.82, 1.40]:
        box('Shelf upright', (x, y, 1.04), (.026, .026, 2.02), metal, .003)
for z in [.20, .64, 1.09, 1.53, 1.98]:
    box('Shelf plank', (-1.415, 1.11, z), (.63, .64, .034), wood)
for level, count in [(.66, 5), (1.55, 4)]:
    for i in range(count):
        box('Book spine', (-1.60+i*.072, 1.20, level+.14), (.053, .24, .28+(i%2)*.02), [paper, metal, cloth][i%3], .002)
box('Life folded map', (-1.57, 1.06, 1.12), (.20, .23, .016), paper, .002)
cylinder('Life cup', (-1.37, 1.07, 1.17), .049, .12, cloth)
box('Life envelope', (-1.19, 1.09, 1.13), (.16, .22, .012), paper, .002)
cylinder('Plant pot', (-1.46, 1.11, 2.08), .11, .17, metal)
for i in range(9):
    a = i*2.399
    leaf = box('Plant leaf • proxy', (-1.46+math.cos(a)*.15, 1.11+math.sin(a)*.13, 2.22+(i%3)*.025), (.06, .17, .012), green, .02)
    leaf.rotation_euler = (radians(25), radians(i*12), a)

# Notebook: rigid cover pivot, separate paper block, an actual glTF animation.
book_x, book_y = -.58, .88
box('Notebook_back', (book_x, book_y, .831), (.29, .36, .012), cloth, .004)
box('Notebook_pages', (book_x, book_y, .849), (.278, .346, .025), paper, .003)
box('NotebookReadingSurface', (book_x, book_y, .863), (.266, .332, .0015), paper, .0006)
empty('NotebookReadingAnchor', (book_x, book_y, .864))
for i in range(4):
    box('Notebook page edge', (book_x+.139, book_y, .841+i*.006), (.001, .34, .001), cloth, 0)
box('Notebook_bookmark', (book_x-.06, book_y-.20, .833), (.013, .09, .002), red, .001)
hinge = empty('NotebookHinge', (book_x-.145, book_y, .866))
box('NotebookCover', (.145, 0, 0), (.29, .36, .012), cloth, .004, hinge)
box('Notebook_cover_label', (.145, .035, .0065), (.10, .12, .001), paper, .001, hinge)
hinge.rotation_euler.y = 0
hinge.keyframe_insert(data_path='rotation_euler', frame=1)
hinge.rotation_euler.y = radians(-145)
hinge.keyframe_insert(data_path='rotation_euler', frame=25)
hinge.animation_data.action.name = 'NotebookOpen'
rod('Pen', (-.30, .75, .832), (-.27, .99, .832), .005, metal)

# Monitor and working tools, consistently present in every view.
cylinder('Monitor stem', (.48, 1.15, 1.00), .027, .32, metal)
box('Monitor base', (.48, 1.10, .835), (.36, .23, .018), metal)
box('Monitor bezel', (.48, 1.19, 1.25), (.79, .047, .45), metal, .012)
box('Monitor screen', (.48, 1.163, 1.25), (.748, .004, .405), screen, .002)
box('Keyboard', (.44, .77, .844), (.48, .16, .027), metal, .009)
for row in range(4):
    for col in range(12):
        box('Key', (.225+col*.039, .715+row*.035, .861), (.030, .025, .008), silver, .002)
box('Mouse mat', (.96, .78, .827), (.28, .22, .005), cloth, .009)
box('Mouse', (.96, .79, .847), (.052, .09, .034), metal, .018)
box('External device', (1.08, 1.05, .842), (.12, .085, .028), silver)
rod('Signal cable', (1.08, 1.1, .837), (1.31, 1.13, .837), .003, red)
rod('Signal cable edge', (1.31, 1.13, .837), (1.31, .58, .837), .003, red)

# Lamp with believable joints; warm light is a Blender review light, rebuilt on web.
cylinder('Lamp base', (1.16, 1.24, .844), .094, .033, metal)
rod('Lamp lower arm', (1.16, 1.24, .86), (1.31, 1.22, 1.23), .014, metal)
rod('Lamp upper arm', (1.31, 1.22, 1.23), (1.00, 1.14, 1.47), .014, metal)
for point in [(1.16, 1.24, .86), (1.31, 1.22, 1.23), (1.00, 1.14, 1.47)]:
    cylinder('Lamp joint', point, .026, .038, silver)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.083, radius2=.037, depth=.11, location=(1.00, 1.14, 1.43))
bpy.context.object.name = 'Lamp shade'
bpy.context.object.data.materials.append(metal)
area('Task light', (1, 1.12, 1.36), (.6, .8, .8), 25, (1, .69, .39), .17)

# Chair, deliberately right-offset to keep the notebook camera path clear.
box('Chair seat', (.22, -.32, .46), (.49, .43, .07), wood, .025)
box('Chair back', (.22, -.52, .76), (.48, .04, .43), wood, .023)
for x in [-.045, .485]:
    rod('Chair back frame', (x, -.52, .48), (x, -.52, .98), .014, metal)
    rod('Chair arm', (x, -.48, .68), (x, -.13, .68), .016, metal)
cylinder('Chair post', (.22, -.32, .265), .032, .35, metal)
for i in range(5):
    a = i*math.tau/5
    p = (.22+.30*math.cos(a), -.32+.30*math.sin(a), .085)
    rod('Chair foot', (.22, -.32, .12), p, .017, metal)
    cylinder('Chair caster', p, .04, .037, metal)

# Four print mounts on the right wall: real repository photographs, aspect fitted.
rod('Photography rail', (1.75, -.65, 1.94), (1.75, 1.25, 1.94), .012, silver)
photo_sources = ['frame/buildings/03-720.webp', 'frame/scenery/scenery-05-720.webp', 'frame/cuisine/cuisine-04-720.webp', 'life/football-action.webp']
for i, source in enumerate(photo_sources):
    y = -.40+i*.43
    box(f'PhotoMount_{i+1:02}', (1.751, y, 1.58), (.006, .35, .49), paper, .001)
    box(f'PhotoClip_{i+1:02}', (1.739, y, 1.85), (.014, .028, .070), silver, .002)
    plane_image(f'ArchivePhoto_{i+1:02}', PUBLIC/source, (1.746, y, 1.59), .29, .38, (radians(90), 0, radians(-90)))
for x, width, height, z in [(-.60, .63, .84, 1.87), (.38, .58, .64, 1.89)]:
    box('Back wall frame', (x, 1.476, z), (width+.04, .028, height+.04), metal, .003)
    box('Back wall mount', (x, 1.458, z), (width, .007, height), paper, .001)
    box('Back wall graphic • placeholder', (x, 1.451, z), (width*.77, .003, height*.72), wall, 0)

# Review cameras use Z-up Blender coordinates. Config exports Y-up web equivalents.
views = {
    'entrance': {'position': [-.65, -3.45, 1.82], 'target': [0, .92, 1.22], 'lens': 31},
    'about': {'position': [-.48, -.08, 1.57], 'target': [-.65, .88, .86], 'lens': 38},
    'mobile': {'position': [-.40, -3.90, 1.87], 'target': [-.02, .85, 1.20], 'lens': 29},
    'structure': {'position': [-3.1, -4.1, 4.2], 'target': [0, .22, 1.00], 'lens': 36},
}
cameras = {name: camera('Camera_'+name, view['position'], view['target'], view['lens']) for name, view in views.items()}
area('Window softbox', (-1.72, -.25, 1.80), (.25, .95, .9), 180, (.78, .88, 1), 1.65)
area('Front bounce', (0, -2.7, 2.4), (0, .85, 1), 95, (1, .93, .83), 3)
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.47, .52, .59, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .3
scene.view_settings.view_transform = 'AgX'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
stage = {'stage': 'blockout'}
if REFINED:
    from refine_scene import apply, batch_static
    stage = apply(scene, ROOT/'art/personal-archive')
    from reading_details import apply_reading_details
    apply_reading_details()
scene.frame_set(1)
scene.camera = cameras['entrance']
scene.render.resolution_x, scene.render.resolution_y = 1280, 800
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

def web_point(v):
    return [v[0], v[2], -v[1]]

config = {name: {'position': web_point(view['position']), 'target': web_point(view['target']), 'fov': math.degrees(2*math.atan(24/(2*view['lens'])))} for name, view in views.items()}
(ASSETS/'cameras.json').write_text(json.dumps(config, indent=2)+'\n')
mesh_objects = [o for o in scene.objects if o.type == 'MESH']
manifest = {**stage, 'blender': bpy.app.version_string, 'meshObjects': len(mesh_objects), 'triangles': sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in mesh_objects), 'sourceImages': photo_sources, 'animation': 'NotebookOpen', 'dimensionsAreDesignAssumptions': True}

if '--skip-render' not in sys.argv:
    for name in ['entrance', 'about', 'mobile', 'structure']:
        scene.camera = cameras[name]
        scene.frame_set(25 if name == 'about' else 1)
        scene.render.resolution_x, scene.render.resolution_y = ((675, 1200) if name == 'mobile' else (1280, 800))
        scene.render.filepath = str(OUT/f'{name}.png')
        # Structure render hides left wall to inspect the cutaway, never exported.
        hidden = [o for o in scene.objects if o.name.startswith(('Window wall', 'Window vertical', 'Window horizontal', 'Window sill', 'Radiator'))]
        for obj in hidden:
            obj.hide_render = name == 'structure'
        bpy.ops.render.render(write_still=True)
        for obj in hidden:
            obj.hide_render = False
        print('PERSONAL_SPACE_RENDER', name, flush=True)

# Save editable source first; batch only the disposable web export scene.
scene.frame_set(1)
if REFINED:
    batch_static(scene)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'personal-space.glb'), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_cameras=False, export_lights=False)
manifest['glbBytes'] = (ASSETS/'personal-space.glb').stat().st_size
manifest['exportMeshObjects'] = len([o for o in scene.objects if o.type == 'MESH'])
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('PERSONAL_SPACE_EXPORT', json.dumps(manifest), flush=True)

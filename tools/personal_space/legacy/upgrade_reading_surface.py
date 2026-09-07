"""Upgrade the existing canonical source in place. No rendering or extra blend files."""
from pathlib import Path
import sys
import json
import bpy

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'modeling'))
from surface_materials import surface
from refine_scene import batch_static

out = ROOT / 'art/personal-archive'
source = out / 'source/tim-cai-personal-archive.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
bpy.context.preferences.filepaths.save_version = 0
specs = [
    ('Walnut_oiled', 'wood', (.10,.045,.019), (.36,.19,.08), .40, 1024),
    ('Plaster_warm', 'plaster', (.29,.27,.23), (.46,.43,.37), .88, 512),
    ('Linen_natural', 'linen', (.33,.29,.22), (.57,.52,.42), .92, 512),
    ('Paper_fiber', 'paper', (.68,.62,.50), (.86,.81,.69), .90, 512),
    ('Rug_archive', 'rug', (.075,.045,.028), (.30,.20,.12), .96, 512),
    ('Ceramic_speckle', 'plaster', (.20,.17,.13), (.40,.34,.26), .38, 512),
]
for name, kind, dark, light, roughness, size in specs:
    old = bpy.data.materials.get(name)
    if old:
        old.name = name + '_replaced'
    new = surface(name, kind, dark, light, out/'textures', roughness=roughness, size=size)
    if old:
        old.user_remap(new)
        bpy.data.materials.remove(old)
from reading_details import apply_reading_details
apply_reading_details()
bpy.context.scene.frame_set(1)
# Remove replaced packed images so repeated upgrades do not accumulate source data.
for image in list(bpy.data.images):
    if image.users == 0:
        bpy.data.images.remove(image)
bpy.ops.wm.save_as_mainfile(filepath=str(source))
batch_static(bpy.context.scene)
asset = ROOT/'apps/landing/src/assets/personal-archive/personal-space.glb'
bpy.ops.export_scene.gltf(filepath=str(asset), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_cameras=False, export_lights=False)
(out/'reviews/current/reading-surface-upgrade.json').write_text(json.dumps({'glbBytes': asset.stat().st_size, 'textures': {s[0]: s[-1] for s in specs}, 'visualAcceptance': 'pending tim'}, indent=2)+'\n')
print('READING_SURFACE_UPGRADE', asset.stat().st_size, flush=True)

"""Author only the approved prop maps. UVs follow connected physical pieces."""
import math
from pathlib import Path
import bpy
import numpy as np

PROP_NAMES = {'Cinema rug binding', 'Cinema unbleached binding thread', 'Dry branches',
              'Coffee', 'Archive red', 'Curtain / dark woven tie', 'Window / rubber seals',
              'Leaf_0', 'Leaf_1', 'Leaf_2'}

def is_prop(name):
    # The separately baked red architecture slot was not in the approved list.
    return name in PROP_NAMES or (name.startswith('RoomBake_') and name[9:] in PROP_NAMES and name != 'RoomBake_Archive red')

def save_data(name, values, folder):
    h, w = values.shape[:2]
    rgba = np.ones((h, w, 4), np.float32)
    rgba[:, :, :3] = values[:, :, None] if values.ndim == 2 else values
    image = bpy.data.images.new(name, width=w, height=h, alpha=False, float_buffer=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(folder / (name + '.png')); image.file_format = 'PNG'; image.save()
    return image

def make_maps(name, folder, size=512):
    kind = name.removeprefix('RoomBake_')
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    rng = np.random.default_rng(917)
    grain = rng.normal(0, 1, (size, size)).astype(np.float32)
    broad = np.sin(x*31 + np.sin(y*19))*np.cos(y*23-x*7)
    if kind.startswith('Leaf_'):
        midrib = np.exp(-((x-.5)/.012)**2)
        # Alternating chevrons branch from the central vein toward the tip.
        phase = (y - .42*np.abs(x-.5))*9
        side = np.exp(-(np.sin(phase*math.pi)/.14)**2) * (1-midrib)
        side *= np.clip(1-np.abs(x-.5)*1.8, 0, 1)
        height = .72*midrib + .19*side + .004*grain
        rough = .34 + .30*np.clip(np.abs(x-.5)*2, 0, 1)**.75 - .10*midrib - .025*side + .012*broad
        strength = 4
    elif kind == 'Coffee':
        radius = np.sqrt(((x-.5)*2)**2+((y-.5)*2)**2)
        rim = np.clip((radius-.83)/.16, 0, 1); rim = rim*rim*(3-2*rim)
        rough = .14 + .16*rim + .009*broad*rim
        height = .045*rim; strength = 1
    elif kind == 'Dry branches':
        fibre = np.sin(x*2*math.pi*26 + .6*np.sin(y*2*math.pi*3))
        height = .18*fibre + .045*broad + .008*grain
        rough = .82 + .08*broad + .055*(1-fibre)*.5; strength = 2
    elif kind == 'Window / rubber seals':
        tooling = np.sin(x*2*math.pi*52)
        height = .014*tooling + .003*grain
        dust = np.clip(.5+.45*broad, 0, 1)
        rough = .35+.20*dust+.014*grain; strength = 1.5
    else:
        # Long warp yarns and the alternating over/under of a plain weave.
        warp = np.cos(x*2*math.pi*32)
        weft = np.cos(y*2*math.pi*48)
        over = np.sin(x*2*math.pi*16)*np.sin(y*2*math.pi*24)
        height = .065*warp+.032*weft+.025*over+.002*grain
        base = {'Archive red': .60, 'Cinema rug binding': .88,
                'Cinema unbleached binding thread': .90, 'Curtain / dark woven tie': .88}[kind]
        rough = base+.035*warp+.023*weft+.025*broad
        strength = 2
    dx = (np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*strength
    dy = (np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*strength
    normal = np.stack([-dx,-dy,np.ones_like(dx)],axis=2)
    normal /= np.linalg.norm(normal,axis=2,keepdims=True)
    slug = kind.replace(' / ','-').replace(' ','-')
    return {'normal': save_data(slug+'-normal',normal*.5+.5,folder),
            'roughness': save_data(slug+'-roughness',np.clip(rough,.06,.98),folder)}

def detail_uv(positions, triangles, kind):
    """PCA per connected component: never project every leaf in world XY."""
    count = len(positions); parent = np.arange(count)
    def root(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    # glTF often splits vertices at normals/UVs. Weld only for component discovery.
    seen = {}
    for i,p in enumerate(positions):
        key = tuple(np.round(p,6))
        if key in seen: parent[root(i)] = root(seen[key])
        else: seen[key] = i
    for tri in triangles:
        for a in tri[1:]: parent[root(int(a))] = root(int(tri[0]))
    groups = {}
    for i in range(count): groups.setdefault(root(i),[]).append(i)
    uv = np.zeros((count,2),np.float32)
    for ids in groups.values():
        points = positions[ids]; centered = points-points.mean(axis=0)
        _, _, axes = np.linalg.svd(centered,full_matrices=False)
        if len(axes)<2: continue
        projected = centered @ axes[:2].T
        if kind == 'Coffee':
            # Liquid and its meniscus share one radial domain, handled below.
            continue
        low,high = projected.min(axis=0),projected.max(axis=0)
        normalized = (projected-low)/np.maximum(high-low,1e-7)
        # The long axis is V; transverse width is U. Keep signed side directions.
        uv[ids] = normalized[:,[1,0]]
        if kind.startswith('Leaf_') and (high[1]-low[1]) < (high[0]-low[0])*.12:
            # Stems/physical vein tubes share leaf materials. Sample a quiet strip.
            uv[ids,0] = .94 + .02*normalized[:,1]
    if kind == 'Coffee':
        # Room-up is Y in the source glTF; the liquid is horizontal in XZ.
        projected = positions[:,[0,2]]
        lo, hi = projected.min(axis=0),projected.max(axis=0)
        uv = (projected-(lo+hi)*.5)/max(np.max(hi-lo),1e-6)+.5
    return uv

# Room model: material work order

Everything below is measured from `apps/landing/src/assets/personal-archive/personal-space.glb`,
not judged by eye. Re-measure after any change rather than trusting this file.

| quantity | value |
| --- | --- |
| file | 21.83 MB |
| triangles | 114,365 |
| meshes / primitives / nodes | 79 / 99 / 137 |
| materials | 54 |
| materials with both a normal and a roughness map | 16 |
| materials with neither | 38 (37,050 triangles) |
| images | 46 — 25 PNG (11.42 MB), 13 JPEG (1.22 MB), 8 WebP (1.14 MB) |
| compression extensions in use | none (no KTX2, no Draco, no meshopt) |

**Geometry is not the problem.** 114k triangles is nothing for any GPU this site
targets. Do not spend time decimating.

## 1. Do not touch these

These 16 materials carry both a normal and a roughness map and are authored
correctly. They are the large architectural surfaces and they are what the room
gets right:

`Walnut_oiled`, `Plaster_warm`, `Linen_natural`, `Ceramic_speckle`,
`Brushed hardware`, `Paper_fiber`, `Charcoal powder coat`, `Graphite keycaps`,
`Warm oatmeal upholstery` — and their `RoomBake_` variants.

Also leave flat, because they are flat in reality: `Archive Ink` (12,852 tris of
printed text), the monitor interface materials, the lamp bulb, the clear window
glass, the standby display, and the photographic panorama.

## 2. The props that read as plastic

These carry a single roughness number across their whole surface and no normal
map. A perfectly uniform specular response is the strongest single cue that an
object is not real, and it is why the plants look like plastic.

| material | triangles | current roughness |
| --- | --- | --- |
| `RoomBake_Cinema rug binding` | 3,328 | 0.88 |
| `Cinema unbleached binding thread` | 2,688 | 0.90 |
| `RoomBake_Dry branches` | 1,876 | 0.89 |
| `RoomBake_Coffee` | 956 | 0.21 |
| `Archive red` | 844 | 0.60 |
| `RoomBake_Curtain / dark woven tie` | 760 | 0.88 |
| `RoomBake_Window / rubber seals` | 648 | 0.44 |
| `RoomBake_Leaf_0 / _1 / _2` | 1,520 | 0.55 |

Each needs a roughness map and a normal map. Leaves need vein structure in the
normal and a waxy-to-matte gradient in the roughness; a leaf is glossier along
the midrib than at the edge. The rug binding and binding thread need woven
directionality. The coffee needs a liquid surface that is smooth in the middle
and wets the ceramic at the rim.

The render layer currently applies a small object-space noise to these materials'
roughness as a stopgap (`archiveMaterials.ts`, `ROUGHNESS_BREAKUP`). Delete that
call once real maps ship — it adds variation, not detail, and real maps make it
redundant.

## 3. The bake

Exactly one baked indirect map exists: `ArchiveIndirectRGB`, a 4.69 MB PNG. Every
other surface is lit purely in realtime, which is why the shadow side reads flat.

A re-bake has to match the realtime rig or the two will fight. The rig, from
`archiveRuntimeLighting.ts`:

- tone mapping AgX, exposure 1.02
- key: directional `#ffb570`, intensity 2.75, at `(4.1, 1.95, -5.4)` aimed at
  `(0, 0.85, -0.8)` — about 11 degrees of elevation, which is where the long
  raking shadows come from
- fill: hemisphere, sky `#9fb8d2`, ground `#8a5f34`, intensity 0.58
- desk task light: spot `#ffd09a`, intensity 2.6, at `(1, 1.381, -1.14)`
- shelf: point `#f6c58e`, intensity 0.08, at `(0.3, 2.37, -1.31)`
- environment: PMREM of three's RoomEnvironment at intensity 0.52

Bake ambient occlusion and indirect colour per material at that sun angle, into
the `RoomBake_` slot convention the loader already reads.

## 4. Texture format

11.42 MB of the file is PNG, and the largest are roughness maps stored as RGB:
`charcoal-powder-coat-roughness` 854 KB, `graphite-keycaps-roughness` 831 KB,
`ceramic_speckle-roughness` 812 KB, `brushed-hardware-roughness` 702 KB. Roughness
is one channel being paid for three times.

- Pack occlusion / roughness / metallic into one ORM texture per material.
- Ship KTX2 / Basis rather than PNG. It cuts decoded VRAM as well as download,
  which PNG does not.
- Keep `EXT_texture_webp` for any base colour that stays uncompressed.

The build guard in `tests/build/deferred-image-budget-guards.mjs` holds the
desktop prepared-asset total under 50 MiB and currently reports 48.3. There is not
much room, so this section is not optional if the bake adds textures.

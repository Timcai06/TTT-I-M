# Personal Archive asset tools

The source model is `art/personal-archive/source/tim-cai-personal-archive.blend`; the website scene is `apps/landing/src/assets/personal-archive/personal-space.glb`. The current reproducible website-material pipeline is [the sunrise export flow](exporting/README.md), orchestrated by `exporting/rebuild_sunrise.mjs`. It includes the later movable-print receiver correction. The script changes the source model's authorized prop materials, produces and verifies the GLB, replaces the website asset after verification, and runs Landing checks and a build. It does not open a browser or perform visual acceptance.

From the repository root, with `TOKTX` and `KTX` set to the Khronos KTX-Software 4.4.2 executables, the documented entry is:

```sh
rtk proxy node tools/personal_space/exporting/rebuild_sunrise.mjs
```

This is a production asset operation, not a read-only check. Its intermediate files and source backup live under `output/material-optimization/`; the print correction also writes `output/print-lighting/`. Preserve them for comparison and rollback. The final render still requires tim's visual review. The [export guide](exporting/README.md) records material slots, compression settings, and preservation checks.

## Find a tool

| Directory | Responsibility |
| --- | --- |
| `modeling/` | Blender source-model editing scripts. Earlier `finish_*` and refinement scripts reflect their own dated model stages, not a second current export workflow. |
| `rendering/` | Blender preview renders; these do not export the website asset. |
| `exporting/` | Current sunrise material pipeline and older export utilities. Follow its README before running an individual script. |
| `checks/` | Model, source-material, print-receiver, and website runtime checks. They establish technical evidence, not visual approval. |
| `legacy/` | Older build and upgrade scripts plus [historical operating notes](legacy/README-history.md). |

The dated [model](../../docs/landing/delivery/model-review.md), [lake-window](../../docs/landing/delivery/lake-window-model.md), [warm-room](../../docs/landing/delivery/warm-archive.md), and [natural-room](../../docs/landing/delivery/natural-room-implementation.md) reports preserve the outcomes of those stages. Their former “current” and “latest” script labels describe the period when each report was written. The older `bake_web_materials.py` → `export_web_scene.py` → `optimize_web_scene.mjs` chain is superseded by the sunrise pipeline for website material delivery.

## Final delivery compression

`rebuild_sunrise.mjs` runs `exporting/optimize_delivery.mjs` after material finalization. The latter can also be run on an existing GLB without rerunning Blender or writing to `output/`:

```sh
rtk proxy env TOKTX=/absolute/path/to/KTX-Software-4.4.2/toktx node tools/personal_space/exporting/optimize_delivery.mjs input.glb output.glb
```

Install dependencies with the repository lockfile (`npm ci`); glTF Transform Core, Extensions, Functions, and meshoptimizer are pinned in `package.json`. Use Khronos KTX-Software 4.4.2 for `TOKTX`. The pass converts remaining JPEG, WebP, and PNG colour images to KTX2 ETC1S at quality 255 / compression level 5, with generated mipmaps and sRGB transfer. Existing KTX2 images are retained. glTF Transform then applies medium-level Meshopt compression with 16-bit positions, 12-bit normals, and 16-bit UVs across the scene bounds. The 455k-vertex static `ArchiveArchitecture` mesh keeps that quantization. Interactive meshes retain their original vertex order, float32 positions, and node transforms because the photo transfer and animated handoffs address exact named geometry; Meshopt still compresses their buffers. Intermediates are created under the system temporary directory and removed when the command ends. The destination is replaced only after extension, image, mesh, and animation count checks succeed.

Run `node tools/personal_space/checks/verify-model.mjs` and the Landing build guards on the resulting website asset. Compare index, entry, and about-life views against the input before accepting geometry and texture precision; these automated checks establish contracts, not the final visual verdict. The compression commit is independent so the model and decoder can be reverted together if tim rejects those views.

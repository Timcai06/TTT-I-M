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

# Refined source to website

Run from the repository root. This handoff supersedes a direct run of
`export_web_scene.py` for the September 12 plant, shelf-book and room refinements.
The editable `.blend` is opened in a separate background Blender process and
never saved by the exporter. Keep the foreground modelling session intact.

1. Create `output/web-refinement/baseline/`. Copy the shipping GLB to
   `original.glb` and its scene contract to `scene-contract.json` there.
2. Run `export_refined_scene.py` with background Blender. This evaluates the
   actual procedural materials into ten PBR atlas groups, retains named moving
   objects, and batches static geometry. Source photo UVs remain authored.
   Completed groups are reusable only for the same source SHA and atlas size.
   Remove the PBR manifest when changing the unwrap or bake algorithm.
3. Run `prepare_refined_scene.mjs` with Node. It restores the website's original
   photographic bytes, separates moving paper materials, and stages a readable
   GLB plus the previously captured runtime environment for transport baking.
4. Set `ARCHIVE_BAKE_WORK` to the absolute `output/web-refinement` directory and
   `ARCHIVE_REFINED_EXPORT=1`. Run `bake_sunrise.py` and then
   `prepare_bake_outputs.py` with background Blender, followed by
   `assemble_baked_scene.mjs` with Node. This uses 256 samples, new UV2 atlases,
   AO and indirect light. Moving paper is absent from transport, preventing
   permanent resting-pose shadows on the room. Direct sunlight remains live.
5. Run `compress_materials.mjs <baked-uncompressed.glb> <candidate.glb>`, with
   `TOKTX` pointing to Khronos KTX Software 4.4.2. Data maps use linear UASTC
   quality 4 without RDO. Original photographic files are not re-encoded.
6. Run `checks/verify-refined-model.mjs <candidate.glb>`. Install the candidate
   into the shared website asset only after checking the geometry, named nodes,
   animation samples, source SHA, photographic bytes and lighting UVs. Update
   the contract's delivery metadata while retaining its views and anchors.
7. Run the relevant archive unit tests, landing build, build guards and
   `checks/verify-model.mjs --production`. Commit the asset, scripts and delivery
   documentation together. Deploy through the existing Vercel project.

The asset unit tests accept an absolute `ARCHIVE_MODEL_PATH` for staging checks;
omitting it tests the installed shared website asset.

The old bake scripts retain their original default workspace for reproducibility.
Never mix the two workspaces' source GLBs and UV sidecars. The assembler adds
atlas seam vertices while preserving triangle corners and animation data.

The exporter explicitly selects its target UV layer using Blender's documented
[`bake` operator](https://docs.blender.org/api/4.5/bpy.ops.object.html#bpy.ops.object.bake).
Authored shaders retain their source UV while being evaluated; the finished
static atlas becomes UV0 before batching. Scene light uses UV2 independently.

These checks do not render the frontend. tim owns website appearance acceptance;
do not launch a preview service or browser as part of this handoff.

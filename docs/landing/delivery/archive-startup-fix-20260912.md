# Refined room startup repair

Production at `9604a3e` failed during `createArchiveSignal` with
`Archive is missing MonitorPhoto_Thumbnail`. The refined export had joined that
mesh into `Batch_MonitorState_photo`. The previous Index CSS repair addressed a
separate fallback layout loop and did not establish successful runtime startup.

Restore the thumbnail primitive as an independently named mesh under
`MonitorState_photo`, using its original local frame. Keep the current baked
primitive, UVs and material; preserve world geometry while converting coordinates
out of the batch. The room remains 444270 triangles with all ten refined material
groups, eleven animations and original photographs. The editable Blender source
is unchanged. Delivery now has 122 nodes and 61903492 bytes, SHA-256
`bbe8e936d523d6630d8521925eecc6f633686e5228824d67660ac56e986fa0ab`.

`export_refined_scene.py` now protects the thumbnail from batching. The runtime
binding contract and model checks require both independent photo screens and
their photo-state parent. The new check fails against the broken delivery and
passes against the repaired asset. `restore_monitor_thumbnail.mjs` records the
bounded repair procedure for the already baked asset; new exports do not need it.

Validation: 27 binding, animation, photo-transfer and camera tests passed; build,
all ten build guards and production asset checks passed. Refined integrity checks
cover 40 protected nodes, unchanged source SHA, photographs and animation data.

Runtime diagnosis used production code with only the model response replaced by
the repaired local asset. Initialization reached `archiveState=ready`,
`archiveVisible=true`, `archiveSampleOwner=index`, and committed scene frames.
This establishes the model failure and candidate startup recovery, not an actual
production release check or visual acceptance. No screenshots or visual verdict
were produced; visual acceptance remains with tim.

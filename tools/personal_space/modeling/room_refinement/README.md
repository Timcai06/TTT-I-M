# Room model refinement

Work only in the continuing archive source scene. These stages do not save,
export, alter lighting, or run frontend checks.

In Blender Python, prepend this directory to `sys.path`, then execute in order:

```python
import soft, objects, finishes, hardware
soft.chair()
soft.textiles()
objects.desktop()
objects.life_objects()
finishes.timber()
finishes.photographs()
hardware.details()
```

Stages retain original object names and transforms. Source meshes used for
repeatable deformation are retained as internal mesh data blocks with fake users;
they are not extra scene objects. Generated objects and materials use
`Room finish /`, and edited objects carry `room_refinement = 20260912`.
The wood stage follows the chair stage because it assigns the finished materials.

`verify.py` creates structural snapshots in foreground or background Blender.
It compares coordinates/topology/material bindings, transforms, parent and action
names, visibility, sampled original material-node data, and photo UVs. This is
structural evidence, not visual acceptance or a full animation test.

Local process screenshots and rollback binary are in `output/room-refinement/`.
Before re-export, bake the procedural finishes to glTF-compatible textures and
respect existing animation anchors and the accepted print-shadow pipeline.

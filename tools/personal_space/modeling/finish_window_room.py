"""Build the reference-led window room in the canonical Blender source.

Model-only pass: no renders, glTF export, frontend edits, or additional blend
files. The former back wall remains hidden and recoverable inside the source.
"""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import math
import random
import sys

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "art/personal-archive/source/tim-cai-personal-archive.blend"
REVIEW = ROOT / "art/personal-archive/reviews/window-room"
WEB_ASSETS = [
    ROOT / "apps/landing/src/assets/personal-archive/personal-space.glb",
    ROOT / "apps/landing/src/assets/personal-archive/cameras.json",
]
VERSION = "2026-09-08-window-room-1"
TAG = "reference_window_room_v1"
COLLECTION = "13 Reference window room"
CAMERA_COLLECTION = "14 Reference window cameras"
FRAMES = (1, 25, 72, 110, 130, 160)

sys.path.insert(0, str(Path(__file__).parent))
from primitives import aim, box, camera, cylinder, empty, material, rod  # noqa: E402


def digest(path: Path) -> str:
    return hashlib.file_digest(path.open("rb"), "sha256").hexdigest()


def tree_snapshot(path: Path) -> dict[str, str]:
    return {
        str(item.relative_to(ROOT)): digest(item)
        for item in sorted(path.rglob("*"))
        if item.is_file() and "node_modules" not in item.parts
    }


def blend_inventory() -> list[str]:
    return sorted(str(path.relative_to(ROOT)) for path in (ROOT / "art/personal-archive").rglob("*.blend*"))


def collection(name: str) -> bpy.types.Collection:
    current = bpy.data.collections.get(name)
    if current is None:
        current = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(current)
    return current


def own(obj: bpy.types.Object, target: str = COLLECTION) -> bpy.types.Object:
    obj[TAG] = True
    target_collection = collection(target)
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    target_collection.objects.link(obj)
    return obj


def remove_previous_pass() -> None:
    for obj in list(bpy.data.objects):
        if obj.get(TAG):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        if mat.get(TAG) and mat.users == 0:
            bpy.data.materials.remove(mat)


def shader_input(shader: bpy.types.ShaderNodeBsdfPrincipled, name: str, value) -> None:
    socket = shader.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def simple_material(
    name: str,
    color: tuple[float, float, float],
    *,
    roughness: float = 0.6,
    metallic: float = 0.0,
    transmission: float = 0.0,
    emission: float = 0.0,
) -> bpy.types.Material:
    old = bpy.data.materials.get(name)
    if old and old.get(TAG):
        bpy.data.materials.remove(old, do_unlink=True)
    mat = bpy.data.materials.new(name)
    mat[TAG] = True
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader_input(shader, "Base Color", (*color, 1))
    shader_input(shader, "Roughness", roughness)
    shader_input(shader, "Metallic", metallic)
    shader_input(shader, "Transmission Weight", transmission)
    shader_input(shader, "IOR", 1.46)
    shader_input(shader, "Coat Weight", 0.16 if transmission else 0.0)
    shader_input(shader, "Coat Roughness", 0.12)
    if emission:
        shader_input(shader, "Emission Color", (*color, 1))
        shader_input(shader, "Emission Strength", emission)
    mat.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1)
    return mat


def sky_material() -> bpy.types.Material:
    mat = simple_material("Window exterior / sunset sky", (0.65, 0.55, 0.45), roughness=1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    texcoord = nodes.new("ShaderNodeTexCoord")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "B_SPLINE"
    ramp.color_ramp.elements[0].position = 0.05
    ramp.color_ramp.elements[0].color = (0.18, 0.23, 0.31, 1)
    ramp.color_ramp.elements[1].position = 0.88
    ramp.color_ramp.elements[1].color = (1.0, 0.64, 0.34, 1)
    middle = ramp.color_ramp.elements.new(0.48)
    middle.color = (0.48, 0.50, 0.58, 1)
    horizon = ramp.color_ramp.elements.new(0.23)
    horizon.color = (0.92, 0.57, 0.35, 1)
    links.new(texcoord.outputs["Generated"], separate.inputs["Vector"])
    links.new(separate.outputs["Z"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(ramp.outputs["Color"], shader.inputs["Emission Color"])
    shader.inputs["Emission Strength"].default_value = 0.22
    return mat


def water_material() -> bpy.types.Material:
    mat = simple_material("Window exterior / lake", (0.13, 0.22, 0.25), roughness=0.2, transmission=0.08)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 22
    noise.inputs["Detail"].default_value = 3
    noise.inputs["Roughness"].default_value = 0.55
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.006
    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def make_curtain(name: str, x0: float, x1: float, material_data: bpy.types.Material) -> bpy.types.Object:
    columns, rows = 18, 16
    bottom, top = 0.77, 2.65
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for row in range(rows + 1):
        t = row / rows
        z = bottom + (top - bottom) * t
        edge_pull = 0.72 + 0.28 * t
        centre = (x0 + x1) / 2
        half = (x1 - x0) * edge_pull / 2
        for column in range(columns + 1):
            u = column / columns
            x = centre + (u - 0.5) * half * 2
            y = 1.405 - 0.026 * math.cos(u * math.tau * 5) - 0.012 * math.sin(t * math.pi)
            vertices.append((x, y, z))
    width = columns + 1
    for row in range(rows):
        for column in range(columns):
            a = row * width + column
            faces.append((a, a + 1, a + width + 1, a + width))
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material_data)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    solidify = obj.modifiers.new("Woven thickness", "SOLIDIFY")
    solidify.thickness = 0.004
    subdivide = obj.modifiers.new("Soft linen folds", "SUBSURF")
    subdivide.levels = 1
    subdivide.render_levels = 1
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj["editable_layer"] = "gathered linen curtain"
    return own(obj)


def mountain_strip(
    name: str,
    y: float,
    base: float,
    peak: float,
    material_data: bpy.types.Material,
    seed: int,
) -> bpy.types.Object:
    rng = random.Random(seed)
    count = 28
    xs = [-5.2 + 10.4 * index / count for index in range(count + 1)]
    heights = []
    for index, x in enumerate(xs):
        wave = 0.48 + 0.23 * math.sin(index * 0.71 + seed) + 0.16 * math.sin(index * 0.29 + seed * 0.3)
        heights.append(base + peak * max(0.18, wave + rng.uniform(-0.10, 0.10)))
    vertices = [(x, y, base - 0.28) for x in xs] + [(x, y, z) for x, z in zip(xs, heights)]
    faces = [(index, index + 1, count + 2 + index, count + 1 + index) for index in range(count)]
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material_data)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["editable_layer"] = "mountain silhouette"
    return own(obj)


def forest_layer(
    name: str,
    y: float,
    base: float,
    height_range: tuple[float, float],
    material_data: bpy.types.Material,
    seed: int,
    count: int,
) -> bpy.types.Object:
    rng = random.Random(seed)
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for index in range(count):
        x = -4.3 + 8.6 * index / max(1, count - 1) + rng.uniform(-0.06, 0.06)
        height = rng.uniform(*height_range)
        width = height * rng.uniform(0.22, 0.32)
        trunk = max(0.012, width * 0.08)
        start = len(vertices)
        vertices.extend([
            (x - trunk, y, base), (x + trunk, y, base),
            (x + trunk, y, base + height * 0.54), (x - trunk, y, base + height * 0.54),
        ])
        faces.append((start, start + 1, start + 2, start + 3))
        for tier in range(4):
            tier_base = base + height * (0.12 + tier * 0.17)
            tier_top = base + height * (0.52 + tier * 0.16)
            tier_width = width * (1 - tier * 0.16)
            start = len(vertices)
            vertices.extend([(x - tier_width, y, tier_base), (x + tier_width, y, tier_base), (x, y, tier_top)])
            faces.append((start, start + 1, start + 2))
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material_data)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["editable_layer"] = "forest depth silhouette"
    obj["tree_count"] = count
    return own(obj)


def hide_superseded_back_wall() -> list[str]:
    prefixes = (
        "Back wall frame", "Back wall mount", "Frame_BackWallPrint_",
        "Warm_UpperShelf", "Warm_ShelfBracket", "Warm_ShelfBook_",
        "Warm_BookSpineRule_", "Warm_ShelfBowl", "Warm_ShelfVase",
        "Warm_MemoryFrame", "Warm_ShelfDiffuser", "Warm shelf light",
    )
    hidden = []
    for obj in bpy.context.scene.objects:
        if obj.name == "Back wall" or obj.name.startswith(prefixes):
            obj.hide_render = True
            obj.hide_set(True)
            obj["window_room_superseded"] = True
            hidden.append(obj.name)
    return sorted(hidden)


def make_window_architecture() -> dict[str, object]:
    plaster = bpy.data.materials["Plaster_warm"]
    charcoal = bpy.data.materials["Charcoal powder coat"]
    linen = bpy.data.materials["Linen_natural"]
    glass = simple_material("Window / low iron glass", (0.72, 0.82, 0.87), roughness=0.07, transmission=0.94)
    seal = simple_material("Window / rubber seals", (0.018, 0.016, 0.014), roughness=0.44)
    hidden = hide_superseded_back_wall()

    # The four plaster masses leave a real 2.48 x 1.90 m opening.
    for name, location, size in [
        ("BackWindow_WallLeft", (-1.44, 1.55, 1.40), (0.80, 0.12, 2.80)),
        ("BackWindow_WallRight", (1.64, 1.55, 1.40), (0.40, 0.12, 2.80)),
        ("BackWindow_WallLower", (0.20, 1.55, 0.36), (2.48, 0.12, 0.72)),
        ("BackWindow_WallUpper", (0.20, 1.55, 2.71), (2.48, 0.12, 0.18)),
    ]:
        own(box(name, location, size, plaster, 0.006))

    left, right, bottom, top = -1.04, 1.44, 0.72, 2.62
    centre_x, centre_z = (left + right) / 2, (bottom + top) / 2
    for name, location, size in [
        ("BackWindow_FrameLeft", (left, 1.455, centre_z), (0.072, 0.17, top - bottom + 0.15)),
        ("BackWindow_FrameRight", (right, 1.455, centre_z), (0.072, 0.17, top - bottom + 0.15)),
        ("BackWindow_FrameSill", (centre_x, 1.445, bottom), (right - left + 0.15, 0.20, 0.085)),
        ("BackWindow_FrameHead", (centre_x, 1.455, top), (right - left + 0.15, 0.17, 0.085)),
    ]:
        own(box(name, location, size, charcoal, 0.008))

    pane_width = (right - left) / 3
    for index in range(3):
        pane_left = left + index * pane_width
        pane_right = pane_left + pane_width
        pane_centre = (pane_left + pane_right) / 2
        pane = own(box(
            f"BackWindow_Glass_{index + 1}", (pane_centre, 1.515, centre_z),
            (pane_width - 0.055, 0.008, top - bottom - 0.10), glass, 0,
        ))
        pane["glass_role"] = "independent low-iron pane"
        for edge_x in (pane_left + 0.02, pane_right - 0.02):
            own(box(f"BackWindow_Seal_{index + 1}", (edge_x, 1.412, centre_z), (0.012, 0.012, top - bottom - 0.12), seal, 0.002))
    for index, x in enumerate((left + pane_width, left + pane_width * 2), start=1):
        own(box(f"BackWindow_Mullion_{index}", (x, 1.405, centre_z), (0.046, 0.16, top - bottom), charcoal, 0.005))

    own(rod("BackWindow_CurtainRod", (-1.17, 1.385, 2.69), (1.57, 1.385, 2.69), 0.018, charcoal))
    for x in (-1.16, 1.56):
        own(cylinder("BackWindow_RodFinial", (x, 1.385, 2.69), 0.035, 0.036, charcoal, 32))
        bpy.context.object.rotation_euler.y = math.pi / 2
    make_curtain("BackWindow_CurtainLeft", -1.17, -0.94, linen)
    make_curtain("BackWindow_CurtainRight", 1.34, 1.58, linen)
    tie = simple_material("Curtain / dark woven tie", (0.11, 0.065, 0.036), roughness=0.88)
    for side, x in (("Left", -1.055), ("Right", 1.46)):
        ring = own(cylinder(f"BackWindow_Tie{side}", (x, 1.37, 1.33), 0.042, 0.018, tie, 32))
        ring.rotation_euler.x = math.pi / 2
        ring.scale.x = 0.56
    return {"opening": [right - left, top - bottom], "hiddenRecoverableObjects": hidden}


def make_exterior() -> dict[str, object]:
    sky = sky_material()
    lake = water_material()
    far_mountain = simple_material("Window exterior / mountain far", (0.21, 0.25, 0.31), roughness=1)
    mid_mountain = simple_material("Window exterior / mountain mid", (0.13, 0.18, 0.21), roughness=1)
    forest_far = simple_material("Window exterior / forest far", (0.10, 0.16, 0.14), roughness=0.96)
    forest_mid = simple_material("Window exterior / forest mid", (0.055, 0.105, 0.075), roughness=0.96)
    forest_near = simple_material("Window exterior / forest near", (0.025, 0.061, 0.038), roughness=0.95)
    sun = simple_material("Window exterior / sunset disc", (1.0, 0.43, 0.14), roughness=0.4, emission=4.0)

    sky_plane = own(box("Exterior_Sky", (0.2, 8.0, 1.62), (9.0, 0.02, 4.3), sky, 0))
    sky_plane["editable_layer"] = "procedural sunset gradient"
    own(box("Exterior_LakeBackdrop", (0.2, 4.3, 0.92), (8.0, 0.025, 0.56), lake, 0))
    lake_surface = own(box("Exterior_LakeSurface", (0.2, 4.0, 0.64), (8.0, 5.0, 0.028), lake, 0))
    lake_surface["editable_layer"] = "reflective lake plane"
    mountain_strip("Exterior_MountainsFar", 6.0, 0.82, 1.55, far_mountain, 17)
    mountain_strip("Exterior_MountainsMid", 4.9, 0.72, 1.23, mid_mountain, 23)
    forest_layer("Exterior_ForestFar", 3.75, 0.68, (0.42, 0.72), forest_far, 31, 44)
    forest_layer("Exterior_ForestMid", 2.75, 0.67, (0.62, 1.02), forest_mid, 43, 40)
    forest_layer("Exterior_ForestNear", 1.88, 0.64, (0.82, 1.42), forest_near, 59, 34)
    sun_obj = own(cylinder("Exterior_Sun", (0.92, 7.92, 1.93), 0.12, 0.025, sun, 64))
    sun_obj.rotation_euler.x = math.pi / 2
    sun_obj["editable_layer"] = "sunset focal disc"
    return {
        "layers": ["sky", "far mountains", "mid mountains", "lake", "far forest", "mid forest", "near forest", "sun"],
        "depthRange": [1.88, 8.0],
    }


def light_data(name: str, kind: str) -> bpy.types.Light:
    existing = bpy.data.lights.get(name)
    if existing is not None:
        return existing
    return bpy.data.lights.new(name, kind)


def make_lighting() -> dict[str, object]:
    scene = bpy.context.scene
    window = bpy.data.objects["Window softbox"]
    window.location = (0.20, 1.34, 1.92)
    aim(window, (0.05, -0.35, 0.96))
    window.data.shape = "RECTANGLE"
    window.data.size = 2.25
    window.data.size_y = 1.62
    window.data.energy = 225
    window.data.color = (1.0, 0.63, 0.38)
    window["lighting_role"] = "warm sunset window key through the new back opening"

    fill_data = light_data("BackWindow sky fill", "AREA")
    fill = bpy.data.objects.get("BackWindow sky fill")
    if fill is None:
        fill = bpy.data.objects.new("BackWindow sky fill", fill_data)
        bpy.context.collection.objects.link(fill)
    fill.location = (-0.15, 1.36, 2.02)
    aim(fill, (-0.25, -0.15, 1.10))
    fill.data.shape = "RECTANGLE"
    fill.data.size = 2.15
    fill.data.size_y = 1.45
    fill.data.energy = 72
    fill.data.color = (0.54, 0.69, 1.0)
    fill["lighting_role"] = "cool sky fill keeps interior shadow detail readable"
    own(fill)

    sun_data = light_data("Exterior sunset direction", "SUN")
    sun_obj = bpy.data.objects.get("Exterior sunset direction")
    if sun_obj is None:
        sun_obj = bpy.data.objects.new("Exterior sunset direction", sun_data)
        bpy.context.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(38), math.radians(-24), math.radians(-126))
    sun_obj.data.energy = 0.65
    sun_obj.data.angle = math.radians(7)
    sun_obj.data.color = (1.0, 0.56, 0.30)
    sun_obj["lighting_role"] = "soft late-day direction, subordinate to window key"
    own(sun_obj)

    if bpy.data.objects.get("Task light"):
        bpy.data.objects["Task light"].data.energy = 18
        bpy.data.objects["Task light"].data.color = (1.0, 0.55, 0.25)
    if bpy.data.lights.get("Front bounce"):
        bpy.data.lights["Front bounce"].energy = 18
    if bpy.data.lights.get("Room ceiling fill"):
        bpy.data.lights["Room ceiling fill"].energy = 10
    background = next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value = (0.24, 0.30, 0.40, 1)
    background.inputs["Strength"].default_value = 0.035
    scene.view_settings.exposure = -0.12
    return {"windowKeyWatts": 225, "skyFillWatts": 72, "sunEnergy": 0.65, "taskWatts": 18}


def make_camera(name: str, location, target, lens: float, fstop: float, role: str) -> bpy.types.Object:
    for old_name in (name, name + "_Focus"):
        old = bpy.data.objects.get(old_name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
    focus = own(empty(name + "_Focus", target), CAMERA_COLLECTION)
    focus.empty_display_size = 0.035
    obj = own(camera(name, location, target, lens), CAMERA_COLLECTION)
    obj.data.lens = lens
    obj.data.sensor_width = 36
    obj.data.clip_start = 0.01
    obj.data.clip_end = 120
    obj.data.dof.use_dof = True
    obj.data.dof.focus_object = focus
    obj.data.dof.aperture_fstop = fstop
    obj.data.dof.aperture_blades = 9
    obj["review_frame"] = 1
    obj["reference_role"] = role
    return obj


def make_cameras() -> list[dict[str, object]]:
    specifications = [
        ("WindowRoom_01_Overview", (-0.58, -3.45, 1.84), (0.08, 0.93, 1.27), 34, 8.0, "room, desk, window, left shelf and right photo wall"),
        ("WindowRoom_02_Desk", (-0.58, -0.56, 1.39), (-0.10, 0.95, 0.92), 50, 5.6, "paper, wood, notebook, monitor and lamp material inspection"),
        ("WindowRoom_03_Window", (0.06, -1.62, 1.70), (0.20, 2.35, 1.54), 39, 8.0, "window construction and exterior depth layers"),
        ("WindowRoom_04_Structure", (-3.15, -4.15, 3.82), (0.0, 0.34, 1.16), 42, 8.0, "3.6 x 3.1 metre spatial structure"),
    ]
    result = []
    for name, location, target, lens, fstop, role in specifications:
        make_camera(name, location, target, lens, fstop, role)
        result.append({"name": name, "lens": lens, "fstop": fstop, "role": role})
    bpy.context.scene.camera = bpy.data.objects["WindowRoom_01_Overview"]
    bpy.context.scene.frame_set(1)
    return result


def contract() -> dict[str, object]:
    required = [
        "NotebookHinge", "NotebookCover", "NotebookReadingSurface", "NotebookReadingAnchor",
        "LifeEnvelopeHinge", "LifeMemoryPhoto", "LifePhotoAnchor",
        "FramePrintPivot", "FrameEntryAnchor", "StackScreenAnchor",
        "WorkDrawerRoot", "WorkFolderPivot", "WorkCoverAnchor",
    ]
    required += sorted(obj.name for obj in bpy.context.scene.objects if obj.name.startswith(
        ("AboutReading_", "LifeReading_", "FrameReading_", "StackReading_", "WorkReading_")
    ))
    result: dict[str, object] = {}
    for frame in FRAMES:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        result[str(frame)] = {
            name: [round(value, 7) for row in bpy.data.objects[name].matrix_world for value in row]
            for name in required
        }
    bpy.context.scene.frame_set(1)
    result["actions"] = sorted(action.name for action in bpy.data.actions if action.users)
    return result


def finite_scene() -> dict[str, int]:
    triangles = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        assert all(math.isfinite(value) for row in obj.matrix_world for value in row), obj.name
        if obj.type == "MESH":
            evaluated = obj.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh()
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
            evaluated.to_mesh_clear()
    assert triangles < 2_000_000, "Unexpected topology expansion"
    return {"objects": len(bpy.context.scene.objects), "evaluatedTriangles": triangles}


def missing_dependencies() -> list[str]:
    missing = []
    for image in bpy.data.images:
        if image.users == 0 or image.type != "IMAGE" or image.packed_file:
            continue
        path = Path(bpy.path.abspath(image.filepath))
        if not path.exists():
            missing.append(f"image:{image.name}:{path}")
    for library in bpy.data.libraries:
        path = Path(bpy.path.abspath(library.filepath))
        if not path.exists():
            missing.append(f"library:{library.name}:{path}")
    return sorted(missing)


def setup_workspace(cameras: list[dict[str, object]]) -> None:
    scene = bpy.context.scene
    scene["window_room_model_version"] = VERSION
    scene["window_room_visual_acceptance"] = "Pending tim; model and technical checks only"
    scene["window_room_reference_images"] = "; ".join([
        "/Users/tim/Desktop/新母图.png",
        "/Users/tim/Desktop/新桌面近景.png",
        "/Users/tim/Desktop/新结构图.png",
    ])
    scene["window_room_web_status"] = "Model-only. Existing website GLB and camera contract remain unchanged."
    text = bpy.data.texts.get("START HERE - Window room review") or bpy.data.texts.new("START HERE - Window room review")
    text.clear()
    text.write("""PERSONAL ARCHIVE / REFERENCE WINDOW ROOM

Canonical source updated in place. No website export was performed.
Opening camera: WindowRoom_01_Overview, frame 1.

WindowRoom_01_Overview — overall room and chapter-object layout
WindowRoom_02_Desk — paper, walnut, monitor and lamp close inspection
WindowRoom_03_Window — real opening, glass, curtains and exterior depth
WindowRoom_04_Structure — room-scale and architecture overview

Collection 13 Reference window room contains the editable architecture,
curtains and separate sky / mountain / lake / forest depth layers.
Collection 14 Reference window cameras contains the four review cameras.

The previous solid back wall and its former back-wall decorations are hidden,
tagged window_room_superseded, and recoverable. The left shelf, right photo
wall, notebook, lamp, monitor, drawer, real photographs, animation tracks and
all reading corners remain in their original hierarchy and transforms.

Visual acceptance belongs to tim. Reopen this path if Blender was open before
the background save; disk changes do not replace an existing in-memory scene.
""")
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                space.shading.type = "MATERIAL"
                space.shading.use_scene_lights = True
                space.shading.use_scene_world = True
                space.overlay.show_overlays = False
                space.region_3d.view_perspective = "CAMERA"
                space.region_3d.view_camera_zoom = 0
    scene["window_room_review_cameras"] = json.dumps(cameras, ensure_ascii=False)


def verify_model(expected_contract: dict[str, object], expected_web: dict[str, str], expected_blends: list[str]) -> dict[str, object]:
    assert bpy.context.scene.get("window_room_model_version") == VERSION
    assert contract() == expected_contract, "Protected chapter rig or reading corner changed"
    assert {str(path.relative_to(ROOT)): digest(path) for path in WEB_ASSETS} == expected_web
    assert blend_inventory() == expected_blends
    assert not missing_dependencies(), missing_dependencies()
    assert bpy.context.scene.camera.name == "WindowRoom_01_Overview"
    assert not bpy.data.objects["BackWindow_Glass_1"].hide_render
    assert bpy.data.objects["Back wall"].hide_render
    assert bpy.data.objects["NotebookHinge"].animation_data
    assert bpy.data.objects["WorkDrawerRoot"].animation_data
    assert bpy.data.objects["FramePrintPivot"].animation_data
    report = finite_scene()
    report.update({
        "version": VERSION,
        "source": str(SOURCE),
        "sourceSha256": digest(SOURCE),
        "websiteAssets": expected_web,
        "websiteAssetsUnchanged": True,
        "blendInventory": expected_blends,
        "blendInventoryUnchanged": True,
        "missingDependencies": [],
        "protectedContract": expected_contract,
        "defaultCamera": bpy.context.scene.camera.name,
        "rendered": False,
        "visualAcceptance": "pending tim",
    })
    return report


def main() -> None:
    source_before = digest(SOURCE)
    frontend_before = tree_snapshot(ROOT / "apps/landing/src")
    web_before = {str(path.relative_to(ROOT)): digest(path) for path in WEB_ASSETS}
    blends_before = blend_inventory()
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    protected = contract()

    if bpy.context.scene.get("window_room_model_version") == VERSION:
        report = verify_model(protected, web_before, blends_before)
        assert digest(SOURCE) == source_before, "Verification must not save"
        print("WINDOW_ROOM_REOPEN_VERIFIED=" + json.dumps(report, ensure_ascii=False), flush=True)
        return

    remove_previous_pass()
    architecture = make_window_architecture()
    exterior = make_exterior()
    lighting = make_lighting()
    cameras = make_cameras()
    setup_workspace(cameras)
    bpy.ops.file.pack_all()

    assert contract() == protected, "Protected chapter rig or reading corner changed before save"
    assert tree_snapshot(ROOT / "apps/landing/src") == frontend_before, "Frontend changed during model pass"
    assert {str(path.relative_to(ROOT)): digest(path) for path in WEB_ASSETS} == web_before
    assert digest(SOURCE) == source_before, "Source changed on disk during model pass"
    assert blend_inventory() == blends_before
    assert not missing_dependencies(), missing_dependencies()

    scene = bpy.context.scene
    scene["window_room_source_before"] = source_before
    scene["window_room_opening_metres"] = architecture["opening"]
    scene["window_room_exterior_layers"] = json.dumps(exterior["layers"])
    previous_save_versions = bpy.context.preferences.filepaths.save_version
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.context.preferences.filepaths.save_version = previous_save_versions

    assert blend_inventory() == blends_before, "A blend backup or copy was created"
    assert tree_snapshot(ROOT / "apps/landing/src") == frontend_before, "Frontend changed after save"
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    report = verify_model(protected, web_before, blends_before)
    report.update({
        "previousSourceSha256": source_before,
        "architecture": architecture,
        "exterior": exterior,
        "lighting": lighting,
        "cameras": cameras,
    })
    REVIEW.mkdir(parents=True, exist_ok=True)
    (REVIEW / "model-manifest.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print("WINDOW_ROOM_SAVED=" + json.dumps({
        "sourceSha256": report["sourceSha256"],
        "objects": report["objects"],
        "evaluatedTriangles": report["evaluatedTriangles"],
        "missingDependencies": report["missingDependencies"],
        "defaultCamera": report["defaultCamera"],
    }, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

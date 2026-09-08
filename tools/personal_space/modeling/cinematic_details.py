"""Hero-prop geometry, kept independent of existing chapter rigs and anchors."""
import math
import random
import bpy
from mathutils import Vector
from model_finish_common import own, parent_keep, get_material
from primitives import box
from refine_scene import tube, lathe

COL = '10 Cinema - close details'


def detail(obj, parent=None):
    own(obj, COL)
    obj['cinema_detail'] = True
    if parent:
        bpy.context.view_layer.update()
        parent_keep(obj, parent)
    return obj


def rounded_stack(name, width, depth, height, count, mat):
    """Individual closed sheets with rounded corners, deterministic deckle offsets."""
    rng = random.Random(729)
    verts, faces = [], []
    radius = .0014
    for k in range(count):
        w = width / 2 - rng.uniform(0, .00035)
        d = depth / 2 - rng.uniform(0, .0004)
        z = -height / 2 + k * height / count
        ring = []
        for cx, cy, start in [(w-radius,d-radius,0),(-w+radius,d-radius,90),
                              (-w+radius,-d+radius,180),(w-radius,-d+radius,270)]:
            for j in range(5):
                a = math.radians(start + j * 22.5)
                ring.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
        n = len(ring); base = len(verts)
        for h in [z, z + height / count * .91]:
            verts.extend((x, y, h) for x, y in ring)
        faces.extend([tuple(base+i for i in reversed(range(n))), tuple(base+n+i for i in range(n))])
        faces.extend((base+i, base+(i+1)%n, base+n+(i+1)%n, base+n+i) for i in range(n))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces); mesh.update(); mesh.materials.append(mat)
    return mesh


def finish_book():
    paper = bpy.data.materials['Paper_fiber']
    linen = bpy.data.materials['Linen_natural']
    hinge = bpy.data.objects['NotebookHinge']
    pages = bpy.data.objects['Notebook_pages']
    pages.data = rounded_stack('Cinema / 72 bound leaves', .278, .346, .025, 72, paper)
    pages['physical_leaves'] = 72
    # The former coarse dark stripes are superseded by actual sheet edges.
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('Notebook page edge', 'Notebook_fine_page', 'Notebook_stitch')):
            bpy.data.objects.remove(obj, do_unlink=True)
    endpaper = detail(box('Cinema_BookInnerEndpaper', (-.58,.88,.8597), (.267,.336,.00032), paper, .00012), hinge)
    endpaper['role'] = 'inside cover, follows NotebookHinge'
    thread = get_material('Cinema unbleached binding thread', (.49,.421,.31), roughness=.9)
    for side in [-1, 1]:
        for i in range(42):
            y = .720 + i * .0077
            x = -.58 + side * .133
            detail(tube('Cinema_BookStitch_%s_%02d' % (side, i),
                        [(x,y,.87215),(x+.00035,y+.0018,.87245),(x,y+.0035,.87215)], .00022, thread), hinge)
    # Cloth headbands terminate the text block at both ends of the spine.
    for j, y in enumerate([.709, 1.051]):
        detail(tube('Cinema_Headband_%d' % j,
                    [(-.718,y,.838),(-.720,y,.850),(-.716,y,.860)], .0013, linen))
    # Replace the rigid bookmark strip with a gently draped ribbon.
    ribbon = bpy.data.objects['Notebook_bookmark']
    verts, faces = [], []
    for i in range(25):
        t = i / 24
        y = .725 - .105*t
        z = .838 - .008*t + .0018*math.sin(math.pi*t)
        x = -.640 + .002*math.sin(math.pi*t)
        verts.extend([(x-.0065,y,z),(x+.0065,y,z)])
    faces = [(i*2,i*2+1,i*2+3,i*2+2) for i in range(24)]
    mesh = bpy.data.meshes.new('Cinema / draped bookmark')
    mesh.from_pydata(verts, [], faces); mesh.update()
    mesh.materials.append(bpy.data.materials['Archive red'])
    ribbon.data = mesh; ribbon.location = (0,0,0)
    thick = ribbon.modifiers.new('Woven ribbon thickness', 'SOLIDIFY'); thick.thickness = .00055
    for face in mesh.polygons: face.use_smooth = True


def finish_archive():
    paper = bpy.data.materials['Paper_fiber']
    silver = bpy.data.materials['Brushed hardware']
    metal = bpy.data.materials['Charcoal powder coat']
    root = bpy.data.objects['WorkDrawerRoot']
    # Content has actual stock thickness and moves with its folder, including file 01.
    for i in range(6):
        pivot = bpy.data.objects['WorkFolderPivot' if i == 0 else 'Work_FolderPivot_%02d' % (i+1)]
        y = .685 + i*.080
        obj = bpy.data.objects.new('Cinema_FileStock_%02d' % (i+1), rounded_stack('File stock', .467, .209, .003, 9, paper))
        bpy.context.collection.objects.link(obj)
        obj.location = (.955, y+.0004, .565)
        obj.rotation_euler.x = math.pi/2
        detail(obj, pivot)
        # Narrow scored fold at the bottom; leaves the cover and its anchors clear.
        detail(tube('Cinema_FileFold_%02d' % (i+1),
                    [(.712,y-.001,.454),(.955,y-.001,.452),(1.198,y-.001,.454)], .0007, paper), pivot)
    for side, x in [('Left', .65), ('Right', 1.26)]:
        # Middle telescopic member extends halfway with the established drawer action.
        rail = detail(box('Cinema_RailMiddle_'+side, (x,.94,.472), (.007,.55,.014), silver, .0007))
        for frame, y in [(1,.94),(30,.94),(72,.705),(120,.705)]:
            rail.location.y=y; rail.keyframe_insert(data_path='location', frame=frame)
        rail.animation_data.action.name='CinemaRailTravel_'+side
        for j,y in enumerate([.72,1.12]):
            detail(tube('Cinema_RailScrew_'+side+str(j), [(x-.006,y,.47),(x+.006,y,.47)], .0025, silver))
        for j in range(7):
            obj=detail(box('Cinema_RailStop_'+side+str(j), (x,.69+j*.064,.483), (.012,.012,.003), metal,.0005), root)
    for x in [.704,1.206]:
        detail(tube('Cinema_DrawerFaceScrew', [(x,.590,.710),(x,.586,.710)], .0028, silver), root)


def finish_small_objects():
    # Rotational surfaces are rebuilt at a finer angular resolution for close silhouettes.
    ceramic = bpy.data.materials['Ceramic_speckle']
    cup = bpy.data.objects['Life cup ceramic']
    profile=[(0,0),(.034,0),(.038,.003),(.040,.008),(.046,.026),(.049,.090),
             (.050,.110),(.0498,.116),(.048,.120),(.046,.121),(.044,.119),
             (.043,.115),(.042,.100),(.039,.028),(.037,.022),(.032,.020),(0,.020)]
    replacement=lathe('Cinema temporary cup',(-1.37,1.07,1.107),profile,ceramic,96)
    cup.data=replacement.data
    bpy.data.objects.remove(replacement,do_unlink=True)
    coffee=bpy.data.materials['Coffee']
    detail(lathe('Cinema_CoffeeMeniscus',(-1.37,1.07,1.201),
                 [(.0385,0),(.040,-.00005),(.041,.00025),(.0418,.0008)],coffee,96))
    for name in ['Lamp shade shell', 'Lamp reflector', 'Life cup handle']:
        obj=bpy.data.objects[name]
        sub=obj.modifiers.new('Cinema smooth silhouette','SUBSURF')
        sub.levels=1;sub.render_levels=2
    # A physical stitched edge and sparse fringe preserve the existing rug pattern.
    yarn=get_material('Cinema rug binding',(.105,.061,.035),roughness=.97)
    for side in [-1,1]:
        for i in range(52):
            y=-1.33+i*.0234
            x=side*1.17
            detail(tube('Cinema_RugFringe_%s_%02d' % (side,i),
                        [(x,y,.039),(x+side*.018,y+.002,.038),(x+side*.029,y-.001,.034)],.0007,yarn))


def finish_details():
    finish_book()
    bpy.context.scene.frame_set(1)
    finish_archive()
    bpy.context.scene.frame_set(1)
    finish_small_objects()

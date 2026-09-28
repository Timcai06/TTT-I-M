#!/usr/bin/env python3
"""Darkroom prop library. Blender 5.2, no external Python packages or add-ons.

    blender -b -P build_assets.py
    blender -b -P build_assets.py -- --no-previews
    blender -b -P build_assets.py -- --preview-only DR_Tray --samples 128

The default command builds darkroom_assets.blend, renders two Cycles views per
asset family, and joins the two views into one 1600 x 1000 PNG per family.
All dimensions and bump distances are metres. The main scene has no world,
lights, camera or stage. DR_Preview is the sole studio/lighting scene.
"""
import argparse
import array
import json
import math
import os
from pathlib import Path
import random
import struct
import sys
import time
import zlib

import bpy
import bmesh
from mathutils import Vector, Matrix

TAU = math.tau
OUT = Path(__file__).resolve().parent
RNG = random.Random(290928)
COL = ROOT = SCENE = None
ASSETS = {}
MATS = {}


def log(message):
    print('DR_BUILD | ' + message, flush=True)


def link_object(obj, collection=None, parent=True):
    target = collection or COL
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    target.objects.link(obj)
    if parent and ROOT:
        obj.parent = ROOT
        obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj


def empty(name, loc=(0, 0, 0), parent=True):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = .025
    obj.location = loc
    return link_object(obj, parent=parent)


def family(name, pivot='base centre'):
    global COL, ROOT
    COL = bpy.data.collections.new(name)
    SCENE.collection.children.link(COL)
    ROOT = empty(name + '_Root', parent=False)
    ROOT['DR_pivot'] = pivot
    ROOT['DR_units'] = 'metres'
    COL.asset_mark()
    COL.asset_data.description = name + ' | real scale | Principled | Cycles | ' + pivot
    ASSETS[name] = {'collection': COL, 'root': ROOT, 'pivot': pivot}
    return COL, ROOT


def node(mat, kind, name, loc=(0, 0)):
    n = mat.node_tree.nodes.new(kind)
    n.name = 'DR_' + name
    n.label = name.replace('_', ' ')
    n.location = loc
    return n


def principled(name, color, rough=.4, metal=0., transmission=0., ior=1.5,
               coat=0., emission=None, strength=0.):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color[:3], 1)
    mat.node_tree.nodes.clear()
    p = node(mat, 'ShaderNodeBsdfPrincipled', 'Principled', (360, 100))
    p.inputs['Base Color'].default_value = (*color[:3], 1)
    for key, val in [('Roughness', rough), ('Metallic', metal),
                     ('Transmission Weight', transmission), ('IOR', ior),
                     ('Coat Weight', coat)]:
        p.inputs[key].default_value = val
    if emission:
        p.inputs['Emission Color'].default_value = (*emission, 1)
        p.inputs['Emission Strength'].default_value = strength
    output = node(mat, 'ShaderNodeOutputMaterial', 'Surface_Output', (680, 100))
    mat.node_tree.links.new(p.outputs['BSDF'], output.inputs['Surface'])
    MATS[name] = mat
    return mat, p


def texvec(mat, scale=(1, 1, 1)):
    tc = node(mat, 'ShaderNodeTexCoord', 'Object_Metre_Coordinates', (-1050, 0))
    mp = node(mat, 'ShaderNodeVectorMath', 'Grain_Direction', (-850, 0))
    mp.operation = 'MULTIPLY'
    mp.inputs[1].default_value = scale
    mat.node_tree.links.new(tc.outputs['Object'], mp.inputs[0])
    return mp.outputs['Vector']


def micro_surface(mat, p, scale=(1200, 1200, 1200), distance=.000008,
                  rough_range=(.26, .37), strength=.20, name='Micro_Scratches'):
    links = mat.node_tree.links
    n = node(mat, 'ShaderNodeTexNoise', name, (-610, 0))
    n.inputs['Scale'].default_value = 1.
    n.inputs['Detail'].default_value = 2.8
    n.inputs['Roughness'].default_value = .72
    links.new(texvec(mat, scale), n.inputs['Vector'])
    bump = node(mat, 'ShaderNodeBump', name + '_Bump', (80, -150))
    bump.inputs['Distance'].default_value = distance
    bump.inputs['Strength'].default_value = strength
    links.new(n.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], p.inputs['Normal'])
    ramp = node(mat, 'ShaderNodeMapRange', 'Roughness_Variation', (-100, 80))
    ramp.inputs['To Min'].default_value = rough_range[0]
    ramp.inputs['To Max'].default_value = rough_range[1]
    links.new(n.outputs['Fac'], ramp.inputs['Value'])
    links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    return n


def wood(name, light, dark, axis='Y'):
    mat, p = principled(name, light, .39, coat=.14)
    scales = {'X': (18, 1800, 1500), 'Y': (1700, 18, 1300)}
    n = micro_surface(mat, p, scales[axis], .000026, (.34, .47), .32, 'Longitudinal_Fibres')
    ramp = node(mat, 'ShaderNodeValToRGB', 'Bamboo_Colour_Fibres', (-200, 300))
    ramp.color_ramp.elements[0].position = .20
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = .79
    ramp.color_ramp.elements[1].color = (*light, 1)
    mat.node_tree.links.new(n.outputs['Fac'], ramp.inputs[0])
    mat.node_tree.links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    return mat


def materials():
    mat, p = principled('DR_Polystyrene', (.81, .805, .77), .25, coat=.12)
    micro_surface(mat, p, (6500, 90, 2100), .000005, (.24, .30), .16)
    tc = node(mat, 'ShaderNodeTexCoord', 'Waterline_Coordinates', (-1060, 650))
    sep = node(mat, 'ShaderNodeSeparateXYZ', 'Waterline_Height', (-870, 650))
    sub = node(mat, 'ShaderNodeMath', 'Waterline_035m', (-690, 650)); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = .036
    ab = node(mat, 'ShaderNodeMath', 'Waterline_Distance', (-530, 650)); ab.operation = 'ABSOLUTE'
    band = node(mat, 'ShaderNodeMapRange', 'Faint_Chemical_Band', (-360, 650))
    band.inputs['From Min'].default_value = .001
    band.inputs['From Max'].default_value = .009
    band.inputs['To Min'].default_value = .12
    band.inputs['To Max'].default_value = 0
    mix = node(mat, 'ShaderNodeMixRGB', 'Old_Chemical_Stain', (70, 390))
    mix.inputs[1].default_value = (.81, .805, .77, 1)
    mix.inputs[2].default_value = (.40, .31, .18, 1)
    l = mat.node_tree.links
    for a, b in [(tc.outputs['Object'], sep.inputs[0]), (sep.outputs['Z'], sub.inputs[0]),
                 (sub.outputs[0], ab.inputs[0]), (ab.outputs[0], band.inputs['Value']),
                 (band.outputs['Result'], mix.inputs[0]), (mix.outputs[0], p.inputs['Base Color'])]: l.new(a, b)
    mat, p = principled('DR_BrushedSteel', (.48, .51, .54), .27, metal=1)
    p.inputs['Anisotropic'].default_value = .76
    micro_surface(mat, p, (26, 12000, 350), .000006, (.22, .35), .21, 'Brushing_And_Water_Spots')
    tangent = node(mat, 'ShaderNodeTangent', 'Brushing_Tangent', (80, -370))
    tangent.direction_type = 'UV_MAP'; tangent.uv_map = 'DR_UV'
    mat.node_tree.links.new(tangent.outputs['Tangent'], p.inputs['Tangent'])
    # Sparse evaporated-water rings alter roughness, not the steel's silhouette.
    l=mat.node_tree.links
    tc=node(mat,'ShaderNodeTexCoord','WaterSpot_Metres',(-1080,-660))
    vor=node(mat,'ShaderNodeTexVoronoi','Dried_Water_Drops',(-850,-590))
    vor.inputs['Scale'].default_value=170
    l.new(tc.outputs['Object'],vor.inputs['Vector'])
    ring=node(mat,'ShaderNodeValToRGB','Faint_Water_Ring',(-620,-590))
    cr=ring.color_ramp
    cr.elements[0].position=.24; cr.elements[0].color=(0,0,0,1)
    cr.elements[1].position=.32; cr.elements[1].color=(1,1,1,1)
    cr.elements.new(.38).color=(0,0,0,1)
    l.new(vor.outputs['Distance'],ring.inputs['Fac'])
    patch=node(mat,'ShaderNodeTexNoise','Scattered_Water_Areas',(-840,-820)); patch.inputs['Scale'].default_value=13
    l.new(tc.outputs['Object'],patch.inputs['Vector'])
    threshold=node(mat,'ShaderNodeMath','Sparse_Water_Mask',(-620,-800)); threshold.operation='GREATER_THAN'; threshold.inputs[1].default_value=.60
    l.new(patch.outputs['Fac'],threshold.inputs[0])
    mask=node(mat,'ShaderNodeMath','WaterRing_Mask',(-400,-600)); mask.operation='MULTIPLY'
    l.new(ring.outputs['Color'],mask.inputs[0]); l.new(threshold.outputs[0],mask.inputs[1])
    amplitude=node(mat,'ShaderNodeMath','WaterRing_Roughness_Amount',(-220,-600)); amplitude.operation='MULTIPLY'; amplitude.inputs[1].default_value=.095
    l.new(mask.outputs[0],amplitude.inputs[0])
    rough=node(mat,'ShaderNodeMath','Brushing_Plus_Water_Rings',(80,40)); rough.operation='ADD'
    l.new(mat.node_tree.nodes['DR_Roughness_Variation'].outputs['Result'],rough.inputs[0])
    l.new(amplitude.outputs[0],rough.inputs[1]); l.new(rough.outputs[0],p.inputs['Roughness'])
    mat, p = principled('DR_PolishedSteel', (.55, .59, .62), .18, metal=1)
    micro_surface(mat, p, (2500, 2500, 2500), .000003, (.13, .22), .12)
    mat, p = principled('DR_BlackEnamel', (.018, .022, .025), .32, metal=.60, coat=.25)
    micro_surface(mat, p, (1500, 1500, 1500), .000015, (.26, .38), .17, 'Enamel_Peeling_Texture')
    mat, p = principled('DR_BlackRubber', (.009, .011, .012), .46)
    micro_surface(mat, p, (4200, 4200, 4200), .000009, (.39, .51), .22)
    mat, p = principled('DR_RedRubber', (.37, .011, .019), .34)
    micro_surface(mat, p, (3300, 3300, 3300), .00001, (.28, .42), .21)
    wood('DR_Bamboo', (.54, .32, .115), (.28, .13, .035))
    wood('DR_BambooNodes', (.35, .18, .055), (.18, .07, .018))
    wood('DR_ClothespinWood', (.56, .37, .19), (.30, .16, .063), 'X')
    wood('DR_ShelfWood', (.19, .105, .049), (.065, .03, .012), 'X')
    mat, p = principled('DR_PaperFibreBase', (.84, .815, .75), .30, coat=.16)
    micro_surface(mat, p, (17000, 17000, 17000), .000004, (.29, .35), .16, 'Paper_Tooth')
    p.inputs['Subsurface Weight'].default_value = .025
    p.inputs['Subsurface Scale'].default_value = .00016
    mat, p = principled('DR_Jute', (.38, .25, .115), .75)
    n=micro_surface(mat, p, (850, 9500, 9500), .000014, (.66, .80), .32, 'Jute_Fibre_Tooth')
    colour=node(mat,'ShaderNodeValToRGB','Jute_Fibre_Colour',(-150,310))
    colour.color_ramp.elements[0].color=(.24,.145,.061,1)
    colour.color_ramp.elements[1].color=(.44,.315,.168,1)
    mat.node_tree.links.new(n.outputs['Fac'],colour.inputs[0])
    mat.node_tree.links.new(colour.outputs['Color'],p.inputs['Base Color'])
    principled('DR_ClearGlass', (.97, .985, 1.0), .07, transmission=1, ior=1.47)
    principled('DR_AmberGlass', (.48, .205, .051), .075, transmission=1, ior=1.47)
    principled('DR_RedFilterGlass', (.34, .004, .008), .13, transmission=.90, ior=1.51,
               emission=(.65, .001, .003), strength=0)
    principled('DR_Water', (.99, .995, 1.0), .025, transmission=1, ior=1.333)
    principled('DR_TimerDial', (.006, .011, .012), .48)
    principled('DR_TimerGlow', (.08, .46, .38), .36, emission=(.12, .70, .55), strength=1.25)
    principled('DR_Ink', (.028, .026, .022), .68)
    principled('DR_PaperBox', (.48, .46, .39), .69)


def bevel(obj, width=.001, segments=3):
    m = obj.modifiers.new('DR_Real_Edge_Bevel', 'BEVEL')
    m.width = width; m.segments = segments; m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(28); m.harden_normals = True
    return m


def assign(obj, material):
    obj.data.materials.append(MATS[material] if isinstance(material, str) else material)
    return obj


def uv_project(mesh):
    layer = mesh.uv_layers.new(name='DR_UV')
    vv = [v.co for v in mesh.vertices]
    if not vv: return
    lo = [min(v[i] for v in vv) for i in range(3)]
    span = [max(v[i] for v in vv) - lo[i] for i in range(3)]
    for p in mesh.polygons:
        dominant = max(range(3), key=lambda k: abs(p.normal[k]))
        axes = [k for k in range(3) if k != dominant]
        for li in p.loop_indices:
            v = vv[mesh.loops[li].vertex_index]
            layer.data[li].uv = tuple((v[k] - lo[k]) / max(span[k], 1e-8) for k in axes)


def mesh_obj(name, verts, faces, material=None, smooth=True, uvs=None, parent=True):
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(verts, [], faces); mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh); link_object(obj, parent=parent)
    for p in mesh.polygons: p.use_smooth = smooth
    if uvs:
        layer = mesh.uv_layers.new(name='DR_UV')
        for li, loop in enumerate(mesh.loops): layer.data[li].uv = uvs[loop.vertex_index]
    else: uv_project(mesh)
    if material: assign(obj, material)
    return obj


def cube(name, dims, loc, material, edge=.001, smooth=True):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object; obj.name = name; obj.data.name = name + '_Mesh'
    for v in obj.data.vertices:
        for k in range(3): v.co[k] *= dims[k]
    obj.location = loc
    link_object(obj); assign(obj, material)
    if obj.data.uv_layers: obj.data.uv_layers[0].name = 'DR_UV'
    if edge: bevel(obj, min(edge, min(dims)*.45), 4)
    for p in obj.data.polygons: p.use_smooth = smooth
    if smooth:
        m = obj.modifiers.new('DR_Weighted_Corner_Normals', 'WEIGHTED_NORMAL'); m.keep_sharp = True
    return obj


def cylinder(name, radius, depth, loc, material, axis='Z', edge=.0005, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    obj=bpy.context.object; obj.name=name; obj.data.name=name+'_Mesh'; obj.location=loc
    link_object(obj); assign(obj, material)
    if axis=='Y': obj.rotation_euler[0]=math.pi/2
    elif axis=='X': obj.rotation_euler[1]=math.pi/2
    for p in obj.data.polygons: p.use_smooth = len(p.vertices)==4
    if obj.data.uv_layers: obj.data.uv_layers[0].name='DR_UV'
    if edge: bevel(obj, min(edge,depth*.35), 3)
    return obj


def torus(name, radius, wire, loc, material, axis='Z'):
    bpy.ops.mesh.primitive_torus_add(major_segments=128, minor_segments=16, major_radius=radius, minor_radius=wire)
    obj=bpy.context.object; obj.name=name; obj.data.name=name+'_Mesh'; obj.location=loc
    link_object(obj); assign(obj,material)
    if axis=='Y': obj.rotation_euler[0]=math.pi/2
    elif axis=='X': obj.rotation_euler[1]=math.pi/2
    for p in obj.data.polygons: p.use_smooth=True
    if obj.data.uv_layers: obj.data.uv_layers[0].name='DR_UV'
    return obj


def curve(name, points, radius, material, cyclic=False, resolution=4):
    data=bpy.data.curves.new(name+'_Curve','CURVE'); data.dimensions='3D'
    data.resolution_u=12; data.bevel_depth=radius; data.bevel_resolution=resolution
    data.use_fill_caps=not cyclic
    spline=data.splines.new('POLY'); spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points): p.co=(*co,1)
    spline.use_cyclic_u=cyclic
    obj=bpy.data.objects.new(name,data); link_object(obj)
    if material: assign(obj,material)
    return obj


def rounded_rect(hx,hy,r,n=20,spout=0):
    result=[]
    for quadrant,(cx,cy) in enumerate([(hx-r,hy-r),(-hx+r,hy-r),(-hx+r,-hy+r),(hx-r,-hy+r)]):
        for j in range(n):
            angle=quadrant*math.pi/2 + j*math.pi/(2*(n-1))
            x,y=cx+r*math.cos(angle),cy+r*math.sin(angle)
            extension=spout*math.sin(math.pi*j/(n-1))**2 if quadrant==3 else 0
            result.append((x+extension*.7071,y-extension*.7071))
    return result


def ring_shell(name, rings, material, n=20, caps=True):
    verts=[]; faces=[]
    for hx,hy,r,z,spout in rings:
        verts.extend((x,y,z) for x,y in rounded_rect(hx,hy,r,n,spout))
    count=4*n
    for row in range(len(rings)-1):
        for i in range(count):
            a=row*count+i; b=row*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    if caps: faces += [tuple(reversed(range(count))),tuple((len(rings)-1)*count+i for i in range(count))]
    obj=mesh_obj(name,verts,faces,material)
    if caps:
        obj.data.polygons[-1].use_smooth=False; obj.data.polygons[-2].use_smooth=False
    return obj


def lathe(name, profile, material, loc=(0,0,0), segments=128):
    verts=[]; rows=[]; uv=[]; faces=[]
    closed=profile[0]==profile[-1]
    if closed: profile=profile[:-1]
    zmin=min(p[1] for p in profile); zmax=max(p[1] for p in profile)
    for r,z in profile:
        if abs(r)<1e-7:
            rows.append([len(verts)]); verts.append((0,0,z)); uv.append((.5,(z-zmin)/max(zmax-zmin,1e-6)))
        else:
            row=[]
            for i in range(segments):
                a=TAU*i/segments; row.append(len(verts)); verts.append((r*math.cos(a),r*math.sin(a),z)); uv.append((i/segments,(z-zmin)/max(zmax-zmin,1e-6)))
            rows.append(row)
    for a,b in zip(rows,rows[1:]+([rows[0]] if closed else [])):
        if len(a)==1 and len(b)==1: continue
        for i in range(segments):
            j=(i+1)%segments
            if len(a)==1: faces.append((a[0],b[j],b[i]))
            elif len(b)==1: faces.append((a[i],a[j],b[0]))
            else: faces.append((a[i],a[j],b[j],b[i]))
    obj=mesh_obj(name,verts,faces,material,uvs=uv); obj.location=loc
    return obj


def origin_to(obj, point):
    point=Vector(point); delta=point-obj.location
    obj.data.transform(Matrix.Translation(-delta)); obj.location=point


def hide_helper(obj):
    obj.hide_render=True; obj.hide_set(True); obj.display_type='WIRE'
    obj['DR_helper']=True
    return obj


def driver(obj, path, index, control, property_name, expression):
    d=obj.driver_add(path,index).driver; d.type='SCRIPTED'
    v=d.variables.new(); v.name='v'; v.type='SINGLE_PROP'
    v.targets[0].id=control; v.targets[0].data_path='["'+property_name+'"]'
    d.expression=expression


SCREW_MESH=None
def screw(name, loc, radius=.0032, axis='Y'):
    global SCREW_MESH
    if SCREW_MESH is None:
        p=cylinder('DR_Screw_Prototype',.0032,.002,(0,0,0),'DR_PolishedSteel',edge=0,vertices=48)
        cutter=cube('DR_Screw_SlotTool',(.001,.009,.0014),(0,0,.0008),'DR_PolishedSteel',edge=0,smooth=False)
        boolean=p.modifiers.new('DR_Machined_Slot','BOOLEAN'); boolean.operation='DIFFERENCE'; boolean.object=cutter
        bpy.context.view_layer.objects.active=p
        bpy.ops.object.modifier_apply(modifier=boolean.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
        SCREW_MESH=p.data; SCREW_MESH.name='DR_SlottedScrew_Mesh'; SCREW_MESH.use_fake_user=True
        bpy.data.objects.remove(p,do_unlink=True)
    obj=bpy.data.objects.new(name,SCREW_MESH); link_object(obj); obj.location=loc
    obj.scale=(radius/.0032,)*3
    if axis=='Y': obj.rotation_euler[0]=math.pi/2
    elif axis=='X': obj.rotation_euler[1]=math.pi/2
    bevel(obj,.00012,3)
    return obj


def build_tray():
    family('DR_Tray', 'centre of underside of floor; interior floor at z=0.0035 m')
    inner=[(.140,.180,.018,.0035,0),(.142,.182,.020,.0045,0),
           (.143,.183,.021,.007,0),(.148,.188,.026,.048,0),
           (.150,.190,.028,.059,.023)]
    lip=[(.1505,.1905,.0285,.061,.024),(.152,.192,.030,.062,.024),
         (.155,.195,.031,.062,.024),(.157,.197,.032,.060,.024),
         (.157,.197,.032,.058,.024),(.155,.195,.030,.056,.022),
         (.1535,.1935,.028,.055,.020),(.1465,.1865,.023,.006,0),
         (.145,.185,.021,0,0)]
    body=ring_shell('DR_Tray',inner+lip,'DR_Polystyrene')
    bevel(body,.00028,3)
    body['DR_inner_dimensions_m']=[.30,.38,.06]
    body['DR_wall_nominal_m']=.0035
    ribs=bpy.data.collections.new('DR_Tray_FloorRibs'); COL.children.link(ribs)
    for i in range(9):
        rib=cube('DR_Tray_Rib_%02d'%i,(.0032,.302,.0018),((i-4)*.027,0,.0042),'DR_Polystyrene',.0008)
        for c in list(rib.users_collection): c.objects.unlink(rib)
        ribs.objects.link(rib)
    # The upper cross-section is interpolated from the SAME inner wall profile.
    t=(.0385-.007)/(.048-.007)
    upper=(.143+t*.005,.183+t*.005,.021+t*.005,.0385,0)
    bounds=ring_shell('DR_Tray_LiquidBounds',inner[:3]+[upper],None)
    cut=bounds.modifiers.new('DR_Exclude_Physical_Floor_Ribs','BOOLEAN')
    cut.operation='DIFFERENCE'; cut.operand_type='COLLECTION'; cut.collection=ribs; cut.solver='EXACT'
    hide_helper(bounds)
    bounds['DR_fill_depth_above_floor_m']=.035
    bounds['DR_free_surface_z_m']=.0385
    bounds['DR_bounds_note']='Closed interior volume, matching inner wall profile, subtracting evaluated ribs.'
    ASSETS['DR_Tray'].update(close=(.147,-.190,.061),direction=(1.15,-1.4,1.5),macro_direction=(.6,-1.0,1.15),macro_distance=.31)


def tong_arm(name, side, ymin, ymax, rubber=False):
    verts=[]; faces=[]; count=24
    for j in range(49):
        y=ymin+(ymax-ymin)*j/48
        bend=.006+.0105*(1-min(y/.20,1))**1.65
        z=.006+.0017*math.sin(math.pi*y/.20)
        taper=.94+.06*math.sin(math.pi*j/48)
        hx=(.0036 if rubber else .0024)*taper
        hz=(.006 if rubber else .0043)*taper
        for x,q in rounded_rect(hx,hz,.0011 if rubber else .00065,n=6):
            verts.append((side*bend+x,y,z+q))
    for j in range(48):
        for k in range(count):
            a=j*count+k; b=j*count+(k+1)%count; faces.append((a,b,b+count,a+count))
    faces += [tuple(reversed(range(count))),tuple(48*count+k for k in range(count))]
    obj=mesh_obj(name,verts,faces,'DR_RedRubber' if rubber else 'DR_Bamboo')
    bevel(obj,.00020 if rubber else .00015,3)
    return obj


def build_tongs():
    global ROOT,COL
    main,mainroot=family('DR_Tongs','each variant root is the midpoint between the two tip ends')
    for variant,offset in [('Plain',-.047),('Ribbed',.047)]:
        col=bpy.data.collections.new('DR_Tongs_'+variant); main.children.link(col)
        COL=col; ROOT=mainroot
        pivot=empty('DR_Tongs_'+variant+'_TipPivot',(offset,0,0))
        pivot['DR_pivot']='tip end'; pivot['DR_length_m']=.20
        ROOT=pivot
        for side,label in [(-1,'L'),(1,'R')]:
            tong_arm('DR_Tongs_'+variant+'_Bamboo_'+label,side,.024,.20)
            tip=tong_arm('DR_Tongs_'+variant+'_Rubber_'+label,side,0,.033,True)
            # A mould seam follows the sleeve edge; it is actual raised geometry.
            pts=[]
            y=.031
            bend=.006+.0105*(1-y/.20)**1.65
            for x,z in rounded_rect(.00362,.00603,.0011,n=8): pts.append((side*bend+x,y,.006+.0017*math.sin(math.pi*y/.2)+z))
            curve('DR_Tongs_'+variant+'_MouldSeam_'+label,pts,.00008,'DR_RedRubber',True,2)
            for k,y in enumerate([.065,.143]):
                bend=.006+.0105*(1-y/.20)**1.65
                cube('DR_Tongs_'+variant+'_Node_'+label+str(k),(.0050,.0010,.0089),
                     (side*bend,y,.006+.0017*math.sin(math.pi*y/.20)),'DR_BambooNodes',.00025)
            if variant=='Ribbed':
                for k in range(9):
                    y=.0035+k*.0028
                    bend=.006+.0105*(1-y/.20)**1.65
                    cylinder('DR_Tongs_Ribbed_Grip_'+label+'_%02d'%k,.0005,.0090,
                             (side*(bend-.0036),y,.0065),'DR_RedRubber',edge=.00018,vertices=24)
        cube('DR_Tongs_'+variant+'_BambooSpringBridge',(.016,.012,.009),
             (0,.197,.006),'DR_Bamboo',.002)
        # Thin steel pin on the closed bamboo bridge is deliberately unbranded.
        cylinder('DR_Tongs_'+variant+'_BridgePin',.0012,.017,(0,.197,.006),'DR_PolishedSteel','X',.0002,32)
    COL=main; ROOT=mainroot
    ASSETS['DR_Tongs'].update(close=(.047,.018,.006),direction=(.7,-1.2,1.65),macro_direction=(.55,-.6,1),macro_distance=.24)


def build_paper():
    family('DR_Paper','each sheet origin is the centre of its physical top edge')
    for landscape,xoff,name in [(False,-.145,'DR_Paper_8x10'),(True,.145,'DR_Paper_10x8')]:
        nx,ny=100,128
        verts=[]; uv=[]; faces=[]
        w,h=(.254,.203) if landscape else (.203,.254)
        for j in range(ny+1):
            v=j/ny
            for i in range(nx+1):
                u=i/nx
                # The second sheet is the SAME portrait UV convention rotated
                # clockwise in physical space; V is always the 10-inch axis.
                if landscape: verts.append(((v-.5)*w,0,-u*h))
                else: verts.append(((u-.5)*w,0,(v-1)*h))
                uv.append((u,v))
        for j in range(ny):
            for i in range(nx):
                a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
        obj=mesh_obj(name,verts,faces,'DR_PaperFibreBase',uvs=uv)
        own=bpy.data.collections.new(name); COL.children.link(own)
        for linked in list(obj.users_collection): linked.objects.unlink(obj)
        own.objects.link(obj)
        obj.location=(xoff,0,h)
        obj['DR_sheet_dimensions_m']=[w,h]
        obj['DR_thickness_m']=.0003
        obj['DR_uv_orientation']='portrait: U is 8-inch axis, V is 10-inch axis; full-sheet 0..1'
        obj['DR_base_quad_grid']=[nx,ny]
        pin=obj.vertex_groups.new(name='DR_Pin_TopEdge')
        pin.add([i for i,v in enumerate(verts) if abs(v[2])<1e-7],1.,'REPLACE')
        obj.shape_key_add(name='DR_Flat')
        curl=obj.shape_key_add(name='DR_Hanging_Curl')
        for k,v in enumerate(verts):
            drop=-v[2]/h
            curl.data[k].co.y=.008*drop**2 + .004*math.sin(v[0]/w*math.pi)*drop**2
            curl.data[k].co.z += .003*(abs(v[0])/(w*.5))**4*drop**3
        curl.value=0
        sub=obj.modifiers.new('DR_Deformation_Subdivision','SUBSURF'); sub.levels=1; sub.render_levels=1
        solid=obj.modifiers.new('DR_0300mm_Fibre_Base','SOLIDIFY'); solid.thickness=.0003; solid.offset=0; solid.use_even_offset=True
        bevel(obj,.000045,3)
    ASSETS['DR_Paper'].update(close=(-.23,0,.085),direction=(.6,-1.8,.55),macro_direction=(.7,-1,.2),macro_distance=.27)


def prism_profile(name,profile,halfwidth,material):
    verts=[(x,-halfwidth,z) for x,z in profile]+[(x,halfwidth,z) for x,z in profile]
    n=len(profile); faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh_obj(name,verts,faces,material)
    bevel(obj,.00055,5)
    return obj


def build_clothespin():
    family('DR_Clothespin','steel spring axis; local Y is the opening hinge axis')
    ROOT.location.z=.013
    ROOT['DR_open_degrees']=0.
    ROOT.id_properties_ui('DR_open_degrees').update(min=0,max=26,description='Open jaws; both wooden halves rotate around the spring axis.')
    profile=[(-.037,.00015),(-.037,.0055),(-.028,.0072),(-.015,.0087),
             (-.006,.0127),(.004,.013),(.013,.0106),(.035,.008),(.037,.005),
             (.036,.0028),(.018,.0026),(.008,.0041),(.001,.0070),
             (-.005,.0077),(-.018,.0045),(-.030,.00015)]
    upper=prism_profile('DR_Clothespin_UpperHalf',profile,.0052,'DR_ClothespinWood')
    lower=prism_profile('DR_Clothespin_LowerHalf',[(x,-z) for x,z in profile],.0052,'DR_ClothespinWood')
    driver(upper,'rotation_euler',1,ROOT,'DR_open_degrees','v*pi/360')
    driver(lower,'rotation_euler',1,ROOT,'DR_open_degrees','-v*pi/360')
    pts=[]
    for i in range(601):
        t=i/600; a=t*TAU*7.5
        pts.append((.0046*math.cos(a),-.0053+t*.0106,.0046*math.sin(a)))
    coil=curve('DR_Clothespin_CoilSpring',pts,.00063,'DR_PolishedSteel',resolution=4)
    for label,side,half in [('Upper',1,upper),('Lower',-1,lower)]:
        pts=[(.0046*side,.0053*side,0),(.008*side,.0061*side,.006*side),
             (.015,.0061*side,.0109*side),(.018,.004*side,.0115*side),(.018,-.002*side,.0115*side)]
        leg=curve('DR_Clothespin_SpringLeg_'+label,pts,.00063,'DR_PolishedSteel',resolution=4)
        leg.parent=half; leg.matrix_parent_inverse=Matrix.Identity(4)
    ASSETS['DR_Clothespin'].update(close=(.002,-.001,.016),direction=(.75,-1.1,1.0),macro_direction=(.6,-1,.7),macro_distance=.24,macro_lens=100)


def build_line():
    family('DR_Line','left endpoint of the 2 m line; rest sag is 85 mm below endpoints')
    ROOT['DR_length_m']=2.
    control=empty('DR_Line_SagControl',(1,0,-.085))
    control.empty_display_type='SPHERE'; control.empty_display_size=.025
    control['DR_instruction']='Move local Z to increase or reduce sag. All real twisted strands share this hook.'
    def hook(obj, count):
        m=obj.modifiers.new('DR_Adjustable_Midpoint_Sag','HOOK'); m.object=control
        m.center=(1,0,-.085); m.falloff_type='SMOOTH'; m.falloff_radius=1.
        m.vertex_indices_set(list(range(count)))
        # Bind from explicit local coordinates, not a matrix that may not yet
        # have been updated by the dependency graph after creating the empty.
        m.matrix_inverse=Matrix.Translation(-control.location)
    for strand in range(3):
        pts=[]
        for i in range(2201):
            x=2*i/2200; a=TAU*x/.018+strand*TAU/3
            pts.append((x,.00070*math.cos(a),-.085*math.sin(math.pi*x/2)+.00070*math.sin(a)))
        obj=curve('DR_Line_TwistedStrand_%d'%strand,pts,.00053,'DR_Jute',resolution=3); hook(obj,len(pts))
        for fine in range(8):
            fibre=[]
            for i,(x,y,z) in enumerate(pts):
                a=TAU*x/.0057+fine*TAU/8
                radius=.000555+.000012*math.sin(x*1600+fine*2.7)
                fibre.append((x,y+radius*math.cos(a),z+radius*math.sin(a)))
            obj=curve('DR_Line_Filament_%d_%d'%(strand,fine),fibre,.000075,'DR_Jute',resolution=2); hook(obj,len(fibre))
    # Short, physical frayed fibres catch macro rim light; no hair system/add-on.
    for j in range(240):
        x=RNG.uniform(.02,1.98); phase=RNG.uniform(0,TAU)
        y=.00115*math.cos(phase); z=-.085*math.sin(math.pi*x/2)+.00115*math.sin(phase)
        pts=[(x,y,z),(x+.0007,y*1.25,z+.00035),(x+.0018,y*1.55,z+.0007)]
        obj=curve('DR_Line_Fray_%03d'%j,pts,.000027,'DR_Jute',resolution=1); hook(obj,len(pts))
    ASSETS['DR_Line'].update(close=(1,0,-.085),direction=(.25,-1.7,.8),macro_direction=(.1,-1,.75),macro_distance=.22,macro_lens=100)


def build_sink():
    family('DR_Sink','base centre; basin outer floor at Z=0')
    rings=[(.808,.257,.041,.006,0),(.814,.263,.048,.008,0),
           (.820,.269,.050,.014,0),(.845,.305,.060,.177,0),
           (.848,.309,.062,.183,0),(.852,.314,.064,.186,0),
           (.891,.341,.066,.186,0),(.899,.349,.069,.184,0),
           (.901,.351,.070,.180,0),(.899,.351,.070,.176,0),
           (.895,.347,.067,.174,0),(.893,.345,.065,.179,0),
           (.848,.310,.061,.179,0),(.822,.271,.051,.009,0),
           (.816,.265,.047,0,0)]
    basin=ring_shell('DR_Sink_Basin',rings,'DR_BrushedSteel',n=28)
    basin['DR_nominal_dimensions_m']=[1.80,.70,.18]
    cutters=bpy.data.collections.new('DR_Sink_DrainCutters'); COL.children.link(cutters)
    def cutter(name,radius,depth,loc):
        o=cylinder(name,radius,depth,loc,'DR_Ink',edge=0,vertices=48)
        for c in list(o.users_collection): c.objects.unlink(o)
        cutters.objects.link(o); hide_helper(o)
        return o
    hole=cutter('DR_Sink_DrainOpeningTool',.034,.040,(.49,.04,.004))
    b=basin.modifiers.new('DR_True_Drain_Opening','BOOLEAN'); b.operation='DIFFERENCE'; b.object=hole; b.solver='EXACT'
    bevel(basin,.00040,3)
    # Folded sheet splashback and mechanically rolled top edge.
    cube('DR_Sink_Backsplash',(1.797,.0025,.213),(0,.344,.2895),'DR_BrushedSteel',.0011)
    cylinder('DR_Sink_BacksplashRolledTop',.0042,1.794,(0,.344,.397),'DR_BrushedSteel','X',.0006)
    for side in [-1,1]:
        cube('DR_Sink_BacksplashReturn_'+str(side),(.0025,.024,.21),(side*.897,.333,.29),'DR_BrushedSteel',.001)
    curve('DR_Sink_FrontRolledEdge',[(-.82,-.351,.178),(-.86,-.349,.178),(-.897,-.315,.178)],.004,'DR_BrushedSteel')
    curve('DR_Sink_FrontLip',[(-.86,-.351,.178),(.86,-.351,.178)],.004,'DR_BrushedSteel')
    # Flange, true perforated strainer and removable basket lip.
    torus('DR_Sink_DrainFlange',.0385,.0023,(.49,.04,.009),'DR_PolishedSteel')
    torus('DR_Sink_DrainInnerLip',.032,.0010,(.49,.04,.0098),'DR_PolishedSteel')
    strainer=cylinder('DR_Sink_PerforatedStrainer',.0317,.0015,(.49,.04,.0087),'DR_BrushedSteel',edge=0)
    holes=bpy.data.collections.new('DR_Sink_StrainerHoleTools'); COL.children.link(holes)
    for row,(radius,n) in enumerate([(.011,8),(.022,16)]):
        for j in range(n):
            a=TAU*j/n+row*.15
            o=cylinder('DR_Sink_StrainerHole_%02d_%02d'%(row,j),.0024,.008,
                       (.49+radius*math.cos(a),.04+radius*math.sin(a),.008),'DR_Ink',edge=0,vertices=24)
            for c in list(o.users_collection): c.objects.unlink(o)
            holes.objects.link(o); hide_helper(o)
    b=strainer.modifiers.new('DR_Actual_Perforations','BOOLEAN'); b.operation='DIFFERENCE'; b.operand_type='COLLECTION'; b.collection=holes; b.solver='EXACT'
    bevel(strainer,.00018,3)
    cylinder('DR_Sink_StrainerCentre',.004,.002,(.49,.04,.010),'DR_PolishedSteel',edge=.0003)
    # One switchable object, not hundreds of separately managed droplets.
    bm=bmesh.new()
    for i in range(132):
        radius=RNG.uniform(.00085,.0048)
        if i<90:
            side=i%4
            if side<2: x=RNG.uniform(-.85,.85); y=(-1 if side==0 else 1)*RNG.uniform(.321,.341)
            else: x=(-1 if side==2 else 1)*RNG.uniform(.868,.886); y=RNG.uniform(-.28,.28)
            surface=.186
        else:
            x=RNG.uniform(-.73,.73); y=RNG.uniform(-.225,.225); surface=.006
        flatten=RNG.uniform(.23,.40)
        m=Matrix.Translation((x,y,surface+radius*flatten)) @ Matrix.Diagonal((radius,radius*RNG.uniform(.78,1.25),radius*flatten,1))
        bmesh.ops.create_uvsphere(bm,u_segments=20,v_segments=10,radius=1,matrix=m)
    me=bpy.data.meshes.new('DR_Droplets_Mesh'); bm.to_mesh(me); bm.free()
    droplets=bpy.data.objects.new('DR_Droplets',me); link_object(droplets); assign(droplets,'DR_Water')
    for p in me.polygons: p.use_smooth=True
    uv_project(me)
    droplets['DR_visibility_note']='Toggle this object to remove all rim/floor droplets.'
    ASSETS['DR_Sink'].update(close=(.49,.04,.010),direction=(1.1,-1.8,1.3),macro_direction=(.4,-1,1.1),macro_distance=.35,macro_lens=85)


def clock_hand(name,length,width,depth,loc,material):
    verts=[(-width,-depth/2,-.014),(width,-depth/2,-.014),(width*.42,-depth/2,length*.90),
           (0,-depth/2,length),(-width*.42,-depth/2,length*.90)]
    verts += [(x,depth/2,z) for x,y,z in verts]
    faces=[(4,3,2,1,0),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
    obj=mesh_obj(name,verts,faces,material); obj.location=loc; bevel(obj,.00016,3)
    obj['DR_animation_axis']='local Y at dial centre'
    return obj


def knurled(name,radius,height,loc,material,n=96):
    verts=[]; faces=[]
    for z in [-height/2,height/2]:
        for i in range(n*2):
            a=TAU*i/(n*2); r=radius if i%2==0 else radius-.00065
            verts.append((r*math.cos(a),r*math.sin(a),z))
    count=n*2
    for i in range(count): faces.append((i,(i+1)%count,(i+1)%count+count,i+count))
    faces += [tuple(reversed(range(count))),tuple(count+i for i in range(count))]
    o=mesh_obj(name,verts,faces,material); o.location=loc; bevel(o,.00014,2)
    return o


def build_timer():
    family('DR_Timer','base centre; hands have independent dial-centre origins')
    case=cube('DR_Timer_Housing',(.218,.105,.233),(0,0,.125),'DR_BlackEnamel',.013)
    case['DR_timer_digits_exception']='User approved only timer numerals; no other readable writing/logos.'
    cube('DR_Timer_RearCover',(.192,.003,.208),(0,.053,.125),'DR_BlackEnamel',.009)
    for x in [-.075,.075]:
        for y in [-.032,.030]: cube('DR_Timer_Foot_'+str(x)+'_'+str(y),(.029,.028,.009),(x,y,.0045),'DR_BlackRubber',.0035)
    z=.140
    cylinder('DR_Timer_Dial',.084,.002,(0,-.0545,z),'DR_TimerDial','Y',.0005)
    torus('DR_Timer_BezelOuter',.0885,.0040,(0,-.060,z),'DR_BlackEnamel','Y')
    torus('DR_Timer_BezelInner',.0833,.0009,(0,-.063,z),'DR_PolishedSteel','Y')
    cylinder('DR_Timer_GlassLens',.084,.0022,(0,-.065,z),'DR_ClearGlass','Y',.00045)
    for i in range(60):
        a=TAU*i/60; major=i%5==0; radius=.0775
        tick=cube('DR_Timer_Tick_%02d'%i,(.00115 if major else .00055,.00035,.0068 if major else .0030),
                  (radius*math.sin(a),-.0610,z+radius*math.cos(a)),'DR_TimerGlow',.00012)
        tick.rotation_euler[1]=a
    for i in range(12):
        a=TAU*i/12; r=.0618
        data=bpy.data.curves.new('DR_Timer_Number_%02d_Font'%(i*5),'FONT')
        data.body=str(i*5); data.align_x='CENTER'; data.align_y='CENTER'
        data.size=.0115; data.extrude=.00010; data.bevel_depth=.000035; data.bevel_resolution=2
        obj=bpy.data.objects.new('DR_Timer_Number_%02d'%(i*5),data); link_object(obj)
        obj.location=(r*math.sin(a),-.0614,z+r*math.cos(a)); obj.rotation_euler[0]=math.pi/2
        assign(obj,'DR_TimerGlow')
    minute=clock_hand('DR_Timer_MinuteHand',.061,.0022,.0008,(0,-.0625,z),'DR_TimerGlow')
    second=clock_hand('DR_Timer_SecondHand',.074,.00065,.0005,(0,-.0636,z),'DR_TimerGlow')
    minute.rotation_euler[1]=math.radians(-48); second.rotation_euler[1]=math.radians(27)
    knob=knurled('DR_Timer_SetKnob',.0185,.011,(0,-.0745,z),'DR_BlackRubber',64); knob.rotation_euler[0]=math.pi/2
    cylinder('DR_Timer_HubCap',.008,.001,(0,-.081,z),'DR_BlackEnamel','Y',.0003)
    for x in [-.092,.092]:
        for zz in [.030,.219]: screw('DR_Timer_FaceScrew_'+str(x)+'_'+str(zz),(x,-.0545,zz))
    for x in [-.081,.081]:
        for zz in [.034,.211]: screw('DR_Timer_RearScrew_'+str(x)+'_'+str(zz),(x,.056,zz))
    cylinder('DR_Timer_CableGrommet',.007,.006,(.067,.057,.058),'DR_BlackRubber','Y',.001)
    ASSETS['DR_Timer'].update(close=(.007,-.064,.177),direction=(.72,-1.8,.70),macro_direction=(.35,-1,.15),macro_distance=.30)


def build_safelight():
    family('DR_Safelight','centre of wall mounting plate; lamp/bracket can extend below origin')
    cube('DR_Safelight_WallPlate',(.093,.006,.139),(0,0,0),'DR_BlackEnamel',.007)
    for x in [-.033,.033]:
        for z in [-.054,.054]: screw('DR_Safelight_WallScrew_'+str(x)+'_'+str(z),(x,-.0042,z))
    for side in [-1,1]:
        cube('DR_Safelight_YokeArm_'+str(side),(.008,.108,.022),(side*.080,-.055,0),'DR_BlackEnamel',.004)
        torus('DR_Safelight_PivotWasher_'+str(side),.009,.0016,(side*.087,-.104,0),'DR_PolishedSteel','X')
        screw('DR_Safelight_PivotScrew_'+str(side),(side*.090,-.104,0),.005,'X')
    # Axial shell is hollow, with a real back plate and separate front filter.
    housing=lathe('DR_Safelight_Housing',[(0,0),(.075,0),(.085,.006),(.094,.022),
                  (.096,.064),(.093,.080),(.085,.084),(.080,.082),(.084,.074),
                  (.087,.062),(.085,.025),(.074,.010),(0,.010)],'DR_BlackEnamel')
    housing.rotation_euler[0]=math.pi/2; housing.location=(0,-.074,0)
    bevel(housing,.0005,3)
    ring=lathe('DR_Safelight_ScrewRing',[(.078,0),(.090,0),(.094,.003),(.094,.010),
               (.090,.013),(.078,.013),(.077,.010),(.077,.003),(.078,0)],'DR_BlackEnamel')
    ring.rotation_euler[0]=math.pi/2; ring.location=(0,-.151,0)
    torus('DR_Safelight_FilterGasket',.079,.0020,(0,-.158,0),'DR_BlackRubber','Y')
    disc=cylinder('DR_Safelight_Filter',.0785,.004,(0,-.160,0),'DR_RedFilterGlass','Y',.0010)
    disc['DR_emission_note']='Separate dark-red filter. Set DR_RedFilterGlass Principled Emission Strength as needed; default is 0.'
    for i in range(6):
        a=TAU*i/6
        screw('DR_Safelight_RingScrew_%02d'%i,(.086*math.sin(a),-.166,.086*math.cos(a)),.0024)
    for i in range(24):
        a=TAU*i/24
        o=cube('DR_Safelight_RingGrip_%02d'%i,(.0025,.006,.004),(.093*math.sin(a),-.158,.093*math.cos(a)),'DR_BlackEnamel',.001)
        o.rotation_euler[1]=a
    ASSETS['DR_Safelight'].update(close=(.056,-.161,.045),direction=(.9,-1.7,.65),macro_direction=(.4,-1,.3),macro_distance=.30)


def generated_mark_image(name, graduations=False):
    # NumPy ships with Blender. No Pillow, downloaded font, texture or add-on.
    import numpy as np
    w,h=(384,1024) if graduations else (640,320)
    pixels=np.zeros((h,w,4),dtype=np.float32)
    if graduations:
        pixels[:,:,:3]=(.032,.030,.025)
        for i in range(51):
            row=round(20+i*(h-40)/50)
            end=round(w*(.79 if i%10==0 else .59 if i%5==0 else .39))
            pixels[max(0,row-2):min(h,row+2),round(w*.18):end,3]=1
    else:
        rng=np.random.default_rng(sum(map(ord,name)))
        noise=rng.normal(0,.004,(h,w))
        pixels[:,:,:3]=np.array([.73,.68,.56])[None,None,:]+noise[:,:,None]
        pixels[:,:,3]=1.
        yy,xx=np.mgrid[0:h,0:w]
        for baseline in [.36,.59]:
            points=[]
            for i in range(40):
                x=.14+i*.017
                y=baseline + .021*math.sin(i*2.5) + float(rng.normal(0,.017))
                points.append((x*w,y*h))
            for a,b in zip(points,points[1:]):
                vx,vy=b[0]-a[0],b[1]-a[1]
                t=np.clip(((xx-a[0])*vx+(yy-a[1])*vy)/(vx*vx+vy*vy+1e-8),0,1)
                d=np.sqrt((xx-a[0]-t*vx)**2+(yy-a[1]-t*vy)**2)
                alpha=np.clip(1.35-d,0,1)*.35
                pixels[:,:,:3]=pixels[:,:,:3]*(1-alpha[:,:,None])+np.array([.19,.16,.115])*alpha[:,:,None]
    image=bpy.data.images.new(name,width=w,height=h,alpha=True)
    image.pixels.foreach_set(pixels.ravel()); image.update(); image.pack(); image.use_fake_user=True
    return image


def decal_material(name, image, transparent=False):
    mat,p=principled(name,(.7,.66,.55),.64)
    uv=node(mat,'ShaderNodeTexCoord','Full_Label_UV',(-650,150))
    tex=node(mat,'ShaderNodeTexImage','Packed_Ink_And_Paper',(-420,150)); tex.image=image
    mat.node_tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
    mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    if transparent: mat.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
    else: micro_surface(mat,p,(12000,12000,12000),.000003,(.61,.70),.18,'Label_Fibres')
    return mat


def curved_decal(name,radius,z0,height,halfangle,material,thick=True):
    nx,ny=64,12; vv=[]; uv=[]; ff=[]
    for j in range(ny+1):
        for i in range(nx+1):
            a=-halfangle+2*halfangle*i/nx
            vv.append((radius*math.sin(a),-radius*math.cos(a),z0+height*j/ny)); uv.append((i/nx,j/ny))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; ff.append((a,a+1,a+nx+2,a+nx+1))
    obj=mesh_obj(name,vv,ff,material,uvs=uv)
    if thick:
        sol=obj.modifiers.new('DR_Paper_Label_Thickness','SOLIDIFY'); sol.thickness=.00010; sol.offset=1
        bevel(obj,.000025,2)
    return obj


def bottle_cap(name,radius,height,z):
    profile=[(0,height),(radius-.0015,height),(radius,height-.0015),(radius,.001),
             (radius-.001,0),(radius-.0021,0),(radius-.0021,height-.003),(0,height-.003)]
    cap=lathe(name,profile,'DR_BlackRubber',loc=(0,0,z),segments=256)
    for v in cap.data.vertices:
        r=math.hypot(v.co.x,v.co.y)
        if r>radius-.0003:
            a=math.atan2(v.co.y,v.co.x)
            nr=r-.00042*(.5+.5*math.cos(a*64))
            v.co.x*=nr/r; v.co.y*=nr/r
    bevel(cap,.00018,3)
    cap['DR_removable']=True
    return cap


def make_bottle(name,capacity_ml,loc):
    global ROOT,COL
    oldroot,oldcol=ROOT,COL
    col=bpy.data.collections.new(name); oldcol.children.link(col); COL=col
    ROOT=empty(name+'_Root',loc)
    outer=[(0,0),(.038,0),(.043,.003),(.044,.008),(.044,.154),(.043,.168),
           (.035,.188),(.019,.205),(.018,.211),(.018,.219),(.019,.220),(.019,.223),(.016,.224)]
    inner=[(.015,.224),(.015,.208),(.032,.185),(.0405,.166),(.041,.154),(.041,.009),(.037,.005),(0,.005)]
    ascending=list(reversed(inner))
    volume=0
    for (r0,z0),(r1,z1) in zip(ascending,ascending[1:]):
        volume+=math.pi*(z1-z0)*(r0*r0+r0*r1+r1*r1)/3
    scale=((capacity_ml*1e-6)/volume)**(1/3)
    profile=[(r*scale,z*scale) for r,z in outer+inner]
    body=lathe(name+'_Glass',profile,'DR_AmberGlass',segments=160)
    body['DR_capacity_ml']=capacity_ml; body['DR_nominal_wall_m']=.003*scale
    body['DR_glass_geometry']='Closed outer and inner wall with thick bottom; open mouth.'
    bevel(body,.00022*scale,3)
    # External helical neck thread remains accessible when the separate cap moves.
    pts=[]
    for i in range(241):
        t=i/240; a=TAU*2.4*t
        pts.append((.0186*scale*math.cos(a),.0186*scale*math.sin(a),(.209+.010*t)*scale))
    curve(name+'_GlassThread',pts,.00062*scale,'DR_AmberGlass',resolution=3)
    bottle_cap(name+'_Cap',.022*scale,.020*scale,.211*scale)
    mat=decal_material(name+'_LabelMaterial',generated_mark_image(name+'_PackedLabel'))
    curved_decal(name+'_Label',.044*scale+.00016,.054*scale,.081*scale,.96,mat)
    ROOT['DR_capacity_ml']=capacity_ml
    ROOT['DR_height_m']=.231*scale
    ROOT=oldroot; COL=oldcol


def build_bottles():
    global ROOT
    family('DR_Bottles','each bottle base centre; caps are separate objects')
    for name,ml,x in [('DR_Bottle_1L',1000,-.167),('DR_Bottle_500ml',500,-.049),('DR_Bottle_250ml',250,.047)]:
        make_bottle(name,ml,(x,0,0))
    oldroot=ROOT
    ROOT=empty('DR_GraduatedCylinder_250ml_Root',(.139,.014,0))
    # 18 mm bore; 245.6 mm column corresponds to 250 mL.
    profile=[(0,.006),(.015,.006),(.020,.009),(.020,.270),(.0215,.276),
             (.022,.280),(.020,.282),(.018,.279),(.018,.012),(0,.012)]
    tube=lathe('DR_GraduatedCylinder_Glass',profile,'DR_ClearGlass',segments=128)
    bevel(tube,.00030,3)
    tube['DR_bore_radius_m']=.018
    tube['DR_capacity_ml']=250
    tube['DR_250ml_line_z_m']=.012+250e-6/(math.pi*.018**2)
    cylinder('DR_GraduatedCylinder_HexFoot',.047,.007,(0,0,.0035),'DR_ClearGlass',edge=.002,vertices=6)
    torus('DR_GraduatedCylinder_RolledLip',.020,.0015,(0,0,.280),'DR_ClearGlass')
    mat=decal_material('DR_CylinderGraduationInk',generated_mark_image('DR_Cylinder_PackedGraduations',True),True)
    curved_decal('DR_GraduatedCylinder_Graduations',.02014,.012,250e-6/(math.pi*.018**2),.82,mat,False)
    ROOT=oldroot
    ASSETS['DR_Bottles'].update(close=(-.167,-.018,.192),direction=(.65,-1.9,.65),macro_direction=(.5,-1,.4),macro_distance=.31)


def build_enlarger():
    family('DR_Enlarger','baseboard centre, bottom at Z=0')
    cube('DR_Enlarger_Baseboard',(.51,.43,.031),(0,0,.0155),'DR_ShelfWood',.006)
    cube('DR_Enlarger_BaseboardLaminate',(.500,.420,.0012),(0,0,.0316),'DR_BlackEnamel',.0005)
    cube('DR_Enlarger_Column',(.070,.056,.895),(0,.137,.479),'DR_BlackEnamel',.006)
    cylinder('DR_Enlarger_GuideRod',.011,.843,(.052,.139,.471),'DR_PolishedSteel',edge=.002)
    for j in range(36):
        cube('DR_Enlarger_RackTooth_%02d'%j,(.028,.008,.004),(0,.104,.13+j*.020),'DR_PolishedSteel',.001)
    cube('DR_Enlarger_Carriage',(.131,.085,.145),(0,.124,.666),'DR_BlackEnamel',.01)
    cube('DR_Enlarger_HeadArm',(.064,.213,.059),(0,.01,.724),'DR_BlackEnamel',.01)
    cube('DR_Enlarger_CondenserHousing',(.272,.227,.183),(0,-.107,.731),'DR_BlackEnamel',.025)
    cylinder('DR_Enlarger_LampDome',.102,.060,(0,-.107,.834),'DR_BlackEnamel',edge=.020)
    cylinder('DR_Enlarger_TopVent',.060,.009,(0,-.107,.867),'DR_BlackEnamel',edge=.004)
    rings=[]
    for i in range(25):
        t=i/24; bulge=.0055 if i%2==0 else -.0055
        rings.append((.064+.036*t+bulge,.054+.026*t+bulge,.010,.440+.194*t,0))
    bellows=ring_shell('DR_Enlarger_AccordionBellows',rings,'DR_BlackRubber',n=5,caps=False)
    bellows.location.y=-.107
    so=bellows.modifiers.new('DR_Bellows_Fabric_Thickness','SOLIDIFY'); so.thickness=.001
    bevel(bellows,.0008,3)
    cube('DR_Enlarger_NegativeCarrier',(.286,.247,.009),(0,-.107,.641),'DR_BlackEnamel',.003)
    cube('DR_Enlarger_CarrierHandle',(.12,.054,.012),(.04,-.245,.641),'DR_BlackRubber',.005)
    cylinder('DR_Enlarger_LensBarrel',.045,.074,(0,-.107,.406),'DR_BlackEnamel',edge=.003)
    knurled('DR_Enlarger_FocusRing',.048,.022,(0,-.107,.391),'DR_BlackRubber',80)
    cylinder('DR_Enlarger_LensGlass',.035,.004,(0,-.107,.368),'DR_ClearGlass',edge=.001)
    for side in [-1,1]:
        knob=knurled('DR_Enlarger_CarriageKnob_'+str(side),.027,.020,(side*.087,.123,.665),'DR_BlackRubber',64)
        knob.rotation_euler[1]=math.pi/2
    curve('DR_Enlarger_PowerCord',[(.10,-.04,.813),(.145,.03,.81),(.14,.18,.74),(.12,.19,.52),(.13,.18,.31),(.11,.18,.09)],.0033,'DR_BlackRubber',resolution=3)
    for x in [-.025,.025]:
        for y in [.117,.157]: screw('DR_Enlarger_BaseBolt_'+str(x)+'_'+str(y),(x,y,.038),.0045,'Z')
    ASSETS['DR_Enlarger'].update(close=(0,-.107,.465),direction=(.95,-1.7,.9),macro_direction=(.65,-1,.25),macro_distance=.39,macro_lens=70)


def build_shelf():
    family('DR_Shelf','base of wall brackets; all dressing belongs to the collection')
    cube('DR_Shelf_Plank',(1.10,.245,.028),(0,0,.237),'DR_ShelfWood',.005)
    for x in [-.389,.389]:
        cube('DR_Shelf_WallStrap_'+str(x),(.026,.005,.237),(x,.106,.1185),'DR_BlackEnamel',.0015)
        cube('DR_Shelf_SupportStrap_'+str(x),(.026,.207,.005),(x,.003,.220),'DR_BlackEnamel',.0015)
        brace=curve('DR_Shelf_DiagonalBrace_'+str(x),[(x,.10,.045),(x,-.086,.216)],.006,'DR_BlackEnamel')
        for z in [.029,.184]: screw('DR_Shelf_MountScrew_'+str(x)+'_'+str(z),(x,.101,z),.0035)
    for i,(x,r,h) in enumerate([(-.424,.035,.124),(-.324,.039,.146),(-.202,.029,.103),(-.102,.034,.123)]):
        glass='DR_AmberGlass' if i%2 else 'DR_ClearGlass'
        profile=[(0,0),(r-.003,0),(r,.004),(r,h-.01),(r+.001,h-.007),
                 (r+.001,h),(r-.002,h),(r-.002,.006),(0,.006)]
        lathe('DR_Shelf_Jar_%d'%i,profile,glass,loc=(x,0,.251),segments=96)
        cap=knurled('DR_Shelf_JarLid_%d'%i,r+.002,.012,(x,0,.251+h),'DR_BlackRubber',48)
        if i%2==0:
            cylinder('DR_Shelf_JarContents_%d'%i,r*.72,h*.50,(x,0,.251+h*.3),'DR_BlackRubber',edge=.005)
    for i,x in enumerate([.013,.059,.104]):
        y=-.036 if i%2 else .016
        cylinder('DR_Shelf_FilmCanister_%d'%i,.018,.052,(x,y,.277),'DR_BlackRubber',edge=.0018)
        cylinder('DR_Shelf_FilmCanisterLid_%d'%i,.0195,.006,(x,y,.306),'DR_BlackEnamel',edge=.0013)
    for i in range(3):
        x=.335+[-.006,.006,-.003][i]
        box=cube('DR_Shelf_PaperBox_%d'%i,(.263,.190,.034),(x,0,.269+i*.035),'DR_PaperBox',.0018)
        lid=cube('DR_Shelf_PaperBoxLid_%d'%i,(.266,.193,.007),(x,0,.284+i*.035),'DR_PaperBox',.0012)
        box.rotation_euler[2]=[-.03,.04,.0][i]; lid.rotation_euler[2]=box.rotation_euler[2]
    ASSETS['DR_Shelf'].update(close=(-.31,-.01,.362),direction=(.6,-1.8,.9),macro_direction=(.5,-1,.4),macro_distance=.38,macro_lens=70)


def object_bounds(collection):
    import numpy as np
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    points=[]
    for obj in collection.all_objects:
        if obj.type not in {'MESH','CURVE','FONT'} or obj.hide_render or obj.get('DR_helper'): continue
        evaluated=obj.evaluated_get(deps)
        # Blender 5.2's legacy Curve bound_box can include the unscaled point
        # radius (1 metre), not the actual bevel radius. Measure evaluated
        # curve geometry so small springs/fibres do not frame as metre objects.
        if obj.type in {'CURVE','FONT'}:
            me=evaluated.to_mesh()
            if me and len(me.vertices):
                coords=np.empty(len(me.vertices)*3,dtype=np.float32)
                me.vertices.foreach_get('co',coords); coords=coords.reshape(-1,3)
                cmin,cmax=coords.min(axis=0),coords.max(axis=0)
                points.extend(evaluated.matrix_world @ Vector((x,y,z)) for x in [cmin[0],cmax[0]] for y in [cmin[1],cmax[1]] for z in [cmin[2],cmax[2]])
            evaluated.to_mesh_clear()
        else:
            points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
    lo=Vector(tuple(min(p[k] for p in points) for k in range(3)))
    hi=Vector(tuple(max(p[k] for p in points) for k in range(3)))
    return lo,hi


def setup_cycles(scene,samples=96,cpu=False):
    scene.render.engine='CYCLES'
    scene.cycles.samples=samples
    scene.cycles.use_adaptive_sampling=True
    scene.cycles.adaptive_threshold=.012
    scene.cycles.adaptive_min_samples=16
    scene.cycles.use_denoising=True
    scene.cycles.max_bounces=12
    scene.cycles.diffuse_bounces=4
    scene.cycles.glossy_bounces=6
    scene.cycles.transmission_bounces=10
    scene.cycles.transparent_max_bounces=12
    scene.cycles.caustics_reflective=False
    scene.cycles.caustics_refractive=False
    scene.cycles.seed=731
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.image_settings.color_depth='8'
    scene.render.image_settings.compression=35
    scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    try: scene.view_settings.look='AgX - Medium High Contrast'
    except TypeError: pass
    scene.view_settings.exposure=0
    scene.view_settings.gamma=1
    scene.render.use_file_extension=True
    scene.cycles.device='CPU'
    if not cpu:
        prefs=bpy.context.preferences.addons['cycles'].preferences
        for backend in ['METAL','OPTIX','CUDA','HIP','ONEAPI']:
            try:
                prefs.compute_device_type=backend; prefs.get_devices()
                chosen=[d for d in prefs.devices if d.type==backend]
                if chosen:
                    for d in prefs.devices: d.use=d.type==backend
                    scene.cycles.device='GPU'
                    log('Cycles device: '+backend+' / '+chosen[0].name)
                    break
            except (TypeError,RuntimeError): continue


def make_preview_scene(samples,cpu):
    global COL,ROOT
    scene=bpy.data.scenes.new('DR_Preview')
    scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1
    scene.view_layers[0].name='DR_Preview_ViewLayer'
    COL=bpy.data.collections.new('DR_Preview_Rig'); scene.collection.children.link(COL)
    ROOT=None
    # A continuous studio sweep keeps the floor horizon out of low macro views.
    profile=[(-30,.01),(3,.01)]
    profile += [(3+3*math.sin(i*math.pi/192),.01+3*(1-math.cos(i*math.pi/192))) for i in range(1,97)]
    profile.append((6,30))
    verts=[(x,y,z) for y,z in profile for x in (-30,30)]
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(profile)-1)]
    floor=mesh_obj('DR_Preview_StudioFloor',verts,faces,'DR_PreviewGrey',parent=False)
    floor.location.z=-.011
    instance=empty('DR_Preview_AssetInstance',parent=False)
    instance.instance_type='COLLECTION'; instance.instance_collection=ASSETS['DR_Tray']['collection']
    for name in ['DR_Preview_ThreeQuarter','DR_Preview_Macro']:
        data=bpy.data.cameras.new(name+'_CameraData'); obj=bpy.data.objects.new(name,data); link_object(obj,parent=False)
        data.sensor_width=36; data.sensor_fit='HORIZONTAL'; data.clip_start=.003; data.clip_end=100
    for name in ['Key','Fill','Strip','Top']:
        data=bpy.data.lights.new('DR_Preview_'+name+'_LightData','AREA')
        obj=bpy.data.objects.new('DR_Preview_'+name,data); link_object(obj,parent=False)
        obj.visible_camera=False
        data.shape='DISK' if name=='Top' else 'RECTANGLE'; data.color=(1,1,1)
    world=bpy.data.worlds.new('DR_Preview_World'); world.use_nodes=True
    world.node_tree.nodes.clear()
    bg=world.node_tree.nodes.new('ShaderNodeBackground'); bg.name='DR_Preview_Background'
    bg.inputs['Color'].default_value=(.24,.24,.24,1); bg.inputs['Strength'].default_value=.32
    output=world.node_tree.nodes.new('ShaderNodeOutputWorld'); output.name='DR_Preview_WorldOutput'
    world.node_tree.links.new(bg.outputs['Background'],output.inputs['Surface']); scene.world=world
    setup_cycles(scene,samples,cpu)
    return scene


def point_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def configure_preview(scene,name,macro=False):
    cfg=ASSETS[name]
    lo,hi=Vector(cfg['bounds'][0]),Vector(cfg['bounds'][1])
    centre=(lo+hi)*.5; extent=max(max(hi-lo),.16)
    instance=bpy.data.objects['DR_Preview_AssetInstance']; instance.instance_collection=cfg['collection']
    bpy.data.objects['DR_Preview_StudioFloor'].location.z=lo.z-.011
    for label,offset,power,sx,sy in [
        ('Key',(-1.2,-1.35,1.85),650,1.25,1.6),
        ('Fill',(1.4,-.45,.75),260,1.4,1.4),
        ('Strip',(.35,1.1,1.25),750,.28,1.7),
        ('Top',(-.2,.2,2.1),180,1.15,1.15)]:
        light=bpy.data.objects['DR_Preview_'+label]
        light.location=centre+Vector(offset)*extent
        light.data.energy=power*extent*extent*.065; light.data.size=sx*extent
        if light.data.shape=='RECTANGLE': light.data.size_y=sy*extent
        point_at(light,centre)
    camera=bpy.data.objects['DR_Preview_Macro' if macro else 'DR_Preview_ThreeQuarter']
    scene.camera=camera
    if macro:
        target=Vector(cfg['close']); direction=Vector(cfg.get('macro_direction',(.6,-1,.6))).normalized()
        distance=cfg.get('macro_distance',.32)
        camera.data.lens=cfg.get('macro_lens',90)
        # The two smallest props use a portrait crop of the 24 mm sensor
        # height, exposing the coil and twine fibres without moving inside
        # the requested 20–40 cm working-distance range.
        camera.data.sensor_fit='VERTICAL' if name in {'DR_Clothespin','DR_Line'} else 'HORIZONTAL'
        camera.data.sensor_height=24
        camera.location=target+direction*distance
        point_at(camera,target)
        # Inspection previews keep all visible mechanical detail legible. The
        # artist can enable DOF later; lens and working distance remain macro.
        camera.data.dof.use_dof=False; camera.data.dof.focus_distance=distance; camera.data.dof.aperture_fstop=11
        scene.render.resolution_x=600; scene.render.resolution_y=1000
    else:
        direction=Vector(cfg.get('direction',(1,-1.6,1))).normalized()
        camera.data.sensor_fit='HORIZONTAL'
        camera.data.lens=65; camera.data.dof.use_dof=False
        rot=(-direction).to_track_quat('-Z','Y')
        right=rot @ Vector((1,0,0)); up=rot @ Vector((0,1,0))
        tangent=36/(2*camera.data.lens)
        corners=[Vector((x,y,z))-centre for x in [lo.x,hi.x] for y in [lo.y,hi.y] for z in [lo.z,hi.z]]
        distance=max(max(abs(c.dot(right)),abs(c.dot(up)))/tangent+c.dot(direction) for c in corners)*1.17
        camera.location=centre+direction*distance; point_at(camera,centre)
        scene.render.resolution_x=1000; scene.render.resolution_y=1000
    return camera


def png_read(path):
    """Read Blender's 8-bit RGB/RGBA PNG without external image libraries."""
    data=Path(path).read_bytes(); pos=8; compressed=b''; ancillary=[]
    while pos<len(data):
        size=struct.unpack('>I',data[pos:pos+4])[0]; typ=data[pos+4:pos+8]; body=data[pos+8:pos+8+size]; pos+=size+12
        if typ==b'IHDR': w,h,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',body)
        elif typ==b'IDAT': compressed+=body
        elif typ not in {b'IEND'} and typ[:1].islower(): ancillary.append((typ,body))
    assert depth==8 and color in (2,6) and interlace==0
    bpp=4 if color==6 else 3; stride=w*bpp; raw=zlib.decompress(compressed); rows=[]; previous=bytearray(stride); pos=0
    def paeth(a,b,c):
        p=a+b-c; aa,bb,cc=abs(p-a),abs(p-b),abs(p-c)
        return a if aa<=bb and aa<=cc else b if bb<=cc else c
    for y in range(h):
        filt=raw[pos]; row=bytearray(raw[pos+1:pos+1+stride]); pos+=stride+1
        for x in range(stride):
            a=row[x-bpp] if x>=bpp else 0; b=previous[x]; c=previous[x-bpp] if x>=bpp else 0
            if filt==1: row[x]=(row[x]+a)&255
            elif filt==2: row[x]=(row[x]+b)&255
            elif filt==3: row[x]=(row[x]+((a+b)//2))&255
            elif filt==4: row[x]=(row[x]+paeth(a,b,c))&255
            elif filt!=0: raise ValueError('Unknown PNG filter')
        rows.append(row); previous=row
    return w,h,bpp,rows,ancillary


def png_write(path,w,h,bpp,rows,ancillary=()):
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    result=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6 if bpp==4 else 2,0,0,0))
    for typ,body in ancillary:
        if typ in {b'gAMA',b'cHRM',b'sRGB',b'iCCP'}: result+=chunk(typ,body)
    result+=chunk(b'IDAT',zlib.compress(b''.join(b'\x00'+bytes(row) for row in rows),6))+chunk(b'IEND',b'')
    Path(path).write_bytes(result)


def join_preview(left,right,destination):
    a=png_read(left); b=png_read(right)
    assert a[1]==b[1]==1000 and a[2]==b[2] and a[0]+b[0]==1600
    rows=[a[3][i]+b[3][i] for i in range(a[1])]
    png_write(destination,1600,1000,a[2],rows,a[4])


def contact_sheet():
    import numpy as np
    files=[OUT/'previews'/(name+'.png') for name in ASSETS]
    if not all(p.exists() for p in files): return
    columns=3; tw,th=600,375; count=math.ceil(len(files)/columns)
    canvas=np.full((count*th,columns*tw,4),255,dtype=np.uint8)
    for i,path in enumerate(files):
        w,h,bpp,rows,metadata=png_read(path)
        pix=np.frombuffer(b''.join(rows),dtype=np.uint8).reshape(h,w,bpp)
        thumb=pix[np.linspace(0,h-1,th).astype(int)[:,None],np.linspace(0,w-1,tw).astype(int)[None,:]]
        canvas[i//columns*th:(i//columns+1)*th,i%columns*tw:(i%columns+1)*tw,:bpp]=thumb
    png_write(OUT/'previews'/'DR_ContactSheet.png',columns*tw,count*th,4,[row.tobytes() for row in canvas],metadata)


def render_previews(scene,names):
    temp=OUT/'previews'/'.views'; temp.mkdir(parents=True,exist_ok=True)
    for index,name in enumerate(names):
        log('Preview %d/%d: %s'%(index+1,len(names),name))
        # A small reversible deformation demonstrates the blank paper's usable
        # topology. The saved asset always returns to its flat rest shape.
        papers=[]
        if name=='DR_Paper':
            for obj in ASSETS[name]['collection'].all_objects:
                if obj.type=='MESH' and obj.data.shape_keys:
                    key=obj.data.shape_keys.key_blocks['DR_Hanging_Curl']; papers.append((key,key.value)); key.value=.65
        paths=[]
        try:
            for macro in [False,True]:
                configure_preview(scene,name,macro)
                path=temp/(name+('_macro' if macro else '_threequarter')+'.png')
                paths.append(path); scene.render.filepath=str(path)
                started=time.time()
                bpy.ops.render.render(write_still=True,scene=scene.name)
                log('Rendered %s %s in %.1fs'%(name,'macro' if macro else '3/4',time.time()-started))
            join_preview(paths[0],paths[1],OUT/'previews'/(name+'.png'))
            for path in paths: path.unlink()
        finally:
            for key,value in papers: key.value=value
    if temp.exists() and not list(temp.iterdir()): temp.rmdir()
    contact_sheet()


def validate_assets():
    assert SCENE.world is None and SCENE.camera is None
    assert all(o.type not in {'CAMERA','LIGHT'} for o in SCENE.objects)
    report={'blender_version':bpy.app.version_string,'units':'metres','asset_scene':SCENE.name,
            'asset_scene_has_lights_cameras_world':False,'families':{},'checks':{}}
    for group in [bpy.data.objects,bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.collections,bpy.data.scenes]:
        assert all(x.name.startswith('DR_') for x in group),[x.name for x in group if not x.name.startswith('DR_')]
    assert all(im.packed_file or im.source in {'GENERATED','VIEWER'} or im.type=='RENDER_RESULT' for im in bpy.data.images)
    for mat in bpy.data.materials:
        shaders=[n.bl_idname for n in mat.node_tree.nodes if n.type in {'BSDF_PRINCIPLED','BSDF_DIFFUSE','BSDF_GLOSSY','BSDF_GLASS','BSDF_TRANSPARENT','EMISSION','VOLUME_ABSORPTION','VOLUME_SCATTER','VOLUME_PRINCIPLED'}]
        assert shaders==['ShaderNodeBsdfPrincipled'],(mat.name,shaders)
    for name in ['DR_Paper_8x10','DR_Paper_10x8']:
        obj=bpy.data.objects[name]
        assert len(obj.data.polygons)==12800 and all(len(p.vertices)==4 for p in obj.data.polygons)
        uv=obj.data.uv_layers[0]
        mins=[min(p.uv[k] for p in uv.data) for k in (0,1)]; maxs=[max(p.uv[k] for p in uv.data) for k in (0,1)]
        assert mins==[0,0] and maxs==[1,1]
        assert abs(obj.modifiers['DR_0300mm_Fibre_Base'].thickness-.0003)<1e-9
        assert max(v.co.z for v in obj.data.vertices)<1e-6
    helper=bpy.data.objects['DR_Tray_LiquidBounds']
    was_hidden=helper.hide_get(); helper.hide_set(False); bpy.context.view_layer.update()
    evaluated=helper.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me=evaluated.to_mesh(); bm=bmesh.new(); bm.from_mesh(me)
    bad=sum(not edge.is_manifold for edge in bm.edges); vol=abs(bm.calc_volume(signed=True))
    assert bad==0 and .0028<vol<.0041,(bad,vol)
    assert abs(max(v.co.z for v in bm.verts)-.0385)<1e-6
    bm.free(); evaluated.to_mesh_clear(); helper.hide_set(was_hidden)
    report['checks'].update(all_names_prefixed=True,materials_principled_only=True,images_self_contained=True,
                            paper_grids='100 x 128 quads each',paper_uv='full 0..1; portrait axis convention',
                            paper_thickness_m=.0003,liquid_bounds_manifold=True,liquid_volume_litres=vol*1000,
                            liquid_surface_z_m=.0385,liquid_depth_above_floor_m=.035,
                            timer_text_exception='0..55 numerals only; user approved')
    for name,cfg in ASSETS.items():
        lo,hi=object_bounds(cfg['collection']); cfg['bounds']=[list(lo),list(hi)]
        objects=list(cfg['collection'].all_objects)
        record={k:v for k,v in cfg.items() if k not in {'root','collection'}}
        record['root']=cfg['root'].name; record['objects']=len(objects)
        record['base_mesh_vertices']=sum(len(o.data.vertices) for o in objects if o.type=='MESH')
        record['dimensions_m']=list(hi-lo)
        report['families'][name]=record
    assert .07<report['families']['DR_Clothespin']['dimensions_m'][0]<.08
    assert .19<report['families']['DR_Tongs']['dimensions_m'][1]<.22
    assert 1.99<report['families']['DR_Line']['dimensions_m'][0]<2.01
    assert max(report['families']['DR_Bottles']['dimensions_m'])<.6
    return report


def pack_references():
    for filename,label in [('01-safelight.png','Safelight'),('02-developing.png','Developing'),('03-lights-on.png','LightsOn')]:
        path=OUT/'references'/filename
        if path.exists():
            image=bpy.data.images.load(str(path),check_existing=False)
            image.name='DR_Reference_'+label; image.pack(); image.use_fake_user=True


def write_gallery():
    entries='\n'.join('<article><h2>'+name+'</h2><a href="previews/'+name+'.png"><img src="previews/'+name+'.png" loading="lazy" alt="'+name+' three-quarter and macro Cycles preview"></a></article>' for name in ASSETS)
    html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Darkroom assets</title><style>
body{margin:0;background:#e9e7e2;color:#272722;font:15px system-ui,sans-serif}header,main{max-width:1440px;margin:auto;padding:32px}h1{font-size:36px;margin:0 0 10px}p{line-height:1.6}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:28px;padding-top:0}article{background:#f5f4f0;padding:14px;border:1px solid #d6d3ca;border-radius:4px}h2{font-size:16px;font-weight:500;margin:0 0 12px}img{display:block;width:100%;height:auto}a{color:inherit}code{font-family:monospace}@media(max-width:550px){main{display:block;padding:16px}article{margin-bottom:20px}header{padding:24px}}</style><header><h1>Darkroom / Asset library</h1><p>Blender 5.2 · metres · Cycles · 11 prop families<br>Each image: 3/4 overview on the left, 70–100 mm macro inspection on the right. Click to view at 1600 × 1000.</p><p><a href="darkroom_assets.blend">Asset file</a> · <a href="build_assets.py">Build script</a> · <a href="README.md">Assembly notes</a></p></header><main>'''+entries+'</main></html>'
    (OUT/'preview_gallery.html').write_text(html,encoding='utf8')


def restore_saved_view():
    bpy.context.window.scene=SCENE
    SCENE.world=None; SCENE.camera=None
    def clear_nested(layer):
        layer.exclude=False; layer.hide_viewport=False
        for child in layer.children: clear_nested(child)
    for layer in SCENE.view_layers:
        for child in layer.layer_collection.children:
            clear_nested(child)
            # Eye visibility, not recursive exclusion: opening a family in the
            # Outliner must reveal its nested variants and Boolean operands.
            child.hide_viewport=child.name!='DR_Tray'
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=.75
            area.spaces.active.region_3d.view_location=(0,0,.025)
            area.spaces.active.clip_start=.0001


def main():
    global SCENE,COL,ROOT
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-previews',action='store_true')
    parser.add_argument('--preview-only',help='Reopen existing asset file and render one family, comma-separated families, or all.')
    parser.add_argument('--samples',type=int,default=96)
    parser.add_argument('--cpu',action='store_true')
    args=parser.parse_args(argv)
    if bpy.app.version[:2]!=(5,2):
        raise RuntimeError('Use Blender 5.2.x; found '+bpy.app.version_string)
    OUT.mkdir(parents=True,exist_ok=True); (OUT/'previews').mkdir(exist_ok=True)
    started=time.time()
    if args.preview_only:
        bpy.ops.wm.open_mainfile(filepath=str(OUT/'darkroom_assets.blend'))
        SCENE=bpy.data.scenes['DR_Assets']
        report=json.loads(bpy.data.texts['DR_AssetManifest'].as_string())
        for name,record in report['families'].items():
            ASSETS[name]=dict(record,collection=bpy.data.collections[name],root=bpy.data.objects[record['root']])
        preview=bpy.data.scenes['DR_Preview']; bpy.context.window.scene=preview
        setup_cycles(preview,args.samples,args.cpu)
        names=list(ASSETS) if args.preview_only=='all' else args.preview_only.split(',')
        for name in names:
            if name not in ASSETS: raise ValueError('Unknown family: '+name)
        render_previews(preview,names); write_gallery()
        log('Selected previews complete in %.1fs'%(time.time()-started))
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    SCENE=bpy.context.scene; SCENE.name='DR_Assets'; SCENE.view_layers[0].name='DR_Assets_ViewLayer'
    SCENE.unit_settings.system='METRIC'; SCENE.unit_settings.scale_length=1; SCENE.unit_settings.length_unit='METERS'
    SCENE.world=None
    for w in list(bpy.data.worlds): bpy.data.worlds.remove(w)
    materials()
    for builder in [build_tray,build_tongs,build_paper,build_clothespin,build_line,build_sink,build_timer,build_safelight,build_bottles,build_enlarger,build_shelf]:
        log(builder.__name__); builder()
    pack_references()
    report=validate_assets()
    principled('DR_PreviewGrey',(.185,.185,.185),.59)
    preview=make_preview_scene(args.samples,args.cpu)
    configure_preview(preview,'DR_Tray',False)
    report['preview_spec']={'width':1600,'height':1000,'left':'1000px three-quarter view','right':'600px macro view',
                            'engine':'CYCLES','samples':args.samples,'device':preview.cycles.device,
                            'macro_lens_mm':[70,100],'macro_distance_m':[.20,.40]}
    report['art_direction']='Form/material target: three supplied keyframes. Lighting and print animation are outside asset scope.'
    text=bpy.data.texts.new('DR_AssetManifest'); text.write(json.dumps(report,indent=2))
    source=bpy.data.texts.new('DR_build_assets.py'); source.write(Path(__file__).read_text(encoding='utf8'))
    (OUT/'asset_manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    restore_saved_view()
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'darkroom_assets.blend'),compress=True)
    log('Saved darkroom_assets.blend; validation checks passed')
    if not args.no_previews:
        bpy.context.window.scene=preview
        render_previews(preview,list(ASSETS))
        configure_preview(preview,'DR_Tray',False)
        restore_saved_view()
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'darkroom_assets.blend'),compress=True)
    write_gallery()
    log('Complete in %.1fs'%(time.time()-started))


if __name__=='__main__':
    main()

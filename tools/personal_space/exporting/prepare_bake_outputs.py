"""Convert linear EXR bakes to scaled data PNGs and portable UV JSON sidecars."""
from pathlib import Path
import json
import bpy
import numpy as np
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/material-optimization/bake'
manifest=json.loads((OUT/'manifest.json').read_text())
model=json.loads((ROOT/'output/material-optimization/baseline/model.json').read_text())
def coverage(mi,size):
    mask=np.zeros((size,size),bool)
    for spec in manifest['uv']:
        if model['meshes'][spec['mesh']]['primitives'][spec['primitive']]['material']!=int(mi):continue
        triangles=np.load(ROOT/spec['file'])['uv'].reshape(-1,3,2).copy()
        triangles[:,:,1]=1-triangles[:,:,1];triangles=triangles*size-.5
        for tri in triangles:
            lo=np.maximum(np.floor(tri.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(tri.max(axis=0)).astype(int),size-1)
            if np.any(hi<lo):continue
            y,x=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];p=np.stack([x,y],axis=2)
            edges=[]
            for i in range(3):
                a,b=tri[i],tri[(i+1)%3];edges.append((b[0]-a[0])*(p[:,:,1]-a[1])-(b[1]-a[1])*(p[:,:,0]-a[0]))
            e=np.stack(edges);inside=(e>=-1e-5).all(axis=0)|(e<=1e-5).all(axis=0)
            mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1]|=inside
    for _ in range(8):
        padded=np.pad(mask,1);mask=padded[1:-1,1:-1]|padded[:-2,1:-1]|padded[2:,1:-1]|padded[1:-1,:-2]|padded[1:-1,2:]
    return mask
for mi,record in manifest['materials'].items():
    for channel in ['ao','indirect']:
        spec=record[channel];image=bpy.data.images.load(str(ROOT/spec['file']),check_existing=False)
        image.colorspace_settings.name='Non-Color'
        values=np.empty(image.size[0]*image.size[1]*4,np.float32);image.pixels.foreach_get(values)
        values=values.reshape(image.size[1],image.size[0],4)
        scale=max(1.,float(values[:,:,:3].max())) if channel=='indirect' else 1.
        values[:,:,:3]/=scale
        if channel=='ao':
            # Uncovered atlas pixels are neutral, not black occluders.
            values[:,:,:3][~coverage(mi,image.size[0])]=1
        output=bpy.data.images.new('Portable_%s_%s'%(mi,channel),width=image.size[0],height=image.size[1],float_buffer=True,alpha=False)
        output.colorspace_settings.name='Non-Color';output.pixels.foreach_set(values.ravel())
        path=OUT/('material-%s-%s.png'%(mi,channel));output.filepath_raw=str(path);output.file_format='PNG';output.save()
        spec['png']=str(path.relative_to(ROOT));spec['scale']=scale
    print('PREPARED',mi,flush=True)
for spec in manifest['uv']:
    arrays=np.load(ROOT/spec['file']);path=(ROOT/spec['file']).with_suffix('.json')
    path.write_text(json.dumps({k:arrays[k].tolist() for k in arrays.files},separators=(',',':')))
    spec['json']=str(path.relative_to(ROOT))
(OUT/'portable.json').write_text(json.dumps(manifest,indent=2)+'\n')

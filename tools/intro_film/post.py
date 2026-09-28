"""Film finish for the style frames: bloom + halation, grade, lens, vignette, grain.

python3 post.py in.png out.png --grade red|light
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
grade = sys.argv[sys.argv.index('--grade') + 1] if '--grade' in sys.argv else 'red'

im = Image.open(src).convert('RGB')
W, H = im.size
x = np.asarray(im, np.float32) / 255.0
lin = x ** 2.2


def _box(a, k, axis):
    if k < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (k + 1, k)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * k + 1, 2 * k + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * k + 1)


def blur(a, r):
    """Gaussian-ish blur of radius r px: downsample, three box passes, upsample."""
    f = max(1, int(r // 6))
    h, w = a.shape[0] // f, a.shape[1] // f
    small = np.stack([np.asarray(Image.fromarray(a[..., c], 'F').resize((w, h), Image.BILINEAR)) for c in range(3)], -1)
    k = max(1, int(round(r / f / 1.7)))
    for _ in range(3):
        small = _box(_box(small, k, 0), k, 1)
    return np.stack([np.asarray(Image.fromarray(small[..., c].astype(np.float32), 'F').resize((a.shape[1], a.shape[0]), Image.BILINEAR)) for c in range(3)], -1)


# bloom from highlights; halation (film's red-orange glow around bright edges)
lum = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
hi = lin * np.clip((lum - 0.32) / 0.6, 0, 1)[..., None]
bloom = blur(hi, W * 0.005) * 0.16 + blur(hi, W * 0.025) * 0.10
halation = blur(hi, W * 0.01) * np.array([1.0, 0.28, 0.12], np.float32) * 0.14
lin = lin + bloom + halation

# grade
if grade == 'red':
    # pull the orange of AgX back to the loader's oxblood: less green, deeper low end,
    # and a floor that is warm, not dead black
    l2 = (lin @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    lin = lin * 0.82
    lin = lin * 0.86 + l2 * 0.82 * 0.14            # a little chroma back out
    lin = lin * np.array([1.0, 0.9, 0.93], np.float32)
    floor = np.array([0.0042, 0.0013, 0.0011], np.float32)
else:
    # lights on: paper warm, blacks the Index's ink, a trace of red left in the shadows
    lin = lin * np.array([1.0, 0.975, 0.93], np.float32)
    floor = np.array([0.0026, 0.0018, 0.0016], np.float32)
lin = floor + lin * (1 - floor)

# lateral chromatic aberration: R slightly larger, B slightly smaller around centre
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = (W - 1) / 2, (H - 1) / 2


def scale_channel(ch, s):
    sx = cx + (xx - cx) / s
    sy = cy + (yy - cy) / s
    xi = np.clip(sx.round().astype(int), 0, W - 1)
    yi = np.clip(sy.round().astype(int), 0, H - 1)
    return ch[yi, xi]


lin[..., 0] = scale_channel(lin[..., 0], 1.0012)
lin[..., 2] = scale_channel(lin[..., 2], 0.9988)

# vignette
r2 = ((xx - cx) / cx) ** 2 * 0.8 + ((yy - cy) / cy) ** 2 * 0.6
lin *= (1 - 0.42 * np.clip(r2, 0, 1.6) ** 1.3)[..., None]

out = np.clip(lin, 0, None) ** (1 / 2.2)
out = out / (1 + np.maximum(out - 0.85, 0) * 0.9)  # soft shoulder

# grain: luminance-weighted, slightly soft, strongest in the mids
rng = np.random.default_rng(7)
g = rng.normal(0, 1, (H, W)).astype(np.float32)
g = (g + np.roll(g, 1, 0) * 0.5 + np.roll(g, 1, 1) * 0.5) / 1.5
l = out.mean(axis=2)
amp = 0.032 * (0.35 + 1.4 * l * (1 - l))
out = out + (g * amp)[..., None]

Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
print('post', dst)

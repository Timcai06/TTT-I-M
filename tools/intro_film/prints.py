"""Turn source photos into darkroom prints: silver-gelatin B&W with a paper border,
at any development stage p (0 = blank sheet, 1 = fully developed).

Shadows come up first, then midtones, highlights last, the way a print develops.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'apps/landing/public'
OUT = ROOT / 'art/intro-film/work/prints'

# Source photos, straight from the site's own public assets.
SOURCES = {
    'tim': 'portrait/tim.jpg',
    'about_me': 'portrait/about_me.jpg',
    'football-action': 'life/football-action.webp',
    'football-portrait': 'life/football-portrait.webp',
    'shanghai-skyline': 'life/shanghai-skyline.webp',
    'night-portrait': 'life/night-portrait.webp',
    'tui-product': 'projects/sciscope/tui-product.webp',
}

PAPER = np.array([0.93, 0.915, 0.88])   # warm fibre base, ~#eae7df
INK = np.array([0.075, 0.072, 0.065])    # ~#111210


def load_gray(name, crop=None):
    im = Image.open(PUBLIC / SOURCES[name]).convert('RGB')
    if crop:
        im = im.crop(crop)
    g = np.asarray(im.convert('L'), dtype=np.float32) / 255.0
    return g


def print_sheet(gray, p, sheet=(2030, 2540), border=0.06, align=0.5):
    """gray: 0..1 luminance. Returns an RGB print on a portrait sheet."""
    H, W = sheet[1], sheet[0]
    b = int(W * border)
    iw, ih = W - 2 * b, H - 2 * b
    img = Image.fromarray((gray * 255).astype(np.uint8)).convert('L')
    # cover-fit into the image window
    s = max(iw / img.width, ih / img.height)
    img = img.resize((int(img.width * s + 1), int(img.height * s + 1)), Image.LANCZOS)
    left = int((img.width - iw) * align)
    top = (img.height - ih) // 2
    img = img.crop((left, top, left + iw, top + ih))
    g = np.asarray(img, dtype=np.float32) / 255.0
    # print contrast: grade 3-ish curve
    g = np.clip((g - 0.04) / 0.9, 0, 1) ** 1.15
    density = 1.0 - g                       # 1 = full black
    # development: each density arrives at its own time; darker first.
    arrive = 0.15 + 0.7 * (1.0 - density)   # shadows arrive ~0.15, highlights ~0.85
    k = np.clip((p - arrive) / 0.5, 0, 1)
    k = k * k * (3 - 2 * k)
    d = density * k
    full = np.ones((H, W), np.float32) * 0.0
    full[b:b + ih, b:b + iw] = d
    # the tiniest fog/unevenness in development
    rng = np.random.default_rng(3)
    noise = Image.fromarray((rng.random((H // 16, W // 16)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    nz = (np.asarray(noise, np.float32) / 255 - 0.5) * 0.04 * min(1.0, p * 2)
    full = np.clip(full + nz * (full > 0.01), 0, 1)
    rgb = PAPER[None, None, :] * (1 - full[..., None]) + INK[None, None, :] * full[..., None]
    return Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        'football_p45': ('football-action', 0.45, None),
        'football_p60': ('football-action', 0.6, None),
        'football_p100': ('football-action', 1.0, None),
        'skyline_p100': ('shanghai-skyline', 1.0, None),
        'night_p100': ('night-portrait', 1.0, None),
        'aboutme_p100': ('about_me', 1.0, None),
        'tim_p100': ('tim', 1.0, (0, 0, 1212, 1070)),
        'sciscope_p100': ('tui-product', 1.0, None),
        'blank': ('tim', 0.0, None),
    }
    for key, (name, p, crop) in jobs.items():
        sheet = (2540, 2030) if name in ('football-action', 'shanghai-skyline', 'tui-product') else (2030, 2540)
        print_sheet(load_gray(name, crop), p, sheet=sheet, align=1.0 if name == 'tim' else 0.5).save(OUT / f'{key}.png')
        print(key)

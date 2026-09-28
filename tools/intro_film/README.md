# tools/intro_film

The scripts that make the intro film. The source material, decisions and deliverables live in
[`art/intro-film/`](../../art/intro-film/README.md). Run everything from the repo root.

Requires Blender 5.2 (Cycles on Metal), Python 3 with numpy + Pillow, and ffmpeg.

| Script | What it does |
| --- | --- |
| `prints.py` | Turns photos from `apps/landing/public/` into darkroom prints (B&W fibre paper with a border) at any development stage, written to `art/intro-film/work/prints/`. |
| `scene.py` | Builds the darkroom in Blender and renders one shot. At the moment it holds the three style frames (placeholder props); it gets rebuilt around the GPT-delivered assets. |
| `post.py` | Film finish: bloom and halation, grade (`red` safelight / `light` lights-on), lateral chromatic aberration, vignette, grain. |

```bash
python3 tools/intro_film/prints.py
blender -b -P tools/intro_film/scene.py -- shot=2 res=100 samples=256
python3 tools/intro_film/post.py art/intro-film/work/renders/shot2.png out.png --grade red
```

`scene.py` arguments: `shot` (1 safelight · 2 developing · 3 lights on), `res` (percent of
1920×1080), `samples`, `out`, and lighting overrides `safe`, `safeglow`, `work`, `ev`.

A full-resolution frame at 256 samples takes about 20 s on this machine.

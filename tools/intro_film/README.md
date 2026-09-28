# tools/intro_film

The scripts that make the intro film. The source material, decisions and deliverables live in
[`art/intro-film/`](../../art/intro-film/README.md). Run everything from the repo root.

Requires Blender 5.2 (Cycles on Metal), Python 3 with numpy + Pillow, and ffmpeg.

| Script | What it does |
| --- | --- |
| `timing.py` | The film's clock: 24 fps, 80 BPM, the six cuts, the bell, the switch, the flicker. Both the picture and the sound read it. |
| `prints.py` | Turns photos from `apps/landing/public/` into darkroom prints (B&W fibre paper with a border) in `art/intro-film/work/prints/`. The three that develop in the tray are printed lighter so they read under red. |
| `film.py` | Builds the darkroom from the GPT asset library (`art/intro-film/assets/darkroom_assets.blend`), animates the six shots and renders frames. The developer's ripples come from a 2-D wave simulation; prints develop in a shader, with shadows arriving first behind a mottled front. |
| `sound.py` | Synthesises the score (felt piano and pad, D minor into D major) and the sound design (room tone, timer, liquid, bell, switch, tube light). No samples, no licensed music. |
| `post.py` | Film finish: bloom and halation, grade (safelight → lights on), lateral chromatic aberration, vignette, grain. |
| `finish.py` | Grades every frame and encodes H.264 + AAC with the mix to `apps/landing/public/projects/film/darkroom.mp4`. |
| `scene.py` | The first round of style frames, with placeholder props. Kept for reference. |

## Making the film

```bash
python3 tools/intro_film/prints.py
python3 tools/intro_film/sound.py
blender -b --factory-startup -P tools/intro_film/film.py -- frames=0-341 res=25 samples=8 mb=0 out=art/intro-film/work/animatic   # timing check, ~10 min
blender -b --factory-startup -P tools/intro_film/film.py -- frames=0-341 res=100 samples=96 mb=1                                   # final, ~2 h
python3 tools/intro_film/finish.py
```

`film.py` also takes `still=40,130` for single frames, and lighting overrides
`e_safe`, `e_key`, `e_fill`, `e_tray`, `e_filter`, `e_work`, `e_tube`. Every frame is a pure function of
its number, so a crashed render resumes with `frames=<next>-341`.

A final frame takes about 20 s on this machine. The first frame of a run takes about 100 s, most
of it compiling kernels.

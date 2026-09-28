# tools/project_films

Code-made project films for the Work chapter, written in [Remotion](https://www.remotion.dev)
(React → video). This is a standalone npm project: not a workspace, not part of the site build.

| Film | Composition | Accent | Length |
| --- | --- | --- | --- |
| EduCanvas | `src/educanvas/EduCanvas.tsx` | `#8192d8` | 24 s |
| SciScope (replaces the current 30 s concept film) | `src/sciscope/SciScope.tsx` | `#8ecfce` | 24 s |

Both films use one template (`src/ui/`):
- the site's ink/paper palette, Playfair + Noto Serif SC + JetBrains Mono, and the site's grain;
- five beats at 90 BPM (a beat is 20 frames at 30 fps): the question → the real UI → the request
  (an accent dot) crossing the system → the result → the end card;
- the dot lands as the full stop of the project's name.

Screenshots and photos come straight from `apps/landing/public/` (`remotion.config.ts` sets the
public dir), so the films always show the same material the site does.

**Before publishing SciScope:** its claim, evidence sentence and paper/chunk ids are illustrative.
Replace them with a real SciScope session. The numbers (159,187 papers, 367,773 chunks) are the
project's own.

## Make them

```bash
cd tools/project_films && npm install
npm run studio               # scrub and edit in the browser (30 fps compositions)
npm run sound                # out/{educanvas,sciscope}-mix.wav, from tools/intro_film/sound.py's instruments
npm run render:educanvas     # render.sh: 120 fps sub-frames → 180° shutter motion blur → 30 fps + score
```

`render.sh` renders the `<Film>-sub` composition, which freezes the 30 fps film at four
sub-frames per frame, and lets ffmpeg average them into real motion blur. Remotion's own
`CameraMotionBlur` stacks layers with `plus-lighter` and shifted this film towards red, which is
why it is not used.


Remotion is free for individuals and companies of up to three people (see its license).

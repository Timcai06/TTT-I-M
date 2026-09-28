"""Frames + sound → the film the site plays.

    python3 tools/intro_film/finish.py [frames=art/intro-film/work/frames] [out=apps/landing/public/projects/film]

Grades every rendered frame (post.finish), following the white light as it stutters on, then
encodes H.264 + AAC with the mixed track from sound.py.

The grain here is light on purpose: grain is noise, noise does not compress, and the site already
lays its own film grain over everything.
"""
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from post import finish  # noqa: E402
from timing import FLICKER, FPS, N_FRAMES, SWITCH  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ARGS = dict(a.split('=', 1) for a in sys.argv[1:])
FRAMES = ROOT / ARGS.get('frames', 'art/intro-film/work/frames')
GRADED = ROOT / 'art/intro-film/work/graded'
AUDIO = ROOT / 'art/intro-film/work/audio/mix.wav'
OUT = ROOT / ARGS.get('out', 'apps/landing/public/projects/film')
NAME = ARGS.get('name', 'darkroom')


def light_mix(f):
    """How far the grade has moved from safelight to white: it follows the tube, a little behind."""
    if f < SWITCH:
        return 0.0
    i = f - SWITCH
    level = FLICKER[i] if i < len(FLICKER) else 1.0
    return min(1.0, level * 0.85 + 0.15 * min(1.0, i / 12))


def grade_one(f):
    src = FRAMES / f'f{f:04d}.png'
    dst = GRADED / f'g{f:04d}.png'
    finish(Image.open(src), light_mix(f), grain=float(ARGS.get('grain', 0.014)), seed=f).save(dst)
    return f


def main():
    GRADED.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    frames = [f for f in range(N_FRAMES) if (FRAMES / f'f{f:04d}.png').exists()]
    missing = N_FRAMES - len(frames)
    if missing:
        print(f'warning: {missing} frames missing; encoding what exists')
    with ProcessPoolExecutor() as pool:
        for f in pool.map(grade_one, frames):
            if f % 24 == 0:
                print('graded', f, flush=True)
    mp4 = OUT / f'{NAME}.mp4'
    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
           '-framerate', str(FPS), '-i', str(GRADED / 'g%04d.png'),
           '-i', str(AUDIO),
           '-c:v', 'libx264', '-preset', 'slow', '-crf', ARGS.get('crf', '19'), '-pix_fmt', 'yuv420p',
           '-profile:v', 'high', '-tune', 'film', '-x264-params', 'keyint=48:min-keyint=24',
           '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
           '-shortest', '-movflags', '+faststart', str(mp4)]
    subprocess.run(cmd, check=True)
    print('wrote', mp4, f'{mp4.stat().st_size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()

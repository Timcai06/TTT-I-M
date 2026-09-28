"""Score and sound design for the project films, from the same instruments as the intro film.

    python3 tools/project_films/sound.py [educanvas|sciscope|pitch …]  →  tools/project_films/out/<name>-mix.wav

24 s at 90 BPM (a beat is 20 frames at 30 fps). Every cue below is placed at the frame where the
picture does the thing (see src/educanvas/EduCanvas.tsx and src/sciscope/SciScope.tsx).
I cannot listen to this; the report prints loudness and peak, the rest is Tim's call.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / 'intro_film'))
import sound as S  # noqa: E402  (the intro film's instruments; importing it renders nothing)
from sound import layer  # noqa: E402

SR = S.SR
FPS = 30
DUR = 24.0
N = int(DUR * SR)
BEAT = 60 / 90
rng = np.random.default_rng(5)
OUT = HERE / 'out'


def t(frame):
    return frame / FPS


def buf(dur=DUR):
    return np.zeros((int(dur * SR), 2))


def key_click(level=0.05):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    click = S.bandpass(rng.normal(0, 1, n) * np.exp(-tt / 0.0025), 2600, 1.2)
    thock = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.012) * 0.35
    return level * (click + thock)


def whoosh(dur=0.6, level=0.08, rise=True):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    env = np.sin(np.pi * tt / dur) ** 2
    noise = rng.normal(0, 1, n) * env
    lo, hi = (500, 3500) if rise else (3500, 500)
    out = np.zeros(n)
    for i in range(8):
        a, b = i * n // 8, (i + 1) * n // 8
        fc = lo + (hi - lo) * (i + 0.5) / 8
        out[a:b] = S.bandpass(noise, fc, 1.6)[a:b]
    return level * out


def glass(freq, level=0.12):
    """A small glassy ping: a sine with a bright partial, short."""
    n = int(1.2 * SR)
    tt = np.arange(n) / SR
    return level * (np.sin(2 * np.pi * freq * tt) + 0.3 * np.sin(2 * np.pi * freq * 2.76 * tt)) * np.exp(-tt / 0.35) * np.clip(tt / 0.002, 0, 1)


def piano(buf_, frame, note, dur_beats=1.0, vel=0.25, bright=0.55, pan=0.0):
    S.place(buf_, S.stereo(S.felt_piano(S.hz(note), BEAT * dur_beats, vel, bright), pan), t(frame))


def pad(buf_, f0, f1, notes, level=0.1, cutoff=1400, attack=0.8, release=1.4):
    S.place(buf_, S.stereo(S.pad(notes, t(f0), t(f1), attack=attack, release=release, level=level, cutoff=cutoff), 0), t(f0))


def finish(music, sfx, name, dur=DUR, voice=None, duck=None):
    """Reverb, a gentle limiter, and (for the pitch film) the narration on top with the bed ducked under it."""
    n = len(music)
    mix = S.reverb(music, rt60=2.2, mix=0.3) + S.reverb(sfx, rt60=0.7, mix=0.15, dark=6000) * 0.9
    mix = S.highpass(mix, 30)
    fade = np.clip((dur - np.arange(n) / SR) / 1.2, 0, 1)[:, None]
    mix *= fade
    mix = np.tanh(mix / np.abs(mix).max() * 1.2) / np.tanh(1.2) * 0.89
    if voice is None:
        mix *= 10 ** (-5.0 / 20)
    else:
        # the bed sits under the voice, and dips a further 8 dB while someone is speaking
        mix *= 10 ** (-7.0 / 20) * (1 - (1 - 10 ** (-8.0 / 20)) * duck)[:, None]
        mix += voice
        mix = np.tanh(mix * 10 ** (3.3 / 20) / 0.98) * 0.98   # to about -16 LUFS integrated
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{name}-mix.wav'
    S.write_wav(path, mix)
    report = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                            capture_output=True, text=True).stderr
    lines = [l.strip() for l in report.splitlines() if l.strip().startswith(('I:', 'Peak:'))]
    print(name, ' | '.join(lines[-2:]))


def laps(frame):
    """Mirror of laps() in src/educanvas/EduCanvas.tsx: 3.25 accelerating laps from 240 to 350."""
    k = min(1.0, max(0.0, (frame - 240) / 110))
    return 3.25 * k ** 1.7


def educanvas():
    """v2: one protagonist, the dot; the loop has a heartbeat that speeds up with it."""
    m, s = buf(), buf()
    # A · the dot pulses on the beat; glyphs land on a pentatonic figure; the pen draws
    for f in (0, 20):
        S.place(s, S.stereo(glass(S.hz('F6'), 0.05), 0.0), t(f))
    for i, note in enumerate(['C5', 'D5', 'F5', 'G5', 'A5', 'G5', 'C6']):
        piano(m, 12 + i * 4, note, 0.8, 0.15 + 0.01 * i, 0.62, -0.3 + 0.1 * i)
    S.place(s, S.stereo(whoosh(0.7, 0.05), 0.1), t(46))
    pad(m, 0, 200, ['F2', 'C3', 'A3'], level=0.08, cutoff=900, attack=1.6)
    # B · the screen arrives out of depth; the dot becomes the caret; send; shockwave; fall
    S.place(s, S.stereo(whoosh(1.0, 0.07, rise=False), 0.0), t(58))
    S.place(m, S.stereo(S.thump(0.22, 60), 0), t(86))
    for i in range(12):
        S.place(s, S.stereo(key_click(0.045 + 0.012 * rng.random()), 0.15), t(116 + i * 4))
    S.place(s, S.stereo(key_click(0.1), 0.1), t(180))
    S.place(m, S.stereo(S.thump(0.34, 58), 0), t(180))
    S.place(s, S.stereo(glass(S.hz('A6'), 0.09), 0.2), t(181))
    S.place(s, S.stereo(whoosh(0.8, 0.07, rise=False), 0.0), t(184))
    # C · the ring is drawn; stations click in; a heartbeat that quickens with the laps
    S.place(s, S.stereo(whoosh(0.9, 0.06), -0.2), t(204))
    for i in range(6):
        S.place(s, S.stereo(S.tick(0.04), -0.5 + 0.2 * i), t(222 + i * 4))
    pad(m, 200, 300, ['D2', 'A2', 'F3', 'C4'], level=0.1, cutoff=1300, attack=0.4)
    pad(m, 300, 384, ['Bb1', 'F2', 'D3', 'A3', 'C4'], level=0.11, cutoff=1900, attack=0.15)
    beats = list(range(240, 300, 20)) + list(range(300, 330, 10)) + list(range(330, 352, 5))
    for i, f in enumerate(beats):
        S.place(m, S.stereo(S.thump(0.16 + 0.12 * i / len(beats), 62), 0), t(f))
    stations = [0, 60, 120, 180, 240, 300]
    notes = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6']
    prev = laps(239) * 360
    for f in range(240, 351):
        head = laps(f) * 360
        for k, a in enumerate(stations):
            for lap in range(4):
                target = a + 360 * lap
                if prev < target <= head:
                    S.place(s, S.stereo(glass(S.hz(notes[k]) * (1 + 0.5 * lap), 0.05), -0.6 + 0.24 * k), t(f))
        prev = head
    for i in range(3):                           # education snaps on: three mechanical clicks
        S.place(s, S.stereo(layer(key_click(0.12), S.tick(0.08)), -0.3 + 0.3 * i), t(304 + i * 8))
        S.place(m, S.stereo(S.thump(0.18, 90), 0), t(304 + i * 8))
    # the dot leaves on a tangent and opens the portal: riser, then the drop
    S.place(s, S.stereo(whoosh(0.9, 0.09), 0.0), t(344))
    S.place(m, S.stereo(S.thump(0.45, 48), 0), t(372))
    # D · the answer; numbers decode; colour ripples; relief; photo
    pad(m, 380, 460, ['C2', 'G2', 'E3', 'D4'], level=0.09, cutoff=1500, attack=0.5)
    S.place(s, S.stereo(glass(S.hz('E6'), 0.07), 0.2), t(436))
    for i in range(28):                           # decoding: a dense granular patter
        S.place(s, S.stereo(S.tick(0.018 + 0.01 * rng.random()), rng.uniform(-0.7, 0.7)), t(452 + i + rng.random()))
    pad(m, 460, 540, ['D2', 'A2', 'F3', 'C4', 'E4'], level=0.1, cutoff=1700, attack=0.4)
    for i in range(18):                           # colour ripples out from the centre
        S.place(s, S.stereo(glass(S.hz(['F5', 'A5', 'C6', 'E6'][i % 4]) * (1 + i // 8), 0.03), -0.8 + 1.6 * (i % 9) / 8), t(474 + i * 1.2))
    S.place(m, S.stereo(S.sine_swell(S.hz('A2'), 1.4, 0.05, trem=0.0), 0), t(482))
    S.place(m, S.stereo(S.thump(0.42, 52), 0), t(536))
    for k, note in enumerate(['F2', 'C3', 'A3', 'E4', 'G4']):
        piano(m, 536 + k, note, 3.2, 0.26 - 0.03 * k, 0.55, -0.3 + 0.15 * k)
    # E · focus: breath out
    pad(m, 552, 720, ['F2', 'C3', 'E3', 'A3'], level=0.075, cutoff=1000, attack=1.2, release=2.0)
    for f, note in ((578, 'A4'), (606, 'G4'), (630, 'C5')):
        piano(m, f, note, 1.6, 0.11, 0.45, 0.2)
    for f in range(600, 660, 24):                 # the caret blinking in the empty field
        S.place(s, S.stereo(S.tick(0.015), -0.3), t(f))
    # F · the name lands letter by letter; the full stop drops with a bounce
    for i in range(9):
        S.place(s, S.stereo(key_click(0.03), -0.4 + 0.1 * i), t(662 + i * 2))
    for k, note in enumerate(['F2', 'C4', 'F4', 'A4', 'G5']):
        piano(m, 664 + k, note, 3.0, 0.27 - 0.03 * k, 0.58, -0.3 + 0.15 * k)
    S.place(s, S.stereo(glass(S.hz('C7'), 0.11), 0.2), t(682))
    S.place(s, S.stereo(glass(S.hz('C7'), 0.04), 0.2), t(690))
    finish(m, s, 'educanvas')


def glide(f0, f1, dur, level=0.05):
    """A sine that slides from f0 to f1: the thread crossing languages."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (tt / dur)
    env = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.2
    return level * env * np.sin(2 * np.pi * np.cumsum(f) / SR)


def sciscope():
    """v2: the evidence thread. D minor that resolves to D major on the SUPPORTED stamp."""
    m, s = buf(), buf()
    # A · the question lands; the question mark's dot lets go
    for i in range(10):
        piano(m, 8 + i * 4, ['D5', 'E5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', 'A4', 'D5'][i], 0.7, 0.13, 0.6, -0.4 + 0.08 * i)
    S.place(s, S.stereo(glass(S.hz('A6'), 0.08), 0.3), t(52))
    pad(m, 0, 200, ['D2', 'A2', 'D3'], level=0.08, cutoff=800, attack=1.8)
    # B · the terminal arrives; /verify and the claim; enter; the plan streams; the claim lifts off
    S.place(s, S.stereo(whoosh(1.0, 0.07, rise=False), 0.0), t(84))
    S.place(m, S.stereo(S.thump(0.22, 60), 0), t(112))
    for i in range(8):
        S.place(s, S.stereo(key_click(0.045), -0.2), t(108 + i * 2))
    for i in range(len(CLAIM_ZH)):
        S.place(s, S.stereo(key_click(0.045 + 0.01 * rng.random()), -0.2), t(120 + i * 4))
    S.place(s, S.stereo(key_click(0.1), -0.1), t(170))
    S.place(m, S.stereo(S.thump(0.3, 58), 0), t(170))
    for i in range(2):
        S.place(s, S.stereo(glass(S.hz(['D6', 'F6'][i]), 0.05), 0.2), t(174 + i * 6))
    S.place(s, S.stereo(whoosh(0.9, 0.06), 0.0), t(184))
    # C · the field of papers; two beams sweep it in opposite directions; hits; fusion
    pad(m, 200, 300, ['D2', 'A2', 'F3', 'C4'], level=0.1, cutoff=1300, attack=0.4)
    pad(m, 300, 384, ['Bb1', 'F2', 'D3', 'A3'], level=0.11, cutoff=1700, attack=0.2)
    for i in range(30):                          # the field fades in: a fine granular shimmer
        S.place(s, S.stereo(glass(S.hz('A5') * (1 + 1.5 * rng.random()), 0.012), rng.uniform(-0.9, 0.9)), t(214 + i + rng.random()))
    for i in range(22):                          # counting
        S.place(s, S.stereo(S.tick(0.03), (i % 2) * 0.4 - 0.2), t(212 + 44 * (1 - (1 - i / 22) ** 2)))
    for k in range(6):                           # the FTS beam, left to right
        S.place(s, S.stereo(whoosh(0.25, 0.022), -0.9 + 0.36 * k), t(250 + k * 7))
    for k in range(6):                           # the vector beam, right to left
        S.place(s, S.stereo(whoosh(0.25, 0.02), 0.9 - 0.36 * k), t(256 + k * 7))
    for i, f in enumerate((262, 268, 275, 281, 288, 294)):
        S.place(s, S.stereo(glass(S.hz(['D6', 'E6', 'A6', 'C7', 'D7', 'F6'][i]), 0.05), -0.6 + 0.24 * i), t(f))
    for f in range(220, 300, 20):
        S.place(m, S.stereo(S.thump(0.15, 62), 0), t(f))
    for f in range(300, 340, 10):
        S.place(m, S.stereo(S.thump(0.19, 62), 0), t(f))
    S.place(s, S.stereo(whoosh(1.2, 0.07, rise=False), 0), t(300))
    for i in range(5):
        S.place(s, S.stereo(key_click(0.05), -0.1), t(325 + i * 3))
    S.place(s, S.stereo(glass(S.hz('D7'), 0.08), -0.1), t(344))
    # D · the paper opens; the phases tick; the thread crosses; SUPPORTED
    S.place(s, S.stereo(whoosh(0.9, 0.06, rise=False), 0.2), t(380))
    S.place(m, S.stereo(S.thump(0.3, 55), 0), t(380))
    pad(m, 380, 506, ['G2', 'D3', 'Bb3', 'E4'], level=0.1, cutoff=1500, attack=0.5)
    for i in range(7):
        S.place(s, S.stereo(S.tick(0.055), -0.6), t(402 + i * 11))
        S.place(s, S.stereo(glass(S.hz(['D5', 'E5', 'F5', 'G5', 'A5', 'C6', 'D6'][i]), 0.035), -0.6), t(402 + i * 11))
    S.place(s, S.stereo(glide(S.hz('A5'), S.hz('E6'), 1.1, 0.045), 0.3), t(454))
    S.place(s, S.stereo(whoosh(0.5, 0.04), 0.3), t(484))
    S.place(m, S.stereo(S.thump(0.5, 50), 0), t(506))
    S.place(s, S.stereo(layer(key_click(0.16), S.tick(0.1)), 0.35), t(506))
    pad(m, 506, 572, ['D2', 'A2', 'F#3', 'C#4', 'E4'], level=0.12, cutoff=2200, attack=0.08, release=1.6)
    for k, note in enumerate(['D3', 'A3', 'F#4', 'C#5']):
        piano(m, 507 + k, note, 3.0, 0.24 - 0.02 * k, 0.6, -0.2 + 0.15 * k)
    # E · the workflow track: the token changes at every station
    pad(m, 560, 720, ['D2', 'A2', 'F#3', 'E4'], level=0.085, cutoff=1400, attack=0.8, release=2.0)
    for i in range(16):
        S.place(s, S.stereo(key_click(0.02), -0.3 + 0.04 * i), t(562 + i * 1.2))
    prev = None
    for f in range(572, 646):
        st = min(4, int(max(0.0, min(1.0, (f - 572) / 68)) ** 1 * 4 + 0.5))
        if st != prev:
            S.place(s, S.stereo(glass(S.hz(['A5', 'D6', 'E6', 'F#6', 'A6'][st]), 0.06), -0.6 + 0.3 * st), t(f))
            prev = st
    # F · the name; the thread's head lands as its full stop
    for i in range(8):
        S.place(s, S.stereo(key_click(0.03), -0.4 + 0.1 * i), t(662 + i * 2))
    for k, note in enumerate(['D2', 'A3', 'D4', 'F#4', 'E5']):
        piano(m, 664 + k, note, 3.0, 0.27 - 0.03 * k, 0.58, -0.3 + 0.15 * k)
    S.place(s, S.stereo(glass(S.hz('A6'), 0.11), 0.2), t(682))
    S.place(s, S.stereo(glass(S.hz('A6'), 0.04), 0.2), t(690))
    finish(m, s, 'sciscope')


def educanvas_v3():
    """v3: one lesson. A pixel breathes; the numbers wake; a face; features; the product; one full stop.
    Cue frames mirror src/educanvas/v3/EduCanvasV3.tsx (780 frames, 26 s)."""
    D = 26.0
    m, s = buf(D), buf(D)
    # P1 · 0–89 · one pixel breathes on the beat, a little brighter each time; the number resolves
    pad(m, 0, 100, ['F2', 'C3'], level=0.06, cutoff=500, attack=2.2)
    for i, f in enumerate((6, 26, 46, 66)):
        S.place(s, S.stereo(glass(S.hz('F6'), 0.025 + 0.012 * i), 0.1), t(f))
    piano(m, 80, 'C5', 1.5, 0.12, 0.5, 0.1)
    # P2 · 90–269 · the field wakes under the camera: a granular patter that swells and thins
    S.place(s, S.stereo(whoosh(1.2, 0.05), -0.2), t(84))
    pad(m, 90, 280, ['F2', 'C3', 'A3', 'E4'], level=0.085, cutoff=1100, attack=1.4)
    for f in range(100, 262):
        dens = np.sin(np.pi * (f - 100) / 162) ** 1.5
        if rng.random() < 0.25 + 1.2 * dens:
            S.place(s, S.stereo(S.tick(0.006 + 0.012 * dens * rng.random()), rng.uniform(-0.8, 0.8)), t(f + rng.random()))
    for i, note in enumerate(['C5', 'D5', 'F5', 'G5', 'A5', 'G5', 'C6']):          # 「在计算机眼里，」 glyph by glyph
        piano(m, 160 + i * 2, note, 0.9, 0.1 + 0.01 * i, 0.55, -0.3 + 0.1 * i)
    # P3 · 270–389 · the crane up: the harmony opens, a low swell under the reveal; the sentence lands
    pad(m, 270, 392, ['Bb1', 'F2', 'D3', 'A3', 'C4', 'E4'], level=0.11, cutoff=1900, attack=0.8)
    S.place(m, S.stereo(S.sine_swell(S.hz('F2'), 2.2, 0.06, trem=0.0), 0), t(262))
    S.place(m, S.stereo(S.thump(0.28, 52), 0), t(290))
    for k, note in enumerate(['Bb2', 'F3', 'D4', 'A4', 'C5']):
        piano(m, 290 + k, note, 3.5, 0.2 - 0.02 * k, 0.55, -0.3 + 0.15 * k)
    # P4 · 390–539 · the features rise: a glass note per cluster, climbing
    S.place(s, S.stereo(whoosh(0.8, 0.05, rise=False), 0), t(384))
    pad(m, 390, 545, ['D2', 'A2', 'F3', 'C4', 'E4'], level=0.1, cutoff=1500, attack=0.4)
    notes = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6']
    for i in range(16):
        S.place(s, S.stereo(glass(S.hz(notes[i % 8]) * (1 + (i // 8)), 0.035), -0.7 + 1.4 * (i % 8) / 7), t(392 + i * 3.6))
    for i, note in enumerate(['A4', 'C5', 'D5']):                                    # 「AI 先找特征，再做判断。」
        piano(m, 410 + i * 6, note, 1.2, 0.1, 0.5, 0.2)
    # 540–629 · the product rises; the camera pushes in; the pen draws; correct
    S.place(s, S.stereo(whoosh(1.0, 0.07, rise=False), 0), t(532))
    S.place(m, S.stereo(S.thump(0.26, 56), 0), t(560))
    pad(m, 545, 632, ['F2', 'C3', 'G3', 'A3', 'E4'], level=0.1, cutoff=1700, attack=0.3)
    S.place(s, S.stereo(whoosh(0.9, 0.045), 0.1), t(568))                           # the push-in
    S.place(s, S.stereo(glide_pen(0.47), 0.2), t(594))                              # the underline
    S.place(s, S.stereo(layer(key_click(0.09), S.tick(0.05)), 0.3), t(606))         # 回答正确
    S.place(s, S.stereo(glass(S.hz('E6'), 0.07), 0.3), t(607))
    for i in range(10):                                                              # 掌握度 counts to 74%
        S.place(s, S.stereo(S.tick(0.012), 0.35), t(610 + i * 1.6))
    for i, note in enumerate(['C5', 'E5', 'G5']):                                    # 「学会了，系统也知道。」
        piano(m, 574 + i * 6, note, 1.4, 0.11, 0.5, -0.1)
    # P5 · 630–719 · the product falls away; the field goes dark; one pixel rises. Half a beat of silence.
    S.place(s, S.stereo(whoosh(0.8, 0.05, rise=False), 0), t(628))
    S.place(m, S.stereo(S.sine_swell(S.hz('C3'), 1.6, 0.04, trem=0.0), 0), t(636))
    S.place(s, S.stereo(whoosh(1.1, 0.035), 0.2), t(650))
    # 690–779 · the name lands letter by letter; the full stop hops once
    for i in range(9):
        S.place(s, S.stereo(key_click(0.03), -0.4 + 0.1 * i), t(690 + i * 2))
    S.place(m, S.stereo(S.thump(0.4, 48), 0), t(690))
    for k, note in enumerate(['F2', 'C4', 'F4', 'A4', 'G5']):
        piano(m, 690 + k, note, 4.5, 0.27 - 0.03 * k, 0.58, -0.3 + 0.15 * k)
    S.place(s, S.stereo(glass(S.hz('C7'), 0.1), 0.3), t(706))
    S.place(s, S.stereo(glass(S.hz('C7'), 0.035), 0.3), t(716))
    pad(m, 700, 780, ['F2', 'C3', 'E3', 'A3', 'G4'], level=0.075, cutoff=1000, attack=0.6, release=2.5)
    finish(m, s, 'educanvas-v3', dur=D)


def glide_pen(dur, level=0.05):
    """The pen's stroke: a short bright band of noise that moves left to right."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    env = np.sin(np.pi * tt / dur) ** 1.5
    noise = S.bandpass(rng.normal(0, 1, n), 4200, 1.4) * env
    return level * noise


# ───────────────────────── the competition film (src/pitch/Pitch.tsx) ─────────────────────────
CUES = json.loads((HERE / 'src/pitch/cues.json').read_text())
VOICE = OUT / 'voice'


def bezier(x1, y1, x2, y2):
    """CSS cubic-bezier easing, as Remotion's Easing.bezier: solve x(t) = u, return y(t)."""
    def ease(u):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            t_ = (lo + hi) / 2
            x = 3 * (1 - t_) ** 2 * t_ * x1 + 3 * (1 - t_) * t_ ** 2 * x2 + t_ ** 3
            lo, hi = (t_, hi) if x < u else (lo, t_)
        t_ = (lo + hi) / 2
        return 3 * (1 - t_) ** 2 * t_ * y1 + 3 * (1 - t_) * t_ ** 2 * y2 + t_ ** 3
    return ease


IN_OUT = bezier(0.65, 0, 0.35, 1)


def read_voice(key):
    with wave.open(str(VOICE / f'{key}.wav')) as w:
        assert w.getframerate() == SR, f'{key}: {w.getframerate()} Hz'
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(1)
    return x


def narration(dur):
    """The voice track at the cue times, peaks at -3 dBFS, and a duck envelope for the bed."""
    v = np.zeros(int(dur * SR))
    for key, at in CUES['narration']:
        x = read_voice(key)
        S.place(v, x / np.abs(x).max() * 10 ** (-3 / 20), at)
    # 1 while someone speaks: a gate on the short-term level, smoothed over 350 ms so the bed dips and returns gently
    win = int(0.05 * SR)
    speaking = (np.convolve(np.abs(v), np.ones(win) / win, 'same') > 0.004).astype(float)
    k = int(0.35 * SR)
    d = np.clip(np.convolve(speaking, np.ones(k) / k, 'same') * 1.6, 0, 1)
    return S.stereo(v, 0.0), d


def pitch():
    """172 s under a narrator. 90 BPM; the bed breathes with the sections, the UI gets small sounds."""
    D = CUES['seconds']
    m, s = buf(D), buf(D)
    sec = lambda x: x * FPS  # noqa: E731  (film seconds → frames for piano())
    # S0 · 0–12 · the question lands glyph by glyph; the pen; the name
    pad(m, 0, sec(12.4), ['F2', 'C3', 'A3'], level=0.08, cutoff=900, attack=2.0)
    S.place(s, S.stereo(glass(S.hz('F6'), 0.04), 0), 0.3)
    for i, note in enumerate(['C5', 'D5', 'F5', 'G5', 'A5', 'G5', 'C6']):
        piano(m, sec(1.2) + i * 5, note, 0.8, 0.14 + 0.01 * i, 0.6, -0.3 + 0.1 * i)
    S.place(s, S.stereo(whoosh(0.9, 0.05), 0.1), 3.1)
    S.place(m, S.stereo(S.thump(0.3, 58), 0), 7.6)
    for k, note in enumerate(['F2', 'C4', 'F4', 'A4', 'E5']):
        piano(m, sec(7.6) + k, note, 4, 0.24 - 0.03 * k, 0.55, -0.3 + 0.15 * k)
    for i in range(16):
        S.place(s, S.stereo(S.tick(0.012 + 0.006 * rng.random()), rng.uniform(-0.6, 0.6)), 9.0 + i * 0.037)
    # S1 · 12–32 · three cards arrive; the ✕ marks; the statement
    S.place(s, S.stereo(whoosh(0.8, 0.05, rise=False), 0), 11.6)
    pad(m, sec(12), sec(21), ['D2', 'A2', 'F3', 'C4'], level=0.08, cutoff=1100, attack=1.0)
    for i in range(3):
        S.place(s, S.stereo(glass(S.hz(['A5', 'C6', 'E6'][i]), 0.05), -0.5 + 0.5 * i), 12.33 + i * 7 / FPS)
    for i in range(3):
        S.place(m, S.stereo(S.thump(0.12, 70), -0.5 + 0.5 * i), 17.4 + i * 5 / FPS)
        S.place(s, S.stereo(key_click(0.05), -0.5 + 0.5 * i), 17.4 + i * 5 / FPS)
    S.place(s, S.stereo(whoosh(1.0, 0.06), 0), 20.1)
    S.place(m, S.stereo(S.thump(0.34, 52), 0), 21.0)
    pad(m, sec(21), sec(32), ['Bb1', 'F2', 'D3', 'A3', 'C4'], level=0.1, cutoff=1500, attack=0.3)
    for k, note in enumerate(['Bb2', 'F3', 'D4', 'A4']):
        piano(m, sec(21) + k, note, 3, 0.2 - 0.02 * k, 0.5, -0.2 + 0.15 * k)
    for f, note in ((sec(24.4), 'C5'), (sec(26.4), 'D5'), (sec(28.4), 'F5')):
        piano(m, f, note, 1.5, 0.1, 0.45, 0.2)
    # S2 · 32–45 · the ring draws; the dot laps the eight steps, a heartbeat under it
    S.place(s, S.stereo(whoosh(1.1, 0.06), -0.2), 31.6)
    pad(m, sec(32), sec(45.5), ['F2', 'C3', 'G3', 'A3', 'E4'], level=0.1, cutoff=1600, attack=0.5)
    for i in range(8):
        S.place(s, S.stereo(S.tick(0.03), -0.6 + 0.17 * i), 32.27 + i * 3 / FPS)
    for b in np.arange(34.5, 44.0, BEAT):
        S.place(m, S.stereo(S.thump(0.14, 62), 0), b)
    notes8 = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6']
    prev = 0.0
    for f in range(int(sec(34.5)), int(sec(43.5)) + 2):
        head = 360 * IN_OUT(min(1.0, max(0.0, (f / FPS - 34.5) / 9.0)))
        for k in range(8):
            if prev < k * 45 <= head or (k == 0 and f == int(sec(34.5))):
                S.place(s, S.stereo(glass(S.hz(notes8[k]), 0.06), -0.7 + 0.2 * k), f / FPS)
        prev = head
    # S3 · 45–110 · the product. The bed steps back; each clip's cut breathes; callouts ping
    S.place(s, S.stereo(whoosh(1.2, 0.07, rise=False), 0), 44.4)
    S.place(m, S.stereo(S.thump(0.3, 50), 0), 45.2)
    chords = [(45, 64, ['F2', 'C3', 'A3', 'E4']), (64, 82, ['D2', 'A2', 'F3', 'C4']),
              (82, 99, ['Bb1', 'F2', 'D3', 'A3']), (99, 111, ['C2', 'G2', 'E3', 'D4'])]
    for a, b, notes in chords:
        pad(m, sec(a), sec(b + 0.6), notes, level=0.085, cutoff=1200, attack=1.2)
    for b in np.arange(46, 110, BEAT * 2):       # a soft pulse on every other beat keeps time under the voice
        S.place(m, S.stereo(S.tick(0.012), 0.3 * np.sin(b)), b)
    for at in (64, 71, 79, 82, 88, 93, 99, 105):
        S.place(s, S.stereo(whoosh(0.45, 0.025), 0), at - 0.25)
    for at in (48, 53.8, 65.5, 72.5, 87.4, 94.3, 103.3, 109.2):
        S.place(s, S.stereo(glass(S.hz('E6'), 0.045), 0.3), at)
    for i in range(int(8 / (BEAT / 4))):          # ×8: the answer streams in fast; a quick patter says so
        S.place(s, S.stereo(S.tick(0.01 + 0.006 * rng.random()), rng.uniform(-0.5, 0.5)), 71 + i * BEAT / 4)
    S.place(s, S.stereo(layer(key_click(0.1), S.tick(0.06)), 0.1), 94.3)   # graded
    S.place(s, S.stereo(glass(S.hz('A6'), 0.06), 0.2), 96.3)                 # the 0-matches note
    S.place(s, S.stereo(whoosh(0.7, 0.05), 0), 105.1)                        # reload
    S.place(s, S.stereo(glass(S.hz('C7'), 0.06), 0.2), 109.2)                # still there
    # S4 · 110–134 · the Agent loop: laps accelerate; the trusted station locks at 126.5
    S.place(s, S.stereo(whoosh(1.0, 0.07, rise=False), 0), 109.9)
    S.place(m, S.stereo(S.thump(0.32, 50), 0), 110.6)
    pad(m, sec(110), sec(122), ['D2', 'A2', 'E3', 'F3', 'C4'], level=0.1, cutoff=1300, attack=0.6)
    pad(m, sec(122), sec(134.4), ['Bb1', 'F2', 'D3', 'A3', 'E4'], level=0.11, cutoff=1800, attack=0.3)
    notes6 = ['F5', 'G5', 'A5', 'C6', 'D6', 'F6']
    prev = 0.0
    for f in range(int(sec(112)), int(sec(132)) + 1):
        head = 2.2 * 360 * ((f / FPS - 112) / 20) ** 1.4
        for k in range(6):
            for lap in range(3):
                if prev < k * 60 + 360 * lap <= head:
                    S.place(s, S.stereo(glass(S.hz(notes6[k]) * (1 + 0.5 * lap), 0.045), -0.6 + 0.24 * k), f / FPS)
        prev = head
    for b in np.arange(112, 132, BEAT):
        S.place(m, S.stereo(S.thump(0.1 + 0.1 * (b - 112) / 20, 62), 0), b)
    S.place(s, S.stereo(layer(key_click(0.14), S.tick(0.1)), 0), 126.5)
    S.place(m, S.stereo(S.thump(0.3, 80), 0), 126.5)
    # S5 · 134–150 · the numbers count up; each lands
    S.place(s, S.stereo(whoosh(0.9, 0.06, rise=False), 0), 133.4)
    pad(m, sec(134), sec(150.5), ['F2', 'C3', 'A3', 'E4', 'G4'], level=0.1, cutoff=1700, attack=0.5)
    for i in range(6):
        t0 = 134 + (24 + i * 9) / FPS
        for j in range(14):
            S.place(s, S.stereo(S.tick(0.008 + 0.006 * rng.random()), -0.6 + 0.6 * (i % 3)), t0 + j * 0.06)
        S.place(s, S.stereo(glass(S.hz(['C6', 'A5', 'D6', 'F6', 'E6', 'G6'][i]), 0.05), -0.6 + 0.6 * (i % 3)), t0 + 1.2)
    # S6 · 150–172 · the promise, then the name and its full stop
    S.place(s, S.stereo(whoosh(1.0, 0.05, rise=False), 0), 149.4)
    pad(m, sec(150), sec(161.5), ['D2', 'A2', 'F3', 'C4', 'E4'], level=0.09, cutoff=1200, attack=1.2)
    for f, note in ((sec(152), 'A4'), (sec(154.4), 'G4'), (sec(156.6), 'C5'), (sec(158.6), 'D5')):
        piano(m, f, note, 1.8, 0.11, 0.45, 0.2)
    pad(m, sec(161), sec(172), ['F2', 'C3', 'E3', 'A3', 'G4'], level=0.085, cutoff=1000, attack=0.8, release=3.0)
    for i in range(9):
        S.place(s, S.stereo(key_click(0.03), -0.4 + 0.1 * i), 161.2 + i * 2 / FPS)
    S.place(m, S.stereo(S.thump(0.4, 48), 0), 161.2)
    for k, note in enumerate(['F2', 'C4', 'F4', 'A4', 'G5']):
        piano(m, sec(161.2) + k, note, 4.5, 0.27 - 0.03 * k, 0.58, -0.3 + 0.15 * k)
    S.place(s, S.stereo(glass(S.hz('C7'), 0.1), 0.2), 164.0)
    S.place(s, S.stereo(glass(S.hz('C7'), 0.035), 0.2), 164.35)
    voice, duck = narration(D)
    finish(m, s, 'pitch', dur=D, voice=voice, duck=duck)


CLAIM_ZH = '得舒饮食能降低血压吗？'


if __name__ == '__main__':
    which = sys.argv[1:] or ['educanvas', 'sciscope', 'pitch']
    for name in which:
        globals()[name]()

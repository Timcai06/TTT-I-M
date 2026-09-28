"""Score and sound design for the project films, from the same instruments as the intro film.

    python3 tools/project_films/sound.py  →  tools/project_films/out/{educanvas,sciscope}-mix.wav

24 s at 90 BPM (a beat is 20 frames at 30 fps). Every cue below is placed at the frame where the
picture does the thing (see src/educanvas/EduCanvas.tsx and src/sciscope/SciScope.tsx).
I cannot listen to this; the report prints loudness and peak, the rest is Tim's call.
"""
import subprocess
import sys
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


def buf():
    return np.zeros((N, 2))


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


def finish(music, sfx, name):
    mix = S.reverb(music, rt60=2.2, mix=0.3) + S.reverb(sfx, rt60=0.7, mix=0.15, dark=6000) * 0.9
    mix = S.highpass(mix, 30)
    fade = np.clip((DUR - np.arange(N) / SR) / 1.2, 0, 1)[:, None]
    mix *= fade
    mix = np.tanh(mix / np.abs(mix).max() * 1.2) / np.tanh(1.2) * 0.89
    mix *= 10 ** (-5.0 / 20)
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


CLAIM_ZH = '得舒饮食能降低血压吗？'


if __name__ == '__main__':
    educanvas()
    sciscope()

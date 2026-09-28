"""The film's score and sound design, synthesised from scratch (no samples, no licensed music).

    python3 tools/intro_film/sound.py  →  art/intro-film/work/audio/{music,sfx,mix}.wav

80 BPM in D minor. A felt piano and a warm pad under the safelight; ticks from the timer; the
developer sloshing when the tongs rock a print. Everything drops out for the bell, the switch
clacks, the tube light stutters on, and the harmony opens into D major for the portrait.

I cannot listen to this. What I can check is in `report()`: loudness, true peak, and where the
energy sits. Whether it sounds good is Tim's call.
"""
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from timing import BEAT, BELL, DRIP_START, DURATION, FLICKER, FPS, SAFELIGHT_FLICKER, SWITCH, timer_ticks  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'art/intro-film/work/audio'
SR = 48000
N = int(round(DURATION * SR))
T = np.arange(N) / SR
rng = np.random.default_rng(11)


def hz(note):
    """'D4' → Hz. Sharps as '#', flats as 'b'."""
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    n = names[note[0]]
    rest = note[1:]
    if rest[0] == '#':
        n, rest = n + 1, rest[1:]
    elif rest[0] == 'b':
        n, rest = n - 1, rest[1:]
    midi = 12 * (int(rest) + 1) + n
    return 440.0 * 2 ** ((midi - 69) / 12)


def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r], -1)


def place(buf, sig, t0):
    i = int(round(t0 * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    if i < 0:
        sig = sig[-i:]
        i = 0
        j = min(len(buf), len(sig))
    buf[i:j] += sig[: j - i]


def layer(*sigs):
    """Sum signals of different lengths, aligned at their start."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[: len(x)] += x
    return out


def spectral(x, gain_fn):
    """Filter by shaping the spectrum: gain_fn(freq_hz) → gain."""
    n = 1 << int(np.ceil(np.log2(len(x) + 1)))
    X = np.fft.rfft(x, n, axis=0)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = gain_fn(f)
    if X.ndim == 2:
        g = g[:, None]
    return np.fft.irfft(X * g, n, axis=0)[: len(x)]


def lowpass(x, fc, order=2):
    return spectral(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def highpass(x, fc, order=2):
    return spectral(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))


def bandpass(x, fc, q):
    return spectral(x, lambda f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) * q) ** 2))


# ───────────────────────────── instruments ─────────────────────────────

def felt_piano(freq, dur, vel=0.5, bright=0.6):
    """Additive piano with string inharmonicity, a felt-damped top, a soft hammer thud."""
    n = int((dur + 1.8) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00035
    for k in range(1, 16):
        fk = k * freq * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = vel / k ** (1.9 - 0.6 * bright)
        decay = 0.55 + 0.35 * k + freq / 900
        for detune in (-0.0004, 0.0004):   # two strings, beating slowly
            out += 0.5 * amp * np.sin(2 * np.pi * fk * (1 + detune) * t + rng.uniform(0, 6.28)) * np.exp(-t * decay)
    # key release: the damper comes down at dur
    rel = np.clip(1 - (t - dur) / 0.35, 0, 1)
    out *= np.where(t < dur, 1, rel)
    atk = np.clip(t / 0.004, 0, 1)
    thud = bandpass(rng.normal(0, 1, n) * np.exp(-t / 0.012), 700, 1.2) * 0.04 * vel
    return (out * atk + thud)


def pad(notes, t0, t1, attack=1.2, release=1.6, level=0.12, cutoff=1400):
    """A warm string/synth pad: detuned band-limited saws, softened, with slow motion."""
    n = int((t1 - t0 + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for note in notes:
        f0 = hz(note)
        for det in (-0.006, 0.0, 0.0055):
            ph = rng.uniform(0, 6.28)
            vib = 1 + 0.0015 * np.sin(2 * np.pi * (0.21 + det * 20) * t + ph)
            base = 2 * np.pi * f0 * (1 + det) * np.cumsum(vib) / SR
            for k in range(1, 30):
                if k * f0 > 5000:
                    break
                out += (1 / k) * np.sin(k * base + ph * k) / 3
    env = np.clip(t / attack, 0, 1) ** 1.5
    env *= np.where(t < t1 - t0, 1, np.clip(1 - (t - (t1 - t0)) / release, 0, 1))
    out = lowpass(out * env, cutoff, 2)
    return out * level / max(1, len(notes)) ** 0.5


def sine_swell(freq, dur, level, trem=5.5):
    t = np.arange(int(dur * SR)) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return level * env * np.sin(2 * np.pi * freq * t) * (1 - 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * trem * t)))


def thump(level=0.5, f0=62):
    t = np.arange(int(0.6 * SR)) / SR
    f = f0 * (1 + 1.2 * np.exp(-t / 0.03))
    return level * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * np.clip(t / 0.003, 0, 1)


# ───────────────────────────── sound design ─────────────────────────────

def tick(level=0.25):
    t = np.arange(int(0.08 * SR)) / SR
    click = bandpass(rng.normal(0, 1, len(t)) * np.exp(-t / 0.0015), 3200, 1.0)
    body = np.sin(2 * np.pi * 880 * t) * np.exp(-t / 0.018) * 0.4
    return level * (click * 0.8 + body)


def bell(f0=hz('D6'), level=0.35):
    t = np.arange(int(2.6 * SR)) / SR
    out = np.zeros_like(t)
    for ratio, amp, dec in ((1.0, 1.0, 1.4), (2.76, 0.55, 0.9), (5.4, 0.3, 0.5), (8.93, 0.18, 0.3), (0.5, 0.25, 1.8)):
        out += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / dec)
    return level * out * np.clip(t / 0.002, 0, 1) / 2.3


def switch_clack(level=0.6):
    t = np.arange(int(0.25 * SR)) / SR
    snap = highpass(rng.normal(0, 1, len(t)) * np.exp(-t / 0.004), 1500)
    knock = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03)
    second = np.roll(highpass(rng.normal(0, 1, len(t)) * np.exp(-t / 0.003), 2500), int(0.018 * SR)) * 0.5
    return level * (snap * 0.5 + knock * 0.7 + second)


def ballast_buzz(dur, level=0.05, mains=50):
    t = np.arange(int(dur * SR)) / SR
    hum = sum(np.sin(2 * np.pi * 2 * mains * k * t) / k ** 1.3 for k in range(1, 12))
    return level * hum * np.clip(t / 0.01, 0, 1)


def ping(level=0.15, f=4200):
    t = np.arange(int(0.12 * SR)) / SR
    return level * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.02)


def slosh(dur=0.7, level=0.2):
    """Liquid moved in a shallow tray: filtered noise with a few bubbly resonances."""
    t = np.arange(int(dur * SR)) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    noise = rng.normal(0, 1, len(t)) * env
    body = bandpass(noise, 420, 1.3) * 0.7 + bandpass(noise, 1100, 2.0) * 0.4 + bandpass(noise, 2600, 3.0) * 0.15
    out = body
    for _ in range(int(dur * 14)):       # tiny droplets and bubbles in the wash
        at = rng.uniform(0.05, dur - 0.05)
        b = plip(level=rng.uniform(0.04, 0.12), f0=rng.uniform(900, 2400))
        i = int(at * SR)
        j = min(len(out), i + len(b))
        out[i:j] += b[: j - i] * env[i]
    return level * out


def plip(level=0.3, f0=1300):
    t = np.arange(int(0.09 * SR)) / SR
    f = f0 * (1 + 1.2 * t / 0.02)
    return level * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.012) * np.clip(t / 0.001, 0, 1)


def room_tone():
    """The room with the lights off: low air, a far 50 Hz, nothing else."""
    pink = spectral(rng.normal(0, 1, N), lambda f: 1 / np.sqrt(np.maximum(f, 20)))
    air = lowpass(pink, 350) * 0.06
    hum = 0.004 * (np.sin(2 * np.pi * 50 * T) + 0.5 * np.sin(2 * np.pi * 100 * T))
    return (air + hum)


def reverb(x, rt60=2.4, predelay=0.022, mix=0.3, dark=3200):
    n = int(rt60 * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.normal(0, 1, n), rng.normal(0, 1, n)], -1) * np.exp(-6.9 * t / rt60)[:, None]
    ir = lowpass(ir, dark)
    ir[: int(predelay * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    size = len(x) + n
    m = 1 << int(np.ceil(np.log2(size)))
    X = np.fft.rfft(x, m, axis=0)
    wet = np.fft.irfft(X * np.fft.rfft(ir, m, axis=0), m, axis=0)[: len(x)]
    return x * (1 - mix) + wet * mix * 2.2


# ───────────────────────────── the cue ─────────────────────────────

def f2t(frame):
    return frame / FPS


def music():
    L = np.zeros((N, 2))
    # under the safelight: D and A, a long breath in
    place(L, stereo(pad(['D2', 'A2', 'D3'], 0, 3.0, attack=2.2, level=0.09, cutoff=700), -0.1), 0.35)
    # piano: a question, three notes
    for at, note, vel, pan in ((0.75, 'A4', 0.32, 0.2), (1.5, 'D5', 0.36, 0.25), (2.25, 'C5', 0.3, 0.15)):
        place(L, stereo(felt_piano(hz(note), BEAT * 1.2, vel), pan), at)
    # the develop: an arpeggio that keeps the tray moving, pad opens with it
    place(L, stereo(pad(['D2', 'A2', 'F3', 'C4'], 3.0, 6.0, attack=1.0, level=0.11, cutoff=1100), 0.0), 3.0)
    place(L, stereo(pad(['Bb1', 'F2', 'D3', 'A3'], 6.0, 7.5, attack=0.6, level=0.12, cutoff=1600), 0.0), 6.0)
    arp_dm = ['D4', 'F4', 'A4', 'F4']
    arp_bb = ['Bb3', 'D4', 'F4', 'D4']
    t = 3.0
    i = 0
    while t < 7.5 - 1e-6:
        notes = arp_dm if t < 6.0 else arp_bb
        grow = (t - 3.0) / 4.5
        place(L, stereo(felt_piano(hz(notes[i % 4]), BEAT / 2 * 0.9, 0.12 + 0.12 * grow, bright=0.3 + 0.4 * grow),
                        -0.3 + 0.6 * ((i % 4) / 3)), t)
        t += BEAT / 2
        i += 1
    place(L, stereo(thump(0.35), 0), 3.0)
    # quick cuts: G minor, then A — each on its cut
    for at, chord, lvl in ((7.5, ['G3', 'Bb3', 'D4', 'G4'], 0.2), (8.625, ['A3', 'C#4', 'E4', 'A4'], 0.22)):
        for k, note in enumerate(chord):
            place(L, stereo(felt_piano(hz(note), BEAT * 1.1, lvl, bright=0.7), -0.2 + 0.13 * k), at + 0.012 * k)
        place(L, stereo(thump(0.3), 0), at)
    place(L, stereo(pad(['G2', 'D3', 'Bb3'], 7.5, 8.625, attack=0.15, release=0.4, level=0.1, cutoff=1800), 0), 7.5)
    place(L, stereo(pad(['A2', 'E3', 'C#4', 'G4'], 8.625, 9.75, attack=0.15, release=0.3, level=0.11, cutoff=2200), 0), 8.625)
    # the timer: the music holds its breath on one thin note
    place(L, stereo(sine_swell(hz('E6'), 0.7, 0.028), 0.1), 9.75)
    place(L, stereo(felt_piano(hz('E5'), 0.3, 0.14, bright=0.8), 0.2), 9.75)
    # lights on: D major, the portrait
    sw = f2t(SWITCH) + 0.06
    place(L, stereo(thump(0.55, 50), 0), sw)
    place(L, stereo(pad(['D2', 'A2', 'F#3', 'C#4', 'E4'], sw, 14.25 + 0.4, attack=0.5, release=2.0, level=0.14,
                        cutoff=2600), 0), sw)
    for k, note in enumerate(['D3', 'A3', 'F#4', 'C#5', 'E5']):
        place(L, stereo(felt_piano(hz(note), 3.2, 0.3 - 0.03 * k, bright=0.55), -0.35 + 0.17 * k), sw + 0.028 * k)
    for at, note, vel in ((sw + BEAT * 1.5, 'F#5', 0.24), (sw + BEAT * 2.5, 'A5', 0.22), (sw + BEAT * 3.5, 'E5', 0.2),
                          (sw + BEAT * 4.5, 'D5', 0.26)):
        place(L, stereo(felt_piano(hz(note), BEAT * 2, vel, bright=0.5), 0.15), at)
    L = reverb(L, rt60=2.6, mix=0.34)
    # the very end dips so the film hands over to the page without a cliff
    L *= np.clip((DURATION - T) / 0.9, 0, 1)[:, None] * 0.6 + 0.4 * np.clip((DURATION - T) / 0.25, 0, 1)[:, None]
    return L


def sfx():
    S = np.zeros((N, 2))
    S += stereo(room_tone(), 0) * np.clip(T / 0.8, 0, 1)[:, None] * np.where(T < f2t(SWITCH), 1, 0.7)[:, None]
    # safelight warming: a relay click and the filter lamp's hum on each flicker
    for fr, level in SAFELIGHT_FLICKER.items():
        if level > 0.3:
            place(S, stereo(layer(ping(0.05, 2800), tick(0.06)), 0.45), f2t(fr))
    place(S, stereo(ballast_buzz(f2t(252 - 16), 0.004, 50), 0.5), f2t(16))
    # the timer
    for fr in timer_ticks():
        if fr >= BELL:
            continue
        loud = 0.16 if 234 <= fr < 252 else 0.07
        place(S, stereo(tick(loud), -0.55 if fr < 234 else 0.0), f2t(fr))
    place(S, stereo(bell(), -0.1), f2t(BELL))
    # the tongs in the developer
    place(S, stereo(plip(0.16, 1500), 0.3), f2t(30))
    place(S, stereo(slosh(0.55, 0.12), 0.2), f2t(28))
    place(S, stereo(slosh(0.45, 0.09), 0.2), f2t(54))
    place(S, stereo(slosh(0.8, 0.16), 0.3), f2t(72 + 15))
    place(S, stereo(slosh(0.9, 0.16), 0.3), f2t(72 + 57))
    place(S, stereo(slosh(0.5, 0.1), 0.25), f2t(180))
    place(S, stereo(slosh(0.5, 0.1), -0.2), f2t(207))
    # the switch and the tube
    place(S, stereo(switch_clack(0.55), -0.4), f2t(SWITCH) - 0.02)
    for i, (a, b) in enumerate(zip([0.0] + FLICKER, FLICKER)):
        if b > 0.5 and a < 0.5:
            place(S, stereo(layer(ping(0.07, 3900 + 300 * i), tick(0.05)), 0.1), f2t(SWITCH + i))
    buzz = ballast_buzz(DURATION - f2t(SWITCH), 0.012)
    buzz *= np.exp(-np.arange(len(buzz)) / SR / 1.4) * 0.8 + 0.2
    place(S, stereo(buzz, 0.1), f2t(SWITCH))
    # the drip leaves the portrait and lands somewhere out of frame
    place(S, stereo(plip(0.2, 1800), 0.35), f2t(DRIP_START + 27))
    return reverb(S, rt60=0.9, mix=0.18, dark=5000)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    m = music()
    s = sfx()
    mix = m * 1.0 + s * 0.9
    mix = highpass(mix, 28)
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.3) / np.tanh(1.3) * 0.89   # gentle ceiling, about -1 dBFS
    # sit about 5 LU under that: ~-18 LUFS, just above the room's own cues (-23 LUFS)
    mix *= 10 ** (-5.2 / 20)
    write_wav(OUT / 'music.wav', m / np.abs(m).max() * 0.8)
    write_wav(OUT / 'sfx.wav', s / np.abs(s).max() * 0.8)
    write_wav(OUT / 'mix.wav', mix)
    print('wrote', OUT)


if __name__ == '__main__':
    main()

"""The film's clock, shared by the picture (film.py, inside Blender) and the sound (sound.py).

24 fps, 80 BPM: one beat is 0.75 s, 18 frames. Every cut lands on a beat or a half beat.
"""
FPS = 24
BPM = 80
BEAT = 60 / BPM

CUTS = [0, 72, 180, 207, 234, 252, 342]
SHOTS = ['safelight', 'develop', 'sciscope', 'skyline', 'timer', 'lights']
N_FRAMES = CUTS[-1]
DURATION = N_FRAMES / FPS          # 14.25 s

BELL = 246      # the timer reaches zero
SWITCH = 252    # the white light comes on
# work-light level on each frame after SWITCH: a fluorescent tube catching
FLICKER = [0.0, 1.0, 0.12, 0.0, 0.0, 0.0, 0.9, 0.35, 1.0, 0.7, 1.0, 0.92, 1.0]
# the safelight warming up at the start
SAFELIGHT_FLICKER = {10: 0.35, 11: 0.05, 12: 0.0, 13: 0.0, 14: 0.6, 15: 0.3, 16: 0.8}
DRIP_START = SWITCH + 30   # the drip on the portrait swells for 16 frames, then falls


def timer_ticks():
    """Frames on which the timer's second hand steps (it counts down to the bell)."""
    return [BELL - FPS * n for n in range(0, BELL // FPS + 1) if BELL - FPS * n >= 0][::-1]

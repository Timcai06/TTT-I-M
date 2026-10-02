# Website BGM · Afternoon Warmthaw

tim selected this Suno instrumental on 2026-10-02 for the Landing background music.
The original WAV remains in Downloads and is copied to the ignored local master
`sources/audio/afternoon-warmthaw.wav`; only the playback MP3 belongs in public assets.

Master: 193.2 s, stereo, 48 kHz, 16-bit PCM.
SHA-256: `82931b7ef4fca325a616a6266967a354905e9e97c35c9c4912a1a1f9ee487cc8`.

From the repository root, with Python 3 and FFmpeg installed:

```sh
rtk proxy python3 tools/site_music/prepare_bgm.py \
  sources/audio/afternoon-warmthaw.wav \
  apps/landing/public/projects/room/afternoon-warmthaw.mp3
```

The script omits the source's final fade into silence after 190 s and blends
184–190 s into 0–6 s with an equal-power crossfade. The file starts at source
6 s, plays through 184 s, then plays the blend, returning to 6 s on repeat.
The musical loop is 184 s; MP3 containers can include encoder padding. Two-pass
normalization targets -18 LUFS, followed by a 160 kb/s stereo MP3 encode.

SoundProvider streams it only after sound is enabled and the Landing is live.
It connects through the shared ambience bus and master gain: project films duck
the music and window ambience, closing a film restores them, and muting or hiding
the tab pauses the music without losing its position. Music gain is 0.85 before
the existing 0.28 master gain, with a 2.5 s fade-in. Window proximity continues to
control only the outdoor recording. The BGM is outside the loader/media preload.

The approved original is preserved. The processed loop and its volume in the
website still need tim's listening judgment; file and browser checks alone do
not establish musical quality.

## Local verification · 2026-10-02

- Landing production build and all existing build guards passed on `main`.
- ESLint reported no errors and one existing dependency warning in
  `ArchiveIndexSurface.tsx`.
- Playback MP3: 3,681,195 bytes; browser duration 184 s; measured -18.45 LUFS
  and -6.64 dBTP. Public and built copies have matching SHA-256 hashes.
- Desktop Chromium: no BGM request with sound off; enabling produces nonzero
  output through the shared master. Muting pauses and re-enabling resumes the
  same position. Seeking near the end confirmed a playing loop back to 0 s.
- Opening the actual SciScope film reduced the shared ambience bus below 0.01;
  closing it restored the bus above 0.98. No captured page errors or rejected
  promises occurred during these audio interactions.
- Switching away paused the music and suspended its AudioContext; returning
  resumed both. These checks do not establish Safari/mobile behavior or tim's
  listening acceptance of the edited loop.

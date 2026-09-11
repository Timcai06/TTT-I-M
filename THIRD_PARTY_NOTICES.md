# Third-party notices

## cli-spinners — dots12 data

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

The `dots12` frame sequence and interval in `apps/landing/src/lib/spinner.ts`
are derived from `cli-spinners`, used under the MIT License. Permission is
granted, free of charge, to any person obtaining a copy of this software and
associated documentation files to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, subject to inclusion
of the copyright and permission notice. The software is provided "as is",
without warranty of any kind.

Source: https://github.com/sindresorhus/cli-spinners

## Canvas UI

The Bend, Laser, Liquid, and rect-cache engines under
`apps/landing/src/lib/canvas-ui/vendor/` are derived from Canvas UI by David H.
The complete upstream MIT + Commons Clause license is retained alongside the
vendored source in `apps/landing/src/lib/canvas-ui/vendor/LICENSE.md`.

Source: https://github.com/DavidHDev/canvas-ui

## LogoLoop — Working set marquee

`apps/landing/src/components/LogoLoop.tsx` and
`apps/landing/src/styles/components/logo-loop.css` are derived from the LogoLoop
component published by ReactBits (David Haz), used under its open-source licence.
The Skills chapter renders it as the `Working set` strip.

Source: https://github.com/DavidHDev/react-bits

## Project evidence UI dependencies

The Landing project uses the following packages under their MIT licenses. They
remain lazy or chapter-scoped so they do not become part of the critical Hero
experience:

- Base UI (`@base-ui/react`) — accessible, unstyled project case-study dialog
  primitives. Source: https://github.com/mui/base-ui
- NumberFlow (`@number-flow/react`) — accessible transitions for evidenced
  project metrics. Source: https://github.com/barvian/number-flow
- Embla Carousel (`embla-carousel-react`) — touch project-media navigation.
  Source: https://github.com/davidjerleke/embla-carousel
- PhotoSwipe (`photoswipe`) — full-resolution project and archive evidence
  viewing. Source: https://github.com/dimsemenov/PhotoSwipe

Each package's complete license text remains available in its installed package
and upstream repository. The software is provided without warranty.

## Room audio

The six audio files under `apps/landing/public/projects/room/` are derived from
public-domain recordings published on pdsounds.org and mirrored on Wikimedia
Commons. pdsounds required every contributor to release their recordings into the
public domain, so no attribution is owed; the credits below are recorded because
knowing what a file is made of matters more than the licence does.

- `room-interior.mp3` — from "Ambient Classroom-Mono" by rcrossley. A 30 s
  seamless loop cut from 18–48 s of the source, high-passed at 40 Hz to remove the
  microphone's DC offset and low-passed at 2.4 kHz, which also puts any residual
  speech below intelligibility. The room keeps only the ventilation body.
- `room-window.mp3` — from "Gentle breeze with a Blackcap and a Chaffinch
  singing" by ezwa. A 24 s seamless loop, high-passed hard at 280 Hz: the source's
  low end is wind blowing on the microphone, and a listener sitting inside a room
  should not hear weather. What survives is the birds.
- `cue-entry.mp3` — from "turning a page" by planish.
- `cue-query.mp3`, `cue-synthesis.mp3` — from "Leafing through pages, flicking
  pages, shutting book" by cori; the flicking passage and the closing book.
- `cue-evidence.mp3` — from "Wooden desk drawer" by an uncredited pdsounds
  contributor; the drawer being pulled open.

Both loops are seamless by construction: each file's tail is equal-power
crossfaded into its own head, so `AudioBufferSourceNode.loop` needs no
loopStart/loopEnd window. All six are mono, 44.1 kHz, and encoded with LAME such
that they decode to an exact sample count.

Source: https://commons.wikimedia.org/wiki/Category:PDsounds.org

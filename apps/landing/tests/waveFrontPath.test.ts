import test from 'node:test'
import assert from 'node:assert/strict'

import {
  WAVE_AMPLITUDE_RATIO,
  WAVE_PAD_RATIO,
  WAVE_SAMPLES,
  waveBandPath,
  waveFrontPoints,
} from '../src/lib/waveFrontPath.ts'

const base = { width: 1440, height: 900, phase: 2.3, curl: 1 as const }

void test('front is flat (envelope zero) at both ends of its travel', () => {
  for (const progress of [0, 1]) {
    const points = waveFrontPoints({ ...base, direction: 'up', progress })
    const ys = points.map(([, y]) => y)
    const spread = Math.max(...ys) - Math.min(...ys)
    assert.ok(spread < 0.001, `front must be flat at progress=${progress}, spread=${spread}`)
  }
})

void test('front travels fully off-screen on both sides', () => {
  const start = waveFrontPoints({ ...base, direction: 'up', progress: 0 })
  const end = waveFrontPoints({ ...base, direction: 'up', progress: 1 })
  assert.ok(start.every(([, y]) => y >= base.height), 'progress 0 must sit below the viewport')
  assert.ok(end.every(([, y]) => y <= 0), 'progress 1 must sit above the viewport')
})

void test('hold state covers the whole viewport analytically', () => {
  // The land/swap moment: lead edge fully past, tail edge still parked off-screen.
  const d = waveBandPath({ ...base, direction: 'up', frontProgress: 1, backProgress: 0 })
  const lead = waveFrontPoints({ ...base, direction: 'up', progress: 1 })
  const tail = waveFrontPoints({ ...base, direction: 'up', progress: 0, phase: base.phase + 1.15 })
  assert.ok(lead.every(([, y]) => y <= 0) && tail.every(([, y]) => y >= base.height))
  assert.ok(d.startsWith('M ') && d.endsWith('Z'))
})

void test('mid-flight wave actually waves (amplitude near its budget)', () => {
  const points = waveFrontPoints({ ...base, direction: 'up', progress: 0.5 })
  const ys = points.map(([, y]) => y)
  const spread = Math.max(...ys) - Math.min(...ys)
  // tilt + primary + curl harmonic: mid-flight spread must be a substantial
  // fraction of the amplitude budget, or the "liquid" reads as a straight wipe.
  assert.ok(
    spread > base.height * WAVE_AMPLITUDE_RATIO,
    `mid-flight spread ${spread.toFixed(1)} too flat for a liquid front`,
  )
})

void test('directions mirror each other', () => {
  const up = waveFrontPoints({ ...base, direction: 'up', progress: 0.3 })
  const down = waveFrontPoints({ ...base, direction: 'down', progress: 0.3 })
  for (let i = 0; i < up.length; i += 1) {
    const mirrored = base.height - down[i][1]
    assert.ok(Math.abs(up[i][1] - mirrored) < 0.001, `mirror mismatch at sample ${i}`)
  }
})

void test('samples are evenly spaced and x-monotonic across the width', () => {
  const points = waveFrontPoints({ ...base, direction: 'up', progress: 0.4 })
  assert.equal(points.length, WAVE_SAMPLES + 1)
  assert.equal(points[0][0], 0)
  assert.equal(points[WAVE_SAMPLES][0], base.width)
  for (let i = 1; i < points.length; i += 1) {
    assert.ok(points[i][0] > points[i - 1][0])
  }
})

void test('band path serializes as one closed smooth region', () => {
  const d = waveBandPath({ ...base, direction: 'up', frontProgress: 0.6, backProgress: 0.1 })
  assert.match(d, /^M -?\d+\.\d,-?\d+\.\d( C [^MLZ]+)+ L -?\d+\.\d,-?\d+\.\d( C [^MLZ]+)+ Z$/)
})

void test('pad keeps the parked tail clear of tall wave crests', () => {
  // Even at max envelope the wave never reaches back across the pad: a crest
  // at progress just above 0 must stay below the viewport top... i.e. the pad
  // budget exceeds the amplitude budget so edges never flash through.
  assert.ok(WAVE_PAD_RATIO > WAVE_AMPLITUDE_RATIO + 0.2)
})

// Cut the recorded takes into the clips the competition film uses, each retimed to its slot.
//
//   node capture/cut.mjs            → out/takes/clips/<name>.mp4 + src/pitch/clips.json
//
// clips.json is small and tracked (the film reads each clip's length, speed and marks from it); the
// clips themselves are regenerable and stay in out/.
//
// A clip is [from mark + offset, to mark + offset] of a take, sped up (never slowed) to a target
// length. clips.json records each clip's speed, so the film can say honestly how fast it runs.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TAKES = fileURLToPath(new URL('../out/takes/', import.meta.url))
const OUT = path.join(TAKES, 'clips')
mkdirSync(OUT, { recursive: true })

const marksOf = (take) => {
  const { marks } = JSON.parse(readFileSync(path.join(TAKES, `${take}.marks.json`), 'utf8'))
  return Object.fromEntries(marks.map((m) => [m.label, m.t]))
}

// [name, take, from, fromOffset, to, toOffset, target seconds]
const CLIPS = [
  ['setup', 'loop', 'setup', -0.3, 'workspace', 0.6, 18],
  ['ask', 'loop', 'workspace', 0.6, 'ask', 0.4, 7],
  ['answer', 'loop', 'ask', 0.4, 'answered', 1.2, 8],
  ['read', 'loop', 'answered', 1.2, 'read', 0.4, 3],
  ['canvas', 'loop', 'read', 0.4, 'canvas', 1.2, 6],
  ['quiz', 'loop', 'canvas', 1.2, 'graded-1', 0.2, 5],
  ['graded', 'loop', 'graded-1', 0.2, 'graded-2', 1.8, 6],
  ['progress', 'loop', 'graded-2', 1.8, 'progress', 2.6, 6],
  ['reload', 'loop', 'reload', -0.2, 'progress-after-reload', 2.2, 6],
]

const manifest = {}
for (const [name, take, from, fo, to, to_, target] of CLIPS) {
  const m = marksOf(take)
  if (m[from] === undefined || m[to] === undefined) throw new Error(`${name}: missing mark ${from} or ${to}`)
  const a = Math.max(0, m[from] + fo)
  const b = m[to] + to_
  const real = b - a
  const speed = Math.max(1, real / target)
  const length = real / speed
  const out = path.join(OUT, `${name}.mp4`)
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', a.toFixed(3), '-t', real.toFixed(3),
    '-i', path.join(TAKES, `${take}.mp4`), '-vf', `setpts=PTS/${speed.toFixed(5)},fps=60`, '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', out])
  if (r.status !== 0) throw new Error(`${name}: ${r.stderr}`)
  // every mark that falls inside the clip, in clip time
  const inside = Object.fromEntries(Object.entries(m).filter(([, t]) => t >= a && t <= b).map(([k, t]) => [k, +((t - a) / speed).toFixed(3)]))
  manifest[name] = { take, from: +a.toFixed(3), to: +b.toFixed(3), speed: +speed.toFixed(2), seconds: +length.toFixed(3), marks: inside }
  console.log(`${name.padEnd(9)} ${real.toFixed(1)}s real → ${length.toFixed(1)}s at ${speed.toFixed(2)}×`)
}
writeFileSync(fileURLToPath(new URL('../src/pitch/clips.json', import.meta.url)), JSON.stringify(manifest, null, 2) + '\n')

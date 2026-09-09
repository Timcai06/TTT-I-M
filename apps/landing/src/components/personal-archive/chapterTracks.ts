export type ArchiveTrack = 'about-life' | 'life-frame' | 'frame-stack' | 'stack-work' | 'work-contact'
export const clamp = (p: number) => Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0))
export const phase = (p: number, start: number, end: number) => {
  const t = clamp((p - start) / (end - start))
  return t * t * (3 - 2 * t)
}
export const chapterTracks = {
  'about-life': { target: 'life', surface: 'LifeReading', title: '系统之外，生活仍在发生。', index: '01 / LIFE', height: '250svh' },
  'life-frame': { target: 'frame', surface: 'FrameReading', title: '生活的切片，成为摄影档案。', index: '02 / FRAME', height: '210svh' },
  'frame-stack': { target: 'skills', surface: 'StackReading', title: '从观看，到构建。', index: '03 / STACK', height: '240svh' },
  'stack-work': { target: 'projects', surface: 'WorkReading', title: '让想法成为可以打开的作品。', index: '04 / WORK', height: '220svh' },
  'work-contact': { target: 'contact', surface: 'ContactReading', title: '下一份记录，一起完成。', index: '05 / CONTACT', height: '180svh' },
} as const

/** Shared handoff timing: travel, align, dolly, then settle the reading rectangle. */
export function chapterHandoffPose(_track: ArchiveTrack, value: number) {
  const p = clamp(value)
  return { roomOpacity: 1, vignette: 0, guidance: 1 - phase(p, .035, .20), targetOpacity: phase(p, .66, .72) }
}

/** Seekable, history-independent choreography; normal reading is never gated. */
export function chapterPose(track: ArchiveTrack, value: number) {
  const p = clamp(value)
  return {
    travel: phase(p, .24, .56),
    approach: phase(p, .56, .72),
    flatten: phase(p, .94, 1),
    ink: track === 'work-contact' ? phase(p, .52, .84) : phase(p, .60, .77),
    drawer: track === 'stack-work' ? phase(p, .14, .52) : track === 'work-contact' ? 1 - .65 * phase(p, .08, .56) : 0,
    folder: track === 'stack-work' ? phase(p, .38, .73) : track === 'work-contact' ? 1 - phase(p, .08, .5) : 0,
    picture: track === 'life-frame' ? 1 - phase(p, .22, .54) : 0,
    signal: track === 'frame-stack' ? phase(p, .03, .61) : 0,
    reading: p >= .9999,
  }
}

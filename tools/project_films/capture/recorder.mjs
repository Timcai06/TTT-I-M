// Screen capture for the competition film: the real EduCanvas, driven by a script, recorded frame by frame.
//
// Chrome's screencast hands us a JPEG every time the page paints, with its timestamp. We keep every
// one, and assemble them into a constant 60 fps video afterwards (ffmpeg concat with per-frame
// durations), so the take plays at exactly the speed it happened. Playwright's own recordVideo is
// a low-bitrate VP8; this is not.
//
// A headless browser has no cursor, so one is drawn into the page: a soft dot that eases to every
// pointer move and ripples on click. Typing goes key by key with a human rhythm.
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const CURSOR_CSS = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
  #film-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
    background: rgba(40, 32, 56, 0.28); border: 2px solid rgba(255,255,255,0.95); box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    pointer-events: none; z-index: 2147483647; transition: transform 90ms ease-out; }
  #film-cursor.down { transform: scale(0.78); }
  .film-ripple { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; pointer-events: none;
    z-index: 2147483646; border: 2px solid rgba(103, 72, 138, 0.7); animation: film-ripple 520ms ease-out forwards; }
  @keyframes film-ripple { to { transform: scale(3.2); opacity: 0; } }
`

const CURSOR_JS = `(() => {
  if (window.__filmCursor) return
  const install = () => {
    const style = document.createElement('style'); style.textContent = ${JSON.stringify(CURSOR_CSS)}; document.head.appendChild(style)
    const dot = document.createElement('div'); dot.id = 'film-cursor'; document.body.appendChild(dot)
    let x = window.__filmX ?? innerWidth / 2, y = window.__filmY ?? innerHeight / 2
    dot.style.left = x + 'px'; dot.style.top = y + 'px'
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; window.__filmX = x; window.__filmY = y; dot.style.left = x + 'px'; dot.style.top = y + 'px' }, true)
    addEventListener('mousedown', (e) => { dot.classList.add('down'); const r = document.createElement('div'); r.className = 'film-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 600) }, true)
    addEventListener('mouseup', () => dot.classList.remove('down'), true)
    window.__filmCursor = true
  }
  if (document.body) install(); else addEventListener('DOMContentLoaded', install)
})()`

export class Recorder {
  constructor(page, { dir, name, scale = 1 }) {
    this.scale = scale
    this.page = page
    this.dir = path.join(dir, name)
    this.name = name
    this.frames = []
    this.marks = []
    this.mouse = { x: 960, y: 540 }
  }

  async prepare() {
    await this.page.addInitScript(CURSOR_JS)
    await this.page.evaluate(CURSOR_JS).catch(() => {})
  }

  async start() {
    rmSync(this.dir, { recursive: true, force: true })
    mkdirSync(this.dir, { recursive: true })
    this.cdp = await this.page.context().newCDPSession(this.page)
    this.cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(this.dir, `f${String(this.frames.length).padStart(6, '0')}.jpg`)
      writeFileSync(file, Buffer.from(f.data, 'base64'))
      this.frames.push({ file, t: f.metadata.timestamp })
      await this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    })
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920 * this.scale, maxHeight: 1080 * this.scale, everyNthFrame: 1 })
    this.t0 = Date.now() / 1000
    this.mark('start')
  }

  mark(label) {
    const now = Date.now() / 1000
    this.marks.push({ label, at: now })
    console.log(`  [${this.name}] ${(now - this.t0).toFixed(2)}s ${label}`)
  }

  /** Glide the cursor to (x, y) with an eased path, like a hand would. */
  async moveTo(x, y, ms = 650) {
    const { x: x0, y: y0 } = this.mouse
    const steps = Math.max(8, Math.round(ms / 16))
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      await this.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
      await this.page.waitForTimeout(ms / steps)
    }
    this.mouse = { x, y }
  }

  async click(locator, { ms = 650, settle = 250 } = {}) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('click: element has no box')
    await this.moveTo(box.x + box.width / 2, box.y + box.height / 2, ms)
    await this.page.waitForTimeout(120)
    await this.page.mouse.down(); await this.page.waitForTimeout(70); await this.page.mouse.up()
    await this.page.waitForTimeout(settle)
  }

  /** Type like a person: a steady rhythm, a little variation, a breath after punctuation. */
  async type(text, { cps = 7 } = {}) {
    for (const ch of text) {
      await this.page.keyboard.type(ch)
      const base = 1000 / cps
      const pause = /[，。？！,.?!]/.test(ch) ? 220 : 0
      await this.page.waitForTimeout(base * (0.7 + Math.random() * 0.6) + pause)
    }
  }

  async hold(ms) { await this.page.waitForTimeout(ms) }

  async stop() {
    this.mark('end')
    await this.cdp.send('Page.stopScreencast').catch(() => {})
    await this.page.waitForTimeout(300)
    // marks in video time: the video starts at the first painted frame
    const zero = this.frames[0]?.t ?? this.t0
    const marks = this.marks.map((m) => ({ label: m.label, t: +(m.at - zero).toFixed(3) }))
    writeFileSync(path.join(path.dirname(this.dir), `${this.name}.marks.json`), JSON.stringify({ marks, frames: this.frames.length }, null, 2))
    return this.encode()
  }

  /** Frames at their real timestamps → constant 60 fps H.264. */
  encode() {
    const list = []
    for (let i = 0; i < this.frames.length; i++) {
      const cur = this.frames[i]
      const next = this.frames[i + 1]
      const dur = next ? Math.max(1 / 240, next.t - cur.t) : 0.5
      list.push(`file '${cur.file.replace(/'/g, "'\\''")}'`, `duration ${dur.toFixed(5)}`)
    }
    list.push(`file '${this.frames.at(-1).file.replace(/'/g, "'\\''")}'`)
    const listFile = path.join(this.dir, 'frames.txt')
    writeFileSync(listFile, list.join('\n'))
    const out = path.join(path.dirname(this.dir), `${this.name}.mp4`)
    const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
      '-vf', `fps=60,scale=${1920 * this.scale}:${1080 * this.scale}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', out])
    if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`)
    console.log(`  [${this.name}] ${this.frames.length} frames → ${out}`)
    return out
  }
}

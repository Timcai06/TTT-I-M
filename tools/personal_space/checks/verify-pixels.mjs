// Read actual HDR/output pixels, not screenshots or an aesthetic verdict.
// Instrumentation only observes render targets in an isolated browser. The last
// probe deliberately inserts one invalid HDR pixel to test containment.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/'
const shots = ['entry', 'about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']
const steps = [.005, ...Array.from({ length: 49 }, (_, i) => (i + 1) / 50), .995]
const reports = { url, frames: [], faults: [], errors: [] }
const instrumentation = `
  const audit = window.__archivePixelAudit = { armed:false, expected:null, inject:false, stages:{}, last:null, invalidate:schedule };
  function readTarget(target) {
    const pixels = new Uint16Array(target.width * target.height * 4);
    gl.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
    let invalid = 0;
    for (let i=0;i<pixels.length;i+=4) {
      if ((pixels[i]&0x7c00)===0x7c00 || (pixels[i+1]&0x7c00)===0x7c00 || (pixels[i+2]&0x7c00)===0x7c00 || (pixels[i+3]&0x7c00)===0x7c00) invalid++;
    }
    return { invalid, first: Array.from(pixels.slice(0,4)) };
  }
  function observePass(pass, label, buffer) {
    const render = pass.render.bind(pass);
    pass.render = (renderer, write, read, ...args) => {
      render(renderer, write, read, ...args);
      if (!audit.armed) return;
      const target = buffer === 'read' ? read : write;
      if (label === 'scene' && audit.inject) {
        const context = gl.getContext(), previous = context.getParameter(context.TEXTURE_BINDING_2D);
        context.bindTexture(context.TEXTURE_2D, gl.properties.get(target.texture).__webglTexture);
        context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, 1, 1, context.RGBA, context.HALF_FLOAT, new Uint16Array([0x7e00,0x7c00,0xbc00,0x3c00]));
        context.bindTexture(context.TEXTURE_2D, previous);
      }
      audit.stages[label] = readTarget(target);
    };
  }
  observePass(renderPass, 'scene', 'read');
  observePass(finite, 'finite', 'write');
  function readOutput() {
    if (!audit.armed || canvas.dataset.archiveShot !== audit.expected.shot || Math.abs(+canvas.dataset.archiveProgress-audit.expected.p) > .004) return;
    const context=gl.getContext(), width=context.drawingBufferWidth, height=context.drawingBufferHeight;
    const pixels=new Uint8Array(width*height*4);context.readPixels(0,0,width,height,context.RGBA,context.UNSIGNED_BYTE,pixels);
    let empty=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)empty++;
    const metals=[];model.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.anisotropy>0)metals.push(m.anisotropy)});
    audit.last={shot:canvas.dataset.archiveShot,p:+canvas.dataset.archiveProgress,width,height,empty,stages:audit.stages,metals};
    audit.armed=false;
  }
`
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: process.env.HTML_CANVAS_EXPERIMENTAL === '1' ? ['--enable-blink-features=CanvasDrawElement'] : [],
})
try {
  for (const viewport of [{ width: 1200, height: 760 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
    page.on('pageerror', error => reports.errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /personal-archive|THREE|GLSL|shader/i.test(message.text())) reports.errors.push(message.text())
    })
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attributes) {
        return original.call(this, type, type === 'webgl2' ? { ...attributes, preserveDrawingBuffer: true } : attributes)
      }
    })
    await page.route('**/src/components/personal-archive/archiveRuntime.ts*', async route => {
      const response = await route.fetch(), body = await response.text()
      assert.ok(body.includes('composer.addPass(renderPass);') && body.includes('composer.render();'), 'Runtime diagnostic insertion points changed')
      await route.fulfill({ response, body: body.replace('composer.addPass(renderPass);', `${instrumentation}\ncomposer.addPass(renderPass);`)
        .replace('composer.render();', 'composer.render(); readOutput();') })
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
    const move = async (shot, p, inject = false) => {
      await page.evaluate(async ({ shot, p, inject }) => {
        const audit = window.__archivePixelAudit
        audit.armed = true; audit.last = null; audit.stages = {}; audit.inject = inject; audit.expected = { shot, p }
        const root = document.querySelector(shot === 'entry' ? '#archive-entry' : `[data-archive-track="${shot}"]`)
        const { getLenis } = await import('/src/lib/lenis.ts')
        getLenis().scrollTo(root.getBoundingClientRect().top + scrollY + p * (root.offsetHeight - innerHeight), { immediate: true, force: true })
        audit.invalidate()
      }, { shot, p, inject })
      await page.waitForFunction(() => window.__archivePixelAudit?.last, null, { timeout: 30000 })
      return page.evaluate(() => window.__archivePixelAudit.last)
    }
    for (const shot of shots) {
      for (const [direction, values] of [['forward', steps], ['reverse', steps.toReversed()]]) {
        for (const p of values) {
          const frame = { ...await move(shot, p), viewport, direction }
          reports.frames.push(frame)
          assert.equal(frame.stages.scene.invalid, 0, `${shot}/${p}: source HDR contains nonfinite pixels`)
          assert.equal(frame.stages.finite.invalid, 0)
          assert.equal(frame.empty, 0, `${shot}/${p}: missing output pixels`)
          assert.ok(frame.metals.length && frame.metals.every(value => Math.abs(value - .32) < .00001), 'Brushed-metal anisotropy must remain enabled')
        }
      }
      console.log('FINITE_SOURCE_AND_COMPLETE_OUTPUT', viewport, shot)
    }
    const fault = { ...await move('entry', .15, true), viewport }
    reports.faults.push(fault)
    assert.equal(fault.stages.scene.invalid, 1, 'Fault injection must reach the actual HDR texture')
    assert.equal(fault.stages.finite.invalid, 0)
    assert.deepEqual(fault.stages.finite.first, [0, 0, 0, 0x3c00], 'NaN, infinity and negative HDR must become opaque finite channels')
    assert.equal(fault.empty, 0, 'A bad HDR pixel must not poison the bloom chain')
    console.log('INVALID_HDR_PIXEL_CONTAINED_BEFORE_FILTERING', viewport)
    await page.close()
  }
  assert.deepEqual(reports.errors, [])
} finally {
  await mkdir('output/playwright', { recursive: true })
  await writeFile('output/playwright/archive-pixels.json', JSON.stringify(reports, null, 2))
  await browser.close()
}

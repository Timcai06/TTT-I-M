// Read actual HDR/output pixels, not screenshots or an aesthetic verdict.
// Instrumentation only observes render targets in an isolated browser. The last
// probe deliberately inserts one invalid HDR pixel to test containment.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/'
const shots = ['entry', 'about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']
const steps = process.env.ARCHIVE_QUICK === '1' ? [.005, .18, .38, .56, .76, .9, .995] : [.005, ...Array.from({ length: 49 }, (_, i) => (i + 1) / 50), .995]
const reports = { url, frames: [], faults: [], errors: [] }
const instrumentation = `
  const audit = window.__archivePixelAudit = { armed:false, expected:null, inject:false, blackHalf:false, stages:{}, last:null, invalidate:schedule };
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
    if(audit.blackHalf){context.enable(context.SCISSOR_TEST);context.scissor(0,0,Math.floor(width/2),height);context.clearColor(0,0,0,1);context.clear(context.COLOR_BUFFER_BIT);context.disable(context.SCISSOR_TEST);}
    const pixels=new Uint8Array(width*height*4);context.readPixels(0,0,width,height,context.RGBA,context.UNSIGNED_BYTE,pixels);
    let transparentLegacy=0, nonBlack=0, sum=0, sumSq=0;
    const tileCols=24,tileRows=14,tileBright=new Uint32Array(tileCols*tileRows),tileLuma=new Float64Array(tileCols*tileRows),tilePixels=new Uint32Array(tileCols*tileRows);
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]===0)transparentLegacy++;
      const luma=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];sum+=luma;sumSq+=luma*luma;
      const px=(i/4)%width,py=Math.floor((i/4)/width),tile=Math.min(tileRows-1,Math.floor(py/height*tileRows))*tileCols+Math.min(tileCols-1,Math.floor(px/width*tileCols));
      tilePixels[tile]++;tileLuma[tile]+=luma;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>8){nonBlack++;tileBright[tile]++;}
    }
    const occupied=Array.from(tilePixels,(count,index)=>count>0&&tileBright[index]/count>.08&&tileLuma[index]/count>3?1:0);
    let largestDark=0;const heights=new Uint16Array(tileCols);
    for(let row=0;row<tileRows;row++){for(let col=0;col<tileCols;col++)heights[col]=occupied[row*tileCols+col]?0:heights[col]+1;for(let left=0;left<tileCols;left++){let min=65535;for(let right=left;right<tileCols;right++){min=Math.min(min,heights[right]);largestDark=Math.max(largestDark,min*(right-left+1));}}}
    const pixelCount=width*height,meanLuma=sum/pixelCount;
    const metals=[];model.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.anisotropy>0)metals.push(m.anisotropy)});
    audit.last={shot:canvas.dataset.archiveShot,p:+canvas.dataset.archiveProgress,width,height,transparentLegacy,nonBlackRatio:nonBlack/pixelCount,occupiedTileRatio:occupied.reduce((a,b)=>a+b,0)/occupied.length,largestDarkTileRatio:largestDark/occupied.length,meanLuma,lumaVariance:sumSq/pixelCount-meanLuma*meanLuma,aa:canvas.dataset.archiveAa,stages:audit.stages,metals};
    audit.armed=false;
  }
`
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: process.env.HTML_CANVAS_EXPERIMENTAL === '1' ? ['--enable-blink-features=CanvasDrawElement'] : [],
})
try {
  for (const viewport of (process.env.ARCHIVE_QUICK === '1' ? [{ width: 1200, height: 760 }] : [{ width: 1200, height: 760 }, { width: 1440, height: 900 }])) {
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
    const move = async (shot, p, inject = false, blackHalf = false) => {
      await page.evaluate(async ({ shot, p, inject, blackHalf }) => {
        const audit = window.__archivePixelAudit
        audit.armed = true; audit.last = null; audit.stages = {}; audit.inject = inject; audit.blackHalf = blackHalf; audit.expected = { shot, p }
        const root = document.querySelector(shot === 'index' ? '#hero' : shot === 'entry' ? '#archive-entry' : `[data-archive-track="${shot}"]`)
        const { getLenis } = await import('/src/lib/lenis.ts')
        const { ScrollTrigger } = await import('/src/lib/gsap.ts')
        const trigger = ScrollTrigger.getAll().find(item => item.trigger === root)
        if (!trigger) throw new Error('Missing archive ScrollTrigger for '+shot)
        getLenis().scrollTo(trigger.start + p * (trigger.end - trigger.start), { immediate: true, force: true })
        audit.invalidate()
      }, { shot, p, inject, blackHalf })
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
          assert.equal(frame.transparentLegacy, 0, `${shot}/${p}: opaque output unexpectedly contains transparent pixels`)
          assert.ok(frame.nonBlackRatio > .055, `${shot}/${p}: final output has abnormal opaque-black coverage`)
          assert.ok(frame.occupiedTileRatio > .28, `${shot}/${p}: final output contains a large rectangular black region`)
          assert.ok(frame.largestDarkTileRatio < .34, `${shot}/${p}: final output contains one contiguous missing-room block`)
          // A wall, paper or monitor can legitimately fill most of the GPU
          // frame while the real DOM subject sits above it. Keep a non-flat
          // signal floor, while the stricter tile/contiguous-block checks and
          // injected half-screen negative control own missing-room detection.
          assert.ok(frame.lumaVariance > 1, `${shot}/${p}: final output lacks spatial luminance structure`)
          assert.match(frame.aa, /^(msaa-[1-9]\d*x|fxaa)$/)
          assert.ok(frame.metals.length && frame.metals.every(value => Math.abs(value - .32) < .00001), 'Brushed-metal anisotropy must remain enabled')
        }
      }
      console.log('FINITE_SOURCE_AND_COMPLETE_OUTPUT', viewport, shot)
    }
    const index = { ...await move('index', 0), viewport, direction: 'static' }
    reports.frames.push(index)
    assert.equal(index.stages.scene.invalid, 0)
    assert.equal(index.stages.finite.invalid, 0)
    assert.ok(index.nonBlackRatio > .055 && index.occupiedTileRatio > .28, 'Index room must be visibly composed, not opaque black')
    assert.ok(index.largestDarkTileRatio < .34, 'Index room must not contain a contiguous missing-room block')
    const negative = await move('entry', .55, false, true)
    assert.ok(negative.largestDarkTileRatio >= .34 || negative.occupiedTileRatio <= .28, 'Negative control must reject an injected opaque half-screen block')
    const fault = { ...await move('entry', .15, true), viewport }
    reports.faults.push(fault)
    assert.equal(fault.stages.scene.invalid, 1, 'Fault injection must reach the actual HDR texture')
    assert.equal(fault.stages.finite.invalid, 0)
    assert.deepEqual(fault.stages.finite.first, [0, 0, 0, 0x3c00], 'NaN, infinity and negative HDR must become opaque finite channels')
    assert.equal(fault.transparentLegacy, 0, 'A bad HDR pixel must not poison the bloom chain')
    assert.ok(fault.nonBlackRatio > .055 && fault.occupiedTileRatio > .28, 'Contained HDR faults must not produce an opaque black rectangle')
    console.log('INVALID_HDR_PIXEL_CONTAINED_BEFORE_FILTERING', viewport)
    await page.close()
  }
  assert.deepEqual(reports.errors, [])
} finally {
  await mkdir('output/playwright', { recursive: true })
  await writeFile('output/playwright/archive-pixels.json', JSON.stringify(reports, null, 2))
  await browser.close()
}

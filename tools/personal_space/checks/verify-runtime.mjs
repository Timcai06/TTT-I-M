// Runtime checks only: no screenshots, image comparisons, or aesthetic verdicts.
// Requires the local Vite server. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH may override the browser.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
const cache = join(homedir(), 'Library/Caches/ms-playwright')
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync(cache)
  ? readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()
    .map(name => join(cache, name, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
    .find(existsSync) : undefined)
const url = process.env.LANDING_RUNTIME_URL ?? 'http://127.0.0.1:5173/'

(async()=>{
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:1440,height:900}});let release;const gate=new Promise(r=>release=r);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/personal-space.glb*',async route=>{await gate;await route.continue().catch(()=>{})});
await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForSelector('#archive-entry',{state:'attached'});await page.waitForTimeout(6500);
async function scroll(p){await page.evaluate(async p=>{const el=document.querySelector('#archive-entry');const {getLenis}=await import('/src/lib/lenis.ts');getLenis().scrollTo(el.getBoundingClientRect().top+scrollY+p*(el.offsetHeight-innerHeight),{immediate:true,force:true})},p);}
await scroll(.6);await page.waitForTimeout(500);
const waiting=await page.evaluate(()=>{const e=document.querySelector('#archive-entry');return {ready:e.dataset.sceneReady,copy:getComputedStyle(e.querySelector('.archive-bridge__arrival')).opacity,status:e.querySelector('.archive-bridge__footer').textContent}});assert.equal(waiting.ready,'false');assert.equal(waiting.copy,'1');console.log('SLOW_LOAD',waiting);
release();await page.waitForFunction(()=>document.querySelector('#archive-entry').dataset.sceneReady==='true');console.log('FRAME_READY');
await scroll(1);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#about .about-decrypt')).visibility==='visible'&&!document.querySelector('#archive-entry canvas'));console.log('ABOUT_VISIBLE_AND_CONTEXT_RELEASED');
await scroll(.6);await page.waitForFunction(()=>document.querySelector('#archive-entry').dataset.sceneReady==='true');console.log('REVERSE_REMOUNT_READY');assert.deepEqual(errors,[]);await page.close();
const failed=await browser.newPage({viewport:{width:1440,height:900}});await failed.route(/personal-space\.glb(?:\?t=\d+)?$/,route=>route.abort());await failed.goto(url);await failed.waitForSelector('#archive-entry',{state:'attached'});await failed.waitForTimeout(6500);await failed.evaluate(async()=>{const e=document.querySelector('#archive-entry');(await import('/src/lib/lenis.ts')).getLenis().scrollTo(e.getBoundingClientRect().top+scrollY+.6*(e.offsetHeight-innerHeight),{immediate:true,force:true})});await failed.waitForFunction(()=>document.querySelector('#archive-entry').dataset.failed==='true');assert.equal(await failed.locator('#archive-entry .archive-bridge__arrival').evaluate(e=>getComputedStyle(e).opacity),'1');console.log('FAILED_LOAD_HAS_VISIBLE_READING_LINK');
} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

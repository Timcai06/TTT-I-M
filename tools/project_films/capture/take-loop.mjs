// Take 1 — the whole learning loop on the real EduCanvas with the real model (DeepSeek), recorded
// as one continuous take with a mark at every step for the edit:
//   mode → set up a notebook (grade, goal) → short diagnostic → ask → the real answer streams →
//   open the quiz in Canvas → answer and submit (server grading) → mastery → reload, still there
//
//   node capture/take-loop.mjs            (EduCanvas must be running on 127.0.0.1:3000)
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { signIn } from './account.mjs'
import { Recorder } from './recorder.mjs'

const BASE = 'http://127.0.0.1:3000'
const TAKES = fileURLToPath(new URL('../out/takes/', import.meta.url))
const GOAL = '弄懂 AI 是怎么认出猫和狗的'
const QUESTION = 'AI 是怎么认出一张照片里是猫还是狗的？'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, locale: 'zh-CN' })
const page = await context.newPage()
const rec = new Recorder(page, { dir: TAKES, name: 'loop', scale: 2 })
await rec.prepare()
console.log('account:', await signIn(page, BASE))

/** Click a choice where a person would: on its label if it has one, else on the control. */
async function choose(radio, opts) {
  const label = radio.locator('xpath=ancestor::label[1]')
  await rec.click((await label.count()) ? label : radio, opts)
}

/** The assistant has finished when its text stops growing for a few seconds. */
async function waitForAnswer(minChars = 80) {
  let last = -1
  let still = 0
  for (let i = 0; i < 120; i++) {
    const len = await page.evaluate(() => document.querySelector('main')?.innerText.length ?? 0)
    if (len === last && len > minChars) still++
    else still = 0
    last = len
    if (still >= 6) return
    await page.waitForTimeout(500)
  }
}

await page.goto(`${BASE}/learn`)
await page.waitForTimeout(2500)
await rec.start()
await rec.hold(1200)

// 1 · usage mode (once per browser)
const general = page.getByRole('button', { name: /通用模式/ })
if (await general.isVisible()) {
  rec.mark('mode')
  await rec.click(general, { settle: 1800 })
}

// 2 · the notebook: grade, goal
rec.mark('setup')
await rec.hold(900)
await rec.click(page.getByRole('option', { name: '小学高年级' }), { settle: 1200 })
rec.mark('grade-picked')
await rec.click(page.getByRole('textbox', { name: '这次想学会什么' }), { settle: 300 })
await rec.type(GOAL)
rec.mark('goal-typed')
await rec.hold(700)
await rec.click(page.getByRole('button', { name: '开始', exact: true }), { settle: 2500 })

// 3 · the short diagnostic
rec.mark('diagnostic')
for (let i = 0; i < 8; i++) {
  const group = page.getByRole('group', { name: new RegExp(`^${i + 1}\\. `) })
  if (!(await group.count())) break
  await choose(group.getByRole('radio').first(), { ms: 450, settle: 450 })
  const submit = page.getByRole('button', { name: '提交并进入学习' })
  if (await submit.isVisible() && await submit.isEnabled()) { await rec.click(submit, { settle: 3500 }); break }
  const next = page.getByRole('button', { name: '下一题' })
  if (await next.isVisible()) await rec.click(next, { ms: 400, settle: 500 })
}

// 4 · ask; the real model answers, tailored to the grade
rec.mark('workspace')
await rec.hold(1500)
const composer = page.getByPlaceholder('向 EduCanvas 提问')
await rec.click(composer, { settle: 300 })
await rec.type(QUESTION)
await rec.hold(500)
rec.mark('ask')
await page.keyboard.press('Enter')
await waitForAnswer()
rec.mark('answered')
await rec.hold(1500)
// read the answer the way a student would: scroll slowly through it
await rec.moveTo(960, 560, 500)
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 180); await rec.hold(420) }
rec.mark('read')
await rec.hold(800)

// 5 · the quiz in Canvas; server grading
await rec.click(page.getByRole('button', { name: '本课产物' }), { settle: 1400 })
rec.mark('studio')
const studio = page.getByRole('dialog', { name: '本课产物' })
await rec.click(studio.getByRole('button', { name: /训练样例小测验|互动分类|本课预置/ }).first(), { settle: 2200 })
rec.mark('canvas')
const canvas = page.locator('[aria-label="教学Canvas"]')
const leaks = /correctCategoryId|correctOptionId|gradingKey/.test(await page.content())
console.log('answer fields present in the page before grading:', leaks)
const radios = canvas.getByRole('radio')
const seen = new Set()
const n = await radios.count()
for (let i = 0; i < n; i++) {
  const r = radios.nth(i)
  const g = await r.getAttribute('name')
  if (!g || seen.has(g)) continue
  seen.add(g)
  await choose(r, { ms: 500, settle: 500 })
  const submit = canvas.getByRole('button', { name: '提交本题' }).nth(seen.size - 1)
  if (await submit.count()) {
    await rec.click(submit, { settle: 1600 })
    rec.mark(`graded-${seen.size}`)
  }
}
const submitAll = canvas.getByRole('button', { name: /^提交分类|提交$/ })
if (await submitAll.count()) { await rec.click(submitAll.first(), { settle: 1800 }); rec.mark('graded') }
await rec.hold(1800)

// 6 · mastery
await page.keyboard.press('Escape')
await rec.hold(900)
await rec.click(page.getByRole('button', { name: /学习进度|\d+%/ }).first(), { settle: 2200 })
rec.mark('progress')
await rec.hold(2800)

// 7 · reload: still there
await page.keyboard.press('Escape')
await rec.hold(600)
rec.mark('reload')
await page.reload()
await page.waitForTimeout(3500)
await rec.click(page.getByRole('button', { name: /学习进度|\d+%/ }).first(), { settle: 2000 })
rec.mark('progress-after-reload')
await rec.hold(2500)

await rec.stop()
console.log('progress:', (await page.getByRole('region', { name: '学习进度' }).innerText().catch(() => '-')).replace(/\n+/g, ' / ').slice(0, 300))
await browser.close()

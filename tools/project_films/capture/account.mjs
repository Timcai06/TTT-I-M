// A local recording account for EduCanvas, created once and kept in out/ (git-ignored).
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, '..', 'out', 'educanvas-recording-account.json')

export function recordingAccount({ fresh = false } = {}) {
  if (!fresh && existsSync(FILE)) return JSON.parse(readFileSync(FILE, 'utf8'))
  mkdirSync(path.dirname(FILE), { recursive: true })
  const account = {
    username: `film_${randomBytes(3).toString('hex')}`,
    password: `Film-${randomBytes(9).toString('base64url')}`,
    nickname: '小林',
  }
  writeFileSync(FILE, JSON.stringify(account, null, 2))
  return account
}

/** Register (first time) or log in, inside the page's own origin so the session cookie lands. */
export async function signIn(page, baseURL, { fresh = false } = {}) {
  const account = recordingAccount({ fresh })
  await page.goto(baseURL)
  const result = await page.evaluate(async (a) => {
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    let r = await post('/api/v1/auth/login', { username: a.username, password: a.password })
    if (r.ok) return 'login'
    r = await post('/api/v1/auth/register', { username: a.username, password: a.password, nickname: a.nickname })
    return r.ok ? 'register' : `failed ${r.status} ${await r.text()}`
  }, account)
  return result
}

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const port = Number(process.env.CANVAS_DEV_PORT ?? 5191)

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error(`CANVAS_DEV_PORT must be an integer between 1024 and 65535; received ${port}`)
}

function assertPortAvailable(targetPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => reject(new Error(
      `Canvas preview port ${targetPort} is already in use. Stop that process or set CANVAS_DEV_PORT to another port.`,
    )))
    server.listen({ host: '127.0.0.1', port: targetPort }, () => {
      server.close(resolve)
    })
  })
}

function cachedChromeForTesting() {
  const cacheRoot = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
  if (!fs.existsSync(cacheRoot)) return null

  const candidates = fs.readdirSync(cacheRoot)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort()
    .reverse()
    .map((dir) => path.join(
      cacheRoot,
      dir,
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ))

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

function resolveChrome() {
  const configured = process.env.CANVAS_CHROME_PATH
  if (configured && fs.existsSync(configured)) return configured

  const candidates = process.platform === 'darwin'
    ? [
        cachedChromeForTesting(),
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ]
    : process.platform === 'win32'
      ? [
          path.join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium']

  const executable = candidates.find((candidate) => candidate && fs.existsSync(candidate))
  if (!executable) {
    throw new Error(
      'No compatible Chrome executable was found. Install Playwright Chromium or set CANVAS_CHROME_PATH.',
    )
  }
  return executable
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited with code ${child.exitCode}`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 180))
  }
  throw new Error(`Vite did not become ready at ${url} within 60 seconds`)
}

await assertPortAvailable(port)

const vitePackage = require.resolve('vite/package.json')
const viteEntry = path.join(path.dirname(vitePackage), 'bin', 'vite.js')
const url = `http://127.0.0.1:${port}`
const vite = spawn(process.execPath, [
  viteEntry,
  '--host', '127.0.0.1',
  '--port', String(port),
  '--strictPort',
], { stdio: 'inherit' })

let chrome
let profileDirectory
let cleaningUp = false

async function cleanup(exitCode = 0) {
  if (cleaningUp) return
  cleaningUp = true
  chrome?.kill('SIGTERM')
  vite.kill('SIGTERM')
  if (profileDirectory) {
    try {
      fs.rmSync(profileDirectory, { force: true, recursive: true })
    } catch {
      // Chrome can hold files briefly during shutdown; the OS temp directory
      // remains the safe cleanup boundary.
    }
  }
  process.exitCode = exitCode
}

process.once('SIGINT', () => void cleanup(130))
process.once('SIGTERM', () => void cleanup(143))
vite.once('exit', (code) => void cleanup(code ?? 1))

try {
  await waitForServer(url, vite)
  profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ttt-im-canvas-'))
  const chromeExecutable = resolveChrome()
  console.log(`\nCanvas UI preview: ${url}`)
  console.log(`Chrome: ${chromeExecutable}`)
  console.log('CanvasDrawElement flags: enabled\n')

  chrome = spawn(chromeExecutable, [
    `--user-data-dir=${profileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--enable-features=CanvasDrawElement',
    '--enable-blink-features=CanvasDrawElement',
    url,
  ], { stdio: 'ignore' })
  chrome.once('exit', () => void cleanup(0))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  await cleanup(1)
}

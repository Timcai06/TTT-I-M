import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function findCachedChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  }

  if (process.platform !== 'darwin') return undefined

  const cacheRoot = path.join(os.homedir(), 'Library/Caches/ms-playwright')
  if (!fs.existsSync(cacheRoot)) return undefined

  const chromiumDirs = fs
    .readdirSync(cacheRoot)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort()
    .reverse()

  for (const dir of chromiumDirs) {
    const executable = path.join(
      cacheRoot,
      dir,
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing'
    )

    if (fs.existsSync(executable)) return executable
  }

  return undefined
}

function resolveE2EPort() {
  const rawPort = process.env.PLAYWRIGHT_PORT ?? '4173'
  const port = Number(rawPort)

  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`PLAYWRIGHT_PORT must be an integer between 1024 and 65535; received ${rawPort}`)
  }

  return port
}

const e2ePort = resolveE2EPort()
const e2eBaseURL = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  testDir: './tests/e2e',
  // The per-test timeout has to clear the intro budget with room to spare, or
  // raising the intro budget does nothing: CI showed the loader at 69% after 20s,
  // the intro wait was widened to 90s, and every test still died at 45s with the
  // wider budget unused. Ordering is the whole point - INTRO_TIMEOUT_MS (90s on
  // CI) must stay comfortably under this.
  timeout: process.env.CI ? 150_000 : 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The landing page owns several WebGL surfaces. Letting Playwright default to
  // one worker per CPU core can create more concurrent browser contexts than
  // headless Chromium/GitHub runners can reliably allocate, which shows up as
  // unrelated "Error creating WebGL context" noise and advisory e2e flakes.
  workers: 1,
  // CI keeps an HTML report so a failure arrives as something you can open.
  // trace and screenshot were already retained on failure, but nothing uploaded
  // them, so every CI failure had to be diagnosed by scraping `gh run view --log`.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: e2eBaseURL,
    colorScheme: 'dark',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    // Measured: a full trace of this page is 51 MB, 43 MB of which is captured
    // page resources - the site ships 115 MB of assets. Eleven failures in
    // e2e-gates produced a 1.9 GB artifact.
    //
    // snapshots: false drops the resource and DOM capture and keeps the action
    // log and the screencast frames, which is exactly what was needed to read a
    // CI failure: one frame showed the loader at 69% and settled a week of wrong
    // guesses. DOM time-travel stays available by re-running the spec locally.
    trace: { mode: 'retain-on-failure', snapshots: false, screenshots: true },
  },
  webServer: {
    // PLAYWRIGHT_PORT lets local/agent runs avoid a developer-owned Vite
    // process without killing it or accidentally reusing a stale checkout.
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseURL,
    reuseExistingServer: false,
    timeout: 90_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: findCachedChromiumExecutable(),
          args: [
            '--disable-dev-shm-usage',
            // GitHub runners have no GPU, and headless Chromium will not hand out
            // WebGL2 on a software path unless it is asked to. Without these the
            // room prewarm never settles, `.intro` never clears, and every test in
            // e2e-gates and e2e times out on its first line - red since
            // 2026-09-11, with `verify` green the whole time, which is why local
            // runs looked fine.
            //
            // A runner capability, not product behaviour: CI only, so local and
            // agent runs keep real hardware GL.
            ...(process.env.CI ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
            ...(process.env.HTML_CANVAS_EXPERIMENTAL === '1'
              ? ['--enable-features=CanvasDrawElement', '--enable-blink-features=CanvasDrawElement']
              : []),
          ],
        },
      },
    },
  ],
})

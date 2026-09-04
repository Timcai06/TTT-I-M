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
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The landing page owns several WebGL surfaces. Letting Playwright default to
  // one worker per CPU core can create more concurrent browser contexts than
  // headless Chromium/GitHub runners can reliably allocate, which shows up as
  // unrelated "Error creating WebGL context" noise and advisory e2e flakes.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: e2eBaseURL,
    colorScheme: 'dark',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
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
            ...(process.env.HTML_CANVAS_EXPERIMENTAL === '1'
              ? ['--enable-features=CanvasDrawElement', '--enable-blink-features=CanvasDrawElement']
              : []),
          ],
        },
      },
    },
  ],
})

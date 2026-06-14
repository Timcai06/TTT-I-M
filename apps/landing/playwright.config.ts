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

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The landing page owns several WebGL surfaces. Letting Playwright default to
  // one worker per CPU core can create more concurrent browser contexts than
  // headless Chromium/GitHub runners can reliably allocate, which shows up as
  // unrelated "Error creating WebGL context" noise and advisory e2e flakes.
  workers: process.env.CI ? 2 : 3,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    colorScheme: 'dark',
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: findCachedChromiumExecutable(),
      args: ['--disable-dev-shm-usage'],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 90_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

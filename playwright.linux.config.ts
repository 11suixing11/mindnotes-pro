import { defineConfig } from '@playwright/test'

if (
  process.platform !== 'linux' ||
  process.env.MINDNOTES_LINUX_SUITE !== '1' ||
  process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE !== '1'
)
  throw new Error(
    'Use node benchmark/local/run-linux.mjs --allow-visible on the task-owned X11 display.'
  )

export default defineConfig({
  testDir: './e2e/desktop',
  testMatch: 'linux.spec.ts',
  outputDir: 'tmp/linux-desktop-20261114/native-results',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'tmp/linux-desktop-20261114/native-results.json' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})

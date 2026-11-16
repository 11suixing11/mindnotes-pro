import { defineConfig } from '@playwright/test'

if (process.env.MINDNOTES_BASELINE_ALLOW_VISIBLE !== '1')
  throw new Error(
    'Run node benchmark/local/run-offline.mjs --allow-visible to authorize the visible offline suite.'
  )

export default defineConfig({
  testDir: './e2e/desktop',
  testMatch: 'offline.spec.ts',
  outputDir: 'tmp/local-baseline-20261113/offline-results',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})

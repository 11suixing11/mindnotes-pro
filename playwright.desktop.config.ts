import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/desktop',
  testIgnore: 'linux.spec.ts',
  outputDir: 'test-results/desktop',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})

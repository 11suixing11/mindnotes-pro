#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

/* global window */

const outputPath = process.argv[2] ? resolve(process.argv[2]) : null
const server = await createServer({
  configFile: resolve('vite.config.ts'),
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
    open: false,
  },
})
let browser

try {
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Vite did not expose a TCP port')

  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1_280, height: 800 } })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`http://127.0.0.1:${address.port}/benchmark/browser.html`, {
    waitUntil: 'networkidle',
  })
  await page.waitForFunction(
    () =>
      window.__MINDNOTES_PERFORMANCE_RESULT__ !== undefined ||
      window.__MINDNOTES_PERFORMANCE_ERROR__ !== undefined,
    undefined,
    { timeout: 120_000 }
  )

  const outcome = await page.evaluate(() => ({
    result: window.__MINDNOTES_PERFORMANCE_RESULT__,
    error: window.__MINDNOTES_PERFORMANCE_ERROR__,
  }))
  if (outcome.error) throw new Error(outcome.error)
  if (!outcome.result) throw new Error('Browser benchmark completed without a report')
  if (!outcome.result.temporaryIndexedDbCleanupVerified) {
    throw new Error('Browser benchmark could not verify temporary IndexedDB cleanup')
  }
  if (pageErrors.length > 0) throw new Error(pageErrors.join('\n'))

  const serialized = JSON.stringify(outcome.result, null, 2)
  if (outputPath) {
    await mkdir(resolve(outputPath, '..'), { recursive: true })
    await writeFile(outputPath, `${serialized}\n`, 'utf8')
  }
  process.stdout.write(`${serialized}\n`)
} finally {
  await browser?.close()
  await server.close()
}

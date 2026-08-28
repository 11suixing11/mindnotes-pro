#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { createServer } from 'vite'

const outputPath = process.argv[2] ? resolve(process.argv[2]) : null
const server = await createServer({
  configFile: resolve('vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { runPerformanceBenchmark } = await server.ssrLoadModule(
    '/src/benchmark/performanceBenchmark.ts'
  )
  const reports = runPerformanceBenchmark({ iterations: 3, queryCount: 24 })
  const payload = {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    reports,
    notes: {
      firstRenderMs:
        'Headless render preparation (layer ordering and bounds), not a Canvas paint measurement.',
      pngMs: 'null in headless mode; run the browser export helper in a real browser.',
      pdfMs: 'null in headless mode; run the browser export helper in a real browser.',
    },
  }
  const serialized = JSON.stringify(payload, null, 2)
  if (outputPath) {
    await mkdir(resolve(outputPath, '..'), { recursive: true })
    await writeFile(outputPath, `${serialized}\n`, 'utf8')
  }
  process.stdout.write(`${serialized}\n`)
} finally {
  await server.close()
}

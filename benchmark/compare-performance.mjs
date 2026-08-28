#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { createServer } from 'vite'

const [baselinePath, currentPath, thresholdArgument] = process.argv.slice(2)
if (!baselinePath || !currentPath) {
  process.stderr.write(
    'Usage: npm run benchmark:compare -- <baseline.json> <current.json> [threshold]\n'
  )
  process.exitCode = 2
} else {
  const server = await createServer({
    configFile: resolve(process.cwd(), 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  })

  try {
    const { comparePerformanceReports, PERFORMANCE_REGRESSION_THRESHOLD } =
      await server.ssrLoadModule('/src/benchmark/performanceComparison.ts')
    const threshold = thresholdArgument
      ? Number(thresholdArgument)
      : PERFORMANCE_REGRESSION_THRESHOLD
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
    const current = JSON.parse(await readFile(currentPath, 'utf8'))
    const result = comparePerformanceReports(baseline, current, threshold)
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    if (!result.passed) process.exitCode = 1
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 2
  } finally {
    await server.close()
  }
}

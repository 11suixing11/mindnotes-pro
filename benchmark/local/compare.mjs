import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareReports } from './report.mjs'

async function main(argv) {
  let result
  try {
    if (argv.length < 2 || argv.length > 3) throw new TypeError('Usage: compare.mjs <baseline.json> <current.json> [threshold]')
    const threshold = argv[2] === undefined ? .2 : Number(argv[2])
    if ((argv[2] !== undefined && !argv[2].trim()) || !Number.isFinite(threshold) || threshold < 0)
      throw new TypeError('Regression threshold must be finite and nonnegative.')
    const [baseline, current] = await Promise.all(argv.slice(0, 2).map(async file => JSON.parse(await readFile(file, 'utf8'))))
    result = compareReports(baseline, current, threshold)
  } catch (error) {
    result = { compatible: false, passed: false, reason: error.message, comparisons: [] }
  }
  process.stdout.write(`${JSON.stringify(result, (_key, value) => value === Infinity ? 'Infinity' : value, 2)}\n`)
  process.exitCode = result.compatible ? (result.passed ? 0 : 1) : 2
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))

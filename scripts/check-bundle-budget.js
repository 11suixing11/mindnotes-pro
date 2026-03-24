#!/usr/bin/env node

import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'

const DIST_DIR = './dist'

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  let result = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      result = result.concat(collectFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      result.push(fullPath)
    }
  }

  return result
}

function toKB(bytes) {
  return bytes / 1024
}

if (!existsSync(DIST_DIR)) {
  console.error('dist 目录不存在，请先运行 npm run build')
  process.exit(1)
}

const totalLimitKB = Number(process.env.BUNDLE_TOTAL_KB || 2000)
const tldrawLimitKB = Number(process.env.BUNDLE_TLDRAW_KB || 1150)
const vendorLimitKB = Number(process.env.BUNDLE_VENDOR_KB || 1800)

const files = collectFiles(DIST_DIR).map((file) => {
  const size = statSync(file).size
  return {
    path: relative('.', file).replace(/\\/g, '/'),
    size,
    sizeKB: toKB(size),
  }
})

const totalKB = files.reduce((sum, f) => sum + f.sizeKB, 0)
const tldrawKB = files.filter((f) => f.path.includes('vendor-tldraw')).reduce((sum, f) => sum + f.sizeKB, 0)
const vendorKB = files.filter((f) => /\/vendor(\.|-)/.test(f.path)).reduce((sum, f) => sum + f.sizeKB, 0)

let hasFailure = false

function checkMetric(name, value, limit) {
  const pass = value <= limit
  const status = pass ? 'PASS' : 'FAIL'
  console.log(`${status} ${name}: ${value.toFixed(2)}KB (limit ${limit.toFixed(2)}KB)`)
  if (!pass) {
    hasFailure = true
  }
}

console.log('=== Bundle Budget Check ===')
checkMetric('total-js', totalKB, totalLimitKB)
checkMetric('vendor-tldraw', tldrawKB, tldrawLimitKB)
checkMetric('vendor-group', vendorKB, vendorLimitKB)

if (hasFailure) {
  process.exit(1)
}

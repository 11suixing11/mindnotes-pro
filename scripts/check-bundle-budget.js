#!/usr/bin/env node

/**
 * Bundle 预算检查脚本
 * 确保构建产物不超过预定义的大小预算
 * 
 * 使用方式：
 * node scripts/check-bundle-budget.js
 * 
 * 环境变量：
 * BUNDLE_BUDGET_STRICT=true - 严格模式，超出预算会退出
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BUDGETS = {
  'vendor-react': { max: 150 * 1024, warning: 130 * 1024 }, // 150KB
  'vendor-tldraw': { max: 800 * 1024, warning: 700 * 1024 }, // 800KB
  'vendor-collab': { max: 100 * 1024, warning: 80 * 1024 }, // 100KB
  'vendor-drawing': { max: 50 * 1024, warning: 40 * 1024 }, // 50KB
  'default': { max: 200 * 1024, warning: 150 * 1024 }, // 200KB
}

const DIST_PATH = path.join(__dirname, '..', 'dist', 'assets')

function getFileSize(filePath) {
  const content = fs.readFileSync(filePath)
  const gzipSize = zlib.gzipSync(content).length
  return {
    raw: content.length,
    gzip: gzipSize,
  }
}

function getChunkType(filename) {
  if (filename.includes('vendor-react')) return 'vendor-react'
  if (filename.includes('vendor-tldraw')) return 'vendor-tldraw'
  if (filename.includes('vendor-collab')) return 'vendor-collab'
  if (filename.includes('vendor-drawing')) return 'vendor-drawing'
  return 'default'
}

function checkBudgets() {
  if (!fs.existsSync(DIST_PATH)) {
    console.error('❌ dist/assets 目录不存在，请先运行 build')
    process.exit(1)
  }

  const files = fs.readdirSync(DIST_PATH).filter(f => f.endsWith('.js'))
  
  let hasError = false
  let hasWarning = false

  console.log('📊 Bundle 预算检查\n')
  console.log('文件'.padEnd(50) + '原始大小'.padEnd(15) + 'Gzip 大小'.padEnd(15) + '状态')
  console.log('─'.repeat(90))

  files.forEach(file => {
    const filePath = path.join(DIST_PATH, file)
    const { raw, gzip } = getFileSize(filePath)
    const chunkType = getChunkType(file)
    const budget = BUDGETS[chunkType] || BUDGETS.default

    let status = '✅'
    if (gzip > budget.max) {
      status = '❌'
      hasError = true
    } else if (gzip > budget.warning) {
      status = '⚠️'
      hasWarning = true
    }

    const rawFormatted = (raw / 1024).toFixed(2) + ' KB'
    const gzipFormatted = (gzip / 1024).toFixed(2) + ' KB'

    console.log(
      file.padEnd(50) +
      rawFormatted.padEnd(15) +
      gzipFormatted.padEnd(15) +
      status
    )

    if (status === '❌') {
      const budgetFormatted = (budget.max / 1024).toFixed(2) + ' KB'
      console.log(`  └─ 超出预算！限制：${budgetFormatted}，实际：${gzipFormatted}`)
    } else if (status === '⚠️') {
      const warningFormatted = (budget.warning / 1024).toFixed(2) + ' KB'
      console.log(`  └─ 接近预算上限！警告线：${warningFormatted}`)
    }
  })

  console.log('─'.repeat(90))

  const totalRaw = files.reduce((sum, file) => {
    const filePath = path.join(DIST_PATH, file)
    return sum + getFileSize(filePath).raw
  }, 0)

  const totalGzip = files.reduce((sum, file) => {
    const filePath = path.join(DIST_PATH, file)
    return sum + getFileSize(filePath).gzip
  }, 0)

  console.log(`总计：${(totalRaw / 1024).toFixed(2)} KB (Gzip: ${(totalGzip / 1024).toFixed(2)} KB)`)

  if (hasError) {
    console.log('\n❌ Bundle 预算检查失败！请优化代码分割或减少依赖。')
    if (process.env.BUNDLE_BUDGET_STRICT === 'true') {
      process.exit(1)
    }
  } else if (hasWarning) {
    console.log('\n⚠️  Bundle 预算检查通过，但有警告。')
  } else {
    console.log('\n✅ Bundle 预算检查通过！')
  }
}

checkBudgets()

#!/usr/bin/env node

/**
 * Lighthouse 性能测试脚本
 * 自动启动预览服务器并运行测试
 */

import { execSync, spawn } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const REPORT_DIR = './performance-reports'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')
const REPORT_HTML = join(REPORT_DIR, `lighthouse-${TIMESTAMP}.html`)
const REPORT_JSON = join(REPORT_DIR, `lighthouse-${TIMESTAMP}.json`)
const SUMMARY_FILE = join(REPORT_DIR, `performance-summary-${TIMESTAMP}.md`)

// 确保报告目录存在
if (!existsSync(REPORT_DIR)) {
  mkdirSync(REPORT_DIR, { recursive: true })
}

console.log('🚀 MindNotes Pro Lighthouse 性能测试\n')
console.log('📊 性能目标 (v1.2.0):')
console.log('   Performance: ≥85')
console.log('   Accessibility: ≥90')
console.log('   Best Practices: ≥90')
console.log('   SEO: ≥80')
console.log('')

// 性能目标
const TARGETS = {
  performance: 85,
  accessibility: 90,
  'best-practices': 90,
  seo: 80,
  'first-contentful-paint': 1.8,
  'largest-contentful-paint': 2.5,
  'total-blocking-time': 200,
  'cumulative-layout-shift': 0.1
}

let previewProcess = null

try {
  // 1. 启动预览服务器
  console.log('🌐 启动预览服务器...')
  previewProcess = spawn('npm', ['run', 'preview'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  })

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 5000))
  console.log('✅ 服务器已启动 (http://localhost:4173)\n')

  // 2. 运行 Lighthouse 测试
  console.log('📝 运行 Lighthouse 测试...')
  const testUrl = 'http://localhost:4173'
  
  execSync(
    `lighthouse ${testUrl} ` +
    `--output html --output json ` +
    `--output-path ${REPORT_HTML} ` +
    `--chrome-flags="--headless --no-sandbox" ` +
    `--quiet`,
    { stdio: 'inherit', timeout: 120000 }
  )

  console.log('✅ Lighthouse 测试完成\n')

  // 3. 读取并分析结果
  console.log('📊 分析测试结果...\n')
  const report = JSON.parse(execSync(`cat ${REPORT_JSON}`, { encoding: 'utf-8' }))
  const categories = report.categories
  const audits = report.audits

  // 生成报告
  let summary = `# 📊 Lighthouse 性能测试报告\n\n`
  summary += `**测试时间**: ${new Date().toISOString()}\n`
  summary += `**测试 URL**: ${testUrl}\n`
  summary += `**版本**: v1.2.0-dev\n\n`

  summary += `## 🎯 总体评分\n\n`
  summary += `| 类别 | 得分 | 目标 | 状态 |\n`
  summary += `|------|------|------|------|\n`

  const results = []
  Object.entries(categories).forEach(([key, category]) => {
    const score = Math.round(category.score * 100)
    const target = TARGETS[key] || 80
    const passed = score >= target
    const status = passed ? '✅ 通过' : '❌ 未通过'
    
    summary += `| ${getCategoryName(key)} | **${score}** | ${target} | ${status} |\n`
    
    results.push({
      category: key,
      score,
      target,
      passed
    })
  })

  summary += `\n## 📈 Core Web Vitals\n\n`
  summary += `| 指标 | 数值 | 目标 | 状态 |\n`
  summary += `|------|------|------|------|\n`

  const metrics = [
    { key: 'first-contentful-paint', name: '首次内容绘制 (FCP)', unit: 's' },
    { key: 'largest-contentful-paint', name: '最大内容绘制 (LCP)', unit: 's' },
    { key: 'total-blocking-time', name: '总阻塞时间 (TBT)', unit: 'ms' },
    { key: 'cumulative-layout-shift', name: '累积布局偏移 (CLS)', unit: '' },
    { key: 'speed-index', name: '速度指数 (SI)', unit: 's' },
    { key: 'interactive', name: '可交互时间 (TTI)', unit: 's' }
  ]

  metrics.forEach(({ key, name, unit }) => {
    const audit = audits[key]
    if (audit) {
      const value = audit.numericValue
      const displayValue = audit.displayValue || `${value.toFixed(2)}${unit}`
      const target = TARGETS[key]
      const passed = value <= target
      const status = passed ? '✅' : '❌'
      
      summary += `| ${name} | ${displayValue} | ${target}${unit} | ${status} |\n`
    }
  })

  // 总体评价
  const performanceScore = Math.round(categories.performance.score * 100)
  summary += `\n## 💡 总体评价\n\n`
  
  if (performanceScore >= 90) {
    summary += `🎉 **优秀**! 性能表现非常出色！\n`
  } else if (performanceScore >= 85) {
    summary += `✅ **良好**! 达到 v1.2.0 目标，但还有优化空间。\n`
  } else if (performanceScore >= 70) {
    summary += `⚠️ **需优化**: 未达到目标，建议继续优化。\n`
  } else {
    summary += `❌ **需改进**: 性能较差，需要重点优化。\n`
  }

  // 优化建议
  const opportunities = audits['opportunities']?.details?.items || []
  if (opportunities.length > 0) {
    summary += `\n## 🔧 优化建议\n\n`
    opportunities.slice(0, 5).forEach((item, index) => {
      summary += `${index + 1}. **${item.description}** - 预计节省 ${item.overallSavingsMs || 0}ms\n`
    })
  }

  // 保存摘要
  writeFileSync(SUMMARY_FILE, summary)

  // 输出到控制台
  console.log(summary)
  console.log(`\n📄 完整报告:`)
  console.log(`   HTML: ${REPORT_HTML}`)
  console.log(`   JSON: ${REPORT_JSON}`)
  console.log(`   摘要：${SUMMARY_FILE}\n`)

  // 检查是否通过
  const allPassed = results.every(r => r.passed)
  if (allPassed) {
    console.log('🎉 所有性能测试通过！\n')
  } else {
    console.log('⚠️  部分测试未通过，建议优化\n')
  }

} catch (error) {
  console.error('\n❌ 测试失败:', error.message)
} finally {
  // 清理：停止预览服务器
  if (previewProcess) {
    previewProcess.kill()
    console.log('\n🧹 已停止预览服务器\n')
  }
}

function getCategoryName(key) {
  const names = {
    performance: 'Performance',
    accessibility: 'Accessibility',
    'best-practices': 'Best Practices',
    seo: 'SEO'
  }
  return names[key] || key
}

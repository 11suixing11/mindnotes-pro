#!/usr/bin/env node

/**
 * Bundle 优化分析脚本
 * 分析构建产物，找出可以优化的地方
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const DIST_DIR = './dist'
const REPORT_FILE = './performance-reports/bundle-analysis.md'

console.log('📊 开始分析构建产物...\n')

try {
  // 1. 获取文件大小
  console.log('📦 分析文件...')
  const files = execSync('find dist -type f -name "*.js" -o -name "*.css"', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
  
  const fileSizes = files.map(file => {
    const stats = execSync(`stat -f%z "${file}" 2>/dev/null || stat -c%s "${file}"`, { encoding: 'utf-8' })
    const size = parseInt(stats.trim())
    return {
      path: file,
      size,
      gzipSize: Math.round(size * 0.3) // 估算 gzip 后大小
    }
  }).sort((a, b) => b.size - a.size)

  // 2. 生成报告
  let report = `# 📦 Bundle 分析报告\n\n`
  report += `**生成时间**: ${new Date().toISOString()}\n\n`
  
  report += `## 文件列表\n\n`
  report += `| 文件 | 原始大小 | Gzip 估算 | 占比 |\n`
  report += `|------|----------|----------|------|\n`
  
  const totalSize = fileSizes.reduce((sum, f) => sum + f.size, 0)
  
  fileSizes.forEach(file => {
    const percentage = ((file.size / totalSize) * 100).toFixed(1)
    report += `| ${file.path} | ${(file.size / 1024).toFixed(2)} KB | ${(file.gzipSize / 1024).toFixed(2)} KB | ${percentage}% |\n`
  })
  
  report += `\n**总计**: ${(totalSize / 1024).toFixed(2)} KB (Gzip: ${(fileSizes.reduce((sum, f) => sum + f.gzipSize, 0) / 1024).toFixed(2)} KB)\n\n`
  
  // 3. 优化建议
  report += `## 优化建议\n\n`
  
  const largeFiles = fileSizes.filter(f => f.size > 100 * 1024) // > 100KB
  if (largeFiles.length > 0) {
    report += `### ⚠️ 大文件警告\n\n`
    largeFiles.forEach(file => {
      report += `- **${file.path}**: ${(file.size / 1024).toFixed(2)} KB\n`
    })
    report += `\n`
  }
  
  // 检查 tldraw 相关
  const tldrawFiles = fileSizes.filter(f => f.path.includes('tldraw'))
  if (tldrawFiles.length > 0) {
    const tldrawTotal = tldrawFiles.reduce((sum, f) => sum + f.size, 0)
    report += `### 📐 tldraw 相关\n\n`
    report += `tldraw 相关文件总大小：**${(tldrawTotal / 1024).toFixed(2)} KB**\n\n`
    report += `**优化建议**:\n`
    report += `- [ ] 使用动态导入 (lazy loading)\n`
    report += `- [ ] 按需加载组件\n`
    report += `- [ ] 考虑代码分割\n\n`
  }
  
  // 4. 总体评价
  const avgSize = totalSize / fileSizes.length
  report += `## 总体评价\n\n`
  
  if (totalSize < 500 * 1024) {
    report += `✅ **优秀**: 总大小控制在 500KB 以内\n`
  } else if (totalSize < 1024 * 1024) {
    report += `⚠️ **良好**: 总大小在 1MB 以内，但还有优化空间\n`
  } else {
    report += `❌ **需优化**: 总大小超过 1MB，需要立即优化\n`
  }
  
  // 保存报告
  writeFileSync(REPORT_FILE, report)
  console.log(`✅ 报告已保存到：${REPORT_FILE}\n`)
  console.log(report)
  
} catch (error) {
  console.error('❌ 分析失败:', error.message)
  process.exit(1)
}

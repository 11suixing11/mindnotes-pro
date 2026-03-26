#!/usr/bin/env node

/**
 * 自动化优化建议脚本
 * 扫描代码并生成优化建议报告
 * 
 * 使用方式：
 * node scripts/auto-optimize.js
 */

const fs = require('fs')
const path = require('path')

const SRC_PATH = path.join(__dirname, '..', 'src')
const REPORT_PATH = path.join(__dirname, '..', 'performance-reports', 'optimization-suggestions.md')

// 配置阈值
const THRESHOLDS = {
  maxFileLines: 300,
  maxComponentLines: 200,
  maxFunctionLines: 50,
  maxImportCount: 15,
}

function getAllFiles(dir, ext) {
  let results = []
  const list = fs.readdirSync(dir)

  list.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && file !== 'node_modules') {
      results = results.concat(getAllFiles(filePath, ext))
    } else if (file.endsWith(ext)) {
      results.push(filePath)
    }
  })

  return results
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').length
}

function countImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const importRegex = /^import\s+/gm
  const matches = content.match(importRegex)
  return matches ? matches.length : 0
}

function analyzeFiles() {
  const files = getAllFiles(SRC_PATH, '.tsx')
    .concat(getAllFiles(SRC_PATH, '.ts'))
    .filter(f => !f.includes('.test.') && !f.includes('node_modules'))

  const suggestions = []

  files.forEach(file => {
    const lines = countLines(file)
    const imports = countImports(file)
    const relativePath = path.relative(SRC_PATH, file)

    // 检查文件过大
    if (lines > THRESHOLDS.maxFileLines) {
      suggestions.push({
        file: relativePath,
        issue: '文件过大',
        current: `${lines} 行`,
        target: `< ${THRESHOLDS.maxFileLines} 行`,
        priority: lines > 500 ? '高' : '中',
        suggestion: '考虑拆分为多个小文件',
      })
    }

    // 检查导入过多
    if (imports > THRESHOLDS.maxImportCount) {
      suggestions.push({
        file: relativePath,
        issue: '导入过多',
        current: `${imports} 个导入`,
        target: `< ${THRESHOLDS.maxImportCount} 个`,
        priority: '低',
        suggestion: '考虑使用动态导入或减少依赖',
      })
    }
  })

  return suggestions
}

function generateReport(suggestions) {
  const highPriority = suggestions.filter(s => s.priority === '高')
  const mediumPriority = suggestions.filter(s => s.priority === '中')
  const lowPriority = suggestions.filter(s => s.priority === '低')

  let report = `# 🔍 自动化优化建议报告

**生成时间**: ${new Date().toISOString()}
**扫描路径**: src/
**文件总数**: ${suggestions.length} 个建议

---

## 📊 概览

| 优先级 | 数量 |
|--------|------|
| 🔴 高 | ${highPriority.length} |
| 🟡 中 | ${mediumPriority.length} |
| 🟢 低 | ${lowPriority.length} |

---

## 🔴 高优先级优化

${highPriority.length > 0 ? highPriority.map(s => `### ${s.file}

- **问题**: ${s.issue}
- **当前**: ${s.current}
- **目标**: ${s.target}
- **建议**: ${s.suggestion}

---`
).join('\n') : '✅ 无高优先级优化项'}

## 🟡 中优先级优化

${mediumPriority.length > 0 ? mediumPriority.map(s => `### ${s.file}

- **问题**: ${s.issue}
- **当前**: ${s.current}
- **目标**: ${s.target}
- **建议**: ${s.suggestion}

---`
).join('\n') : '✅ 无中优先级优化项'}

## 🟢 低优先级优化

${lowPriority.length > 0 ? lowPriority.map(s => `- [ ] **${s.file}**: ${s.issue} (${s.current} → ${s.target})`).join('\n') : '✅ 无低优先级优化项'}

---

## 📈 总体评价

${suggestions.length === 0 ? '✅ 代码结构优秀！没有发现需要优化的地方。' : 
suggestions.length < 5 ? '✅ 代码结构良好，只有少量优化建议。' :
suggestions.length < 10 ? '⚠️  代码结构一般，建议优先处理高优先级问题。' :
'❌ 代码结构需要改进，请尽快处理高优先级问题。'}

---

**提示**: 运行 \`npm run lint\` 检查代码规范问题
**提示**: 运行 \`npm run bundle:analyze\` 分析构建产物
**提示**: 运行 \`npm run bundle:budget\` 检查包体积预算
`

  return report
}

function main() {
  console.log('🔍 开始扫描代码...\n')

  const suggestions = analyzeFiles()
  const report = generateReport(suggestions)

  // 确保目录存在
  const reportDir = path.dirname(REPORT_PATH)
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  // 写入报告
  fs.writeFileSync(REPORT_PATH, report)

  console.log(`✅ 扫描完成！发现 ${suggestions.length} 个优化建议`)
  console.log(`📄 报告已保存到：${REPORT_PATH}`)
  console.log(`\n高优先级：${suggestions.filter(s => s.priority === '高').length}`)
  console.log(`中优先级：${suggestions.filter(s => s.priority === '中').length}`)
  console.log(`低优先级：${suggestions.filter(s => s.priority === '低').length}`)
}

main()

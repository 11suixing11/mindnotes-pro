#!/usr/bin/env node

/**
 * MindNotes Pro 性能测试脚本
 * 使用 Lighthouse CLI 进行性能测试
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const REPORT_DIR = './performance-reports';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// 核心 Web 指标目标
const TARGETS = {
  FCP: { name: '首次内容绘制', target: 1.8, unit: 's' },
  LCP: { name: '最大内容绘制', target: 2.5, unit: 's' },
  TBT: { name: '总阻塞时间', target: 200, unit: 'ms' },
  CLS: { name: '累积布局偏移', target: 0.1, unit: '' },
  SI: { name: '速度指数', target: 3.4, unit: 's' },
  TTI: { name: '可交互时间', target: 3.8, unit: 's' },
};

console.log('🚀 MindNotes Pro 性能测试\n');
console.log('📊 性能目标:');
Object.entries(TARGETS).forEach(([key, { name, target, unit }]) => {
  console.log(`   ${name} (${key}): ${target}${unit}`);
});
console.log('');

try {
  // 检查 lighthouse 是否安装
  try {
    execSync('lighthouse --version', { stdio: 'ignore' });
  } catch {
    console.log('⚠️  安装 Lighthouse CLI...');
    execSync('npm install -g lighthouse', { stdio: 'inherit' });
  }

  // 启动本地服务器
  console.log('🌐 启动本地预览服务器...');
  const previewProcess = execSync('npm run preview &', { stdio: 'pipe' });
  
  // 等待服务器启动
  console.log('⏳ 等待服务器启动 (5 秒)...');
  execSync('sleep 5');

  // 运行 Lighthouse 测试
  const testUrl = 'http://localhost:4173';
  const reportPath = join(REPORT_DIR, `lighthouse-${TIMESTAMP}.html`);
  const jsonPath = join(REPORT_DIR, `lighthouse-${TIMESTAMP}.json`);

  console.log(`📝 运行 Lighthouse 测试: ${testUrl}`);
  execSync(
    `lighthouse ${testUrl} ` +
    `--output html --output json ` +
    `--output-path ${reportPath} ` +
    `--chrome-flags="--headless" ` +
    `--quiet`,
    { stdio: 'inherit' }
  );

  // 读取 JSON 报告
  const report = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const metrics = report.audits;

  console.log('\n📊 测试结果:\n');
  console.log('┌─────────────────────────┬──────────┬──────────┬──────────┐');
  console.log('│ 指标                    │ 实际值   │ 目标值   │ 状态     │');
  console.log('├─────────────────────────┼──────────┼──────────┼──────────┤');

  const results = [];
  Object.entries(TARGETS).forEach(([key, { name, target, unit }]) => {
    const audit = metrics[key.toLowerCase()];
    if (audit) {
      const value = audit.numericValue;
      const displayValue = audit.displayValue || `${value.toFixed(2)}${unit}`;
      const passed = value <= target;
      const status = passed ? '✅ 通过' : '❌ 未通过';
      
      console.log(`│ ${name.padEnd(23)} │ ${displayValue.padEnd(8)} │ ${String(target).padEnd(8)} │ ${status.padEnd(8)} │`);
      
      results.push({
        metric: key,
        name,
        value,
        target,
        passed,
        displayValue,
      });
    }
  });

  console.log('└─────────────────────────┴──────────┴──────────┴──────────┘');

  // 计算总体评分
  const performanceScore = report.categories.performance.score * 100;
  console.log(`\n🎯 性能评分: ${performanceScore.toFixed(0)}/100`);

  // 保存测试结果摘要
  const summary = {
    timestamp: new Date().toISOString(),
    version: '1.2.0-dev',
    performanceScore: Math.round(performanceScore),
    results,
    passed: results.filter(r => r.passed).length,
    total: results.length,
  };

  writeFileSync(
    join(REPORT_DIR, `performance-summary-${TIMESTAMP}.json`),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n💾 报告已保存:`);
  console.log(`   HTML: ${reportPath}`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   摘要: ${join(REPORT_DIR, `performance-summary-${TIMESTAMP}.json`)}`);

  // 清理：停止预览服务器
  console.log('\n🧹 清理: 停止预览服务器...');
  execSync('pkill -f "vite preview" || true', { stdio: 'ignore' });

  // 检查是否所有测试通过
  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n✅ 所有性能测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分性能测试未通过，建议优化');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  
  // 清理：停止预览服务器
  try {
    execSync('pkill -f "vite preview" || true', { stdio: 'ignore' });
  } catch {}
  
  process.exit(1);
}

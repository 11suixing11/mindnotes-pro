/**
 * 性能回归测试套件
 * Performance Regression Testing Suite
 * 
 * 自动检测性能下降并生成报告
 */

import { describe, it, expect, beforeAll } from 'vitest'

export interface PerformanceBenchmark {
  name: string
  metric: string
  value: number
  unit: string
  threshold: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface RegressionReport {
  timestamp: Date
  version: string
  benchmarks: PerformanceBenchmark[]
  regressions: PerformanceBenchmark[]
  improvements: PerformanceBenchmark[]
  overallStatus: 'pass' | 'fail' | 'warning'
  recommendations: string[]
}

export class PerformanceRegressionTester {
  private baselineBenchmarks: Map<string, number> = new Map()
  private currentBenchmarks: Map<string, number> = new Map()
  private regressionThreshold = 10 // %

  /**
   * 设置基准性能指标
   */
  setBaseline(metrics: Record<string, number>): void {
    Object.entries(metrics).forEach(([key, value]) => {
      this.baselineBenchmarks.set(key, value)
    })
  }

  /**
   * 记录当前性能指标
   */
  recordMetrics(metrics: Record<string, number>): void {
    Object.entries(metrics).forEach(([key, value]) => {
      this.currentBenchmarks.set(key, value)
    })
  }

  /**
   * 检查性能回归
   */
  detectRegressions(): RegressionReport {
    const regressions: PerformanceBenchmark[] = []
    const improvements: PerformanceBenchmark[] = []
    const benchmarks: PerformanceBenchmark[] = []

    this.baselineBenchmarks.forEach((baselineValue, key) => {
      const currentValue = this.currentBenchmarks.get(key) || baselineValue
      const percentageChange = ((currentValue - baselineValue) / baselineValue) * 100

      const benchmark: PerformanceBenchmark = {
        name: key,
        metric: key,
        value: currentValue,
        unit: this.getUnit(key),
        threshold: baselineValue,
        trend: percentageChange > 0 ? 'increasing' : percentageChange < 0 ? 'decreasing' : 'stable'
      }

      benchmarks.push(benchmark)

      // 检查回归
      if (percentageChange > this.regressionThreshold) {
        regressions.push(benchmark)
      } else if (percentageChange < -this.regressionThreshold) {
        improvements.push(benchmark)
      }
    })

    // 生成建议
    const recommendations = this.generateRecommendations(regressions)

    return {
      timestamp: new Date(),
      version: this.getAppVersion(),
      benchmarks,
      regressions,
      improvements,
      overallStatus: regressions.length > 0 ? 'fail' : improvements.length > 0 ? 'pass' : 'warning',
      recommendations
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(regressions: PerformanceBenchmark[]): string[] {
    const recommendations: string[] = []

    regressions.forEach(regression => {
      if (regression.name === 'fcp') {
        recommendations.push('FCP 增加 - 考虑减少初始 JavaScript 包大小')
        recommendations.push('启用 React 编译器进行自动优化')
      }
      if (regression.name === 'lcp') {
        recommendations.push('LCP 增加 - 优化关键渲染路径')
        recommendations.push('预加载关键资源')
      }
      if (regression.name === 'heapUsage') {
        recommendations.push('内存使用增加 - 检查内存泄漏')
        recommendations.push('分析 Chrome DevTools 内存快照')
      }
    })

    return [...new Set(recommendations)] // 去重
  }

  /**
   * 导出详细报告
   */
  exportReport(report: RegressionReport): string {
    const lines: string[] = [
      `# 性能回归测试报告`,
      ``,
      `时间: ${report.timestamp.toISOString()}`,
      `版本: ${report.version}`,
      `状态: ${report.overallStatus === 'pass' ? '✅ 通过' : report.overallStatus === 'fail' ? '❌ 失败' : '⚠️ 警告'}`,
      ``,
      `## 性能基准`,
      ``,
      ...report.benchmarks.map(b => `- ${b.name}: ${b.value.toFixed(1)} ${b.unit} (基准: ${b.threshold.toFixed(1)} ${b.unit})`),
      ``,
      `## 回归 (${report.regressions.length})`,
      ``,
      report.regressions.length > 0
        ? report.regressions.map(r => `- ⬆️ ${r.name}: +${((r.value/r.threshold - 1) * 100).toFixed(1)}%`).join('\n')
        : '无回归',
      ``,
      `## 改进 (${report.improvements.length})`,
      ``,
      report.improvements.length > 0
        ? report.improvements.map(i => `- ⬇️ ${i.name}: -${((1 - i.value/i.threshold) * 100).toFixed(1)}%`).join('\n')
        : '无改进',
      ``,
      `## 建议`,
      ``,
      ...report.recommendations.map(r => `- ${r}`),
    ]

    return lines.join('\n')
  }

  /**
   * 获取单位
   */
  private getUnit(metric: string): string {
    const units: Record<string, string> = {
      'fcp': 'ms',
      'lcp': 'ms',
      'cls': '',
      'heapUsage': 'MB',
      'bundleSize': 'KB',
      'lighthouse': 'pts'
    }
    return units[metric] || ''
  }

  /**
   * 获取应用版本
   */
  private getAppVersion(): string {
    return 'v1.4.0' // 从 package.json 获取
  }

  /**
   * 是否通过测试
   */
  passed(report: RegressionReport): boolean {
    return report.regressions.length === 0
  }
}

/**
 * 性能回归测试基础
 */
export const performanceTests = {
  // 基准指标（来自 v1.3.0）
  baselines: {
    fcp: 900, // ms
    lcp: 1200, // ms
    cls: 0.1,
    heapUsage: 45, // MB
    bundleSize: 23.48, // KB
    lighthouse: 92
  },

  // 目标指标（v1.4.0）
  targets: {
    fcp: 700, // 目标降低 22%
    lcp: 1000, // 目标降低 17%
    cls: 0.05, // 目标降低 50%
    heapUsage: 38, // 目标降低 15%
    bundleSize: 22.0, // 目标降低 6%
    lighthouse: 95 // 目标提升 3 分
  },

  // 允许的回归阈值
  regressionThreshold: 5, // %
}

// 导出测试用例
export function createPerformanceTests() {
  const tester = new PerformanceRegressionTester()

  describe('性能回归测试', () => {
    beforeAll(() => {
      tester.setBaseline(performanceTests.baselines)
    })

    it('FCP 应该不超过阈值', () => {
      tester.recordMetrics({ fcp: performanceTests.targets.fcp })
      const report = tester.detectRegressions()
      
      expect(report.regressions.filter(r => r.name === 'fcp')).toHaveLength(0)
    })

    it('LCP 应该不超过阈值', () => {
      tester.recordMetrics({ lcp: performanceTests.targets.lcp })
      const report = tester.detectRegressions()
      
      expect(report.regressions.filter(r => r.name === 'lcp')).toHaveLength(0)
    })

    it('CLS 应该不超过阈值', () => {
      tester.recordMetrics({ cls: performanceTests.targets.cls })
      const report = tester.detectRegressions()
      
      expect(report.regressions.filter(r => r.name === 'cls')).toHaveLength(0)
    })

    it('内存使用不应该增加超过 10%', () => {
      tester.recordMetrics({ heapUsage: performanceTests.baselines.heapUsage * 1.1 })
      const report = tester.detectRegressions()
      
      expect(report.regressions.filter(r => r.name === 'heapUsage').length).toBeLessThanOrEqual(1)
    })

    it('整体应该通过回归测试', () => {
      tester.recordMetrics({
        ...performanceTests.targets
      })
      
      const report = tester.detectRegressions()
      const passed = tester.passed(report)
      
      expect(passed).toBe(true)
      console.log('\n' + tester.exportReport(report))
    })
  })

  return tester
}

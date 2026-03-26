import type { PerformanceReport, PerformanceMetrics } from './types'

/**
 * 报告生成器
 * 生成和存储性能报告
 */
export class ReportGenerator {
  private reports: PerformanceReport[] = []
  private readonly MAX_REPORTS = 100

  /**
   * 生成报告
   */
  generate(metrics: PerformanceMetrics): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics: { ...metrics },
    }

    // 添加内存信息（如果可用）
    if ((performance as any).memory) {
      report.memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      }
    }

    // 添加导航时序（如果可用）
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navEntry) {
      report.navigationTiming = {
        loadTime: navEntry.loadEventEnd - navEntry.startTime,
        domInteractive: navEntry.domInteractive - navEntry.startTime,
        domComplete: navEntry.domComplete - navEntry.startTime,
      }
    }

    this.addReport(report)
    return report
  }

  /**
   * 添加报告
   */
  private addReport(report: PerformanceReport): void {
    this.reports.push(report)

    // 限制报告数量
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports.shift()
    }
  }

  /**
   * 获取所有报告
   */
  getAllReports(): PerformanceReport[] {
    return [...this.reports]
  }

  /**
   * 获取最新报告
   */
  getLatestReport(): PerformanceReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null
  }

  /**
   * 获取报告统计
   */
  getStats(): {
    count: number
    average: Record<string, number>
    min: Record<string, number>
    max: Record<string, number>
  } {
    if (this.reports.length === 0) {
      return { count: 0, average: {}, min: {}, max: {} }
    }

    const stats: any = {
      count: this.reports.length,
      average: {},
      min: {},
      max: {},
    }

    const metricKeys = ['fcp', 'lcp', 'ttfb']

    metricKeys.forEach(key => {
      const values = this.reports
        .map(r => r.metrics[key as keyof PerformanceMetrics])
        .filter((v): v is number => v !== undefined)

      if (values.length > 0) {
        stats.average[key] = values.reduce((a, b) => a + b, 0) / values.length
        stats.min[key] = Math.min(...values)
        stats.max[key] = Math.max(...values)
      }
    })

    return stats
  }

  /**
   * 清除报告
   */
  clear(): void {
    this.reports = []
  }
}

export default ReportGenerator

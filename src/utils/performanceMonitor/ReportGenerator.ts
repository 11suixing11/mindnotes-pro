import type { PerformanceReport, PerformanceMetrics } from './types'

/**
 * 报告生成器
 */
export class ReportGenerator {
  private reports: PerformanceReport[] = []
  private readonly MAX_REPORTS = 100

  generate(metrics: PerformanceMetrics): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics: { ...metrics },
    }

    if ((performance as any).memory) {
      report.memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      }
    }

    this.reports.push(report)
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports.shift()
    }

    return report
  }

  getAllReports(): PerformanceReport[] {
    return [...this.reports]
  }

  getLatestReport(): PerformanceReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null
  }

  clear(): void {
    this.reports = []
  }
}

export default ReportGenerator

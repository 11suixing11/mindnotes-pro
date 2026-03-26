import type { PerformanceMetrics, MetricType, PerformanceThresholds } from './types'

/**
 * 指标收集器
 * 收集和存储性能指标
 */
export class MetricCollector {
  private metrics: PerformanceMetrics = {}
  private thresholds: PerformanceThresholds = {
    fcp: 1000,
    lcp: 2500,
    cls: 0.1,
    fid: 100,
    ttfb: 600,
  }

  setMetric(type: MetricType, value: number): void {
    this.metrics[type] = value
  }

  getMetric(type: MetricType): number | undefined {
    return this.metrics[type]
  }

  getAllMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  checkThreshold(type: MetricType, value: number): boolean {
    const threshold = this.thresholds[type]
    return value <= threshold
  }

  getThreshold(type: MetricType): number | undefined {
    return this.thresholds[type]
  }

  clear(): void {
    this.metrics = {}
  }
}

export default MetricCollector

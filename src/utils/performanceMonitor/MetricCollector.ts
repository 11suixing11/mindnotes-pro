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

  /**
   * 设置指标值
   */
  setMetric(type: MetricType, value: number): void {
    this.metrics[type] = value
  }

  /**
   * 获取指标
   */
  getMetric(type: MetricType): number | undefined {
    return this.metrics[type]
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 检查阈值
   */
  checkThreshold(type: MetricType, value: number): boolean {
    const threshold = this.thresholds[type]
    if (threshold === undefined) return true

    // CLS 越小越好，其他指标也是越小越好
    return value <= threshold
  }

  /**
   * 获取阈值
   */
  getThreshold(type: MetricType): number | undefined {
    return this.thresholds[type]
  }

  /**
   * 清除指标
   */
  clear(): void {
    this.metrics = {}
  }
}

export default MetricCollector

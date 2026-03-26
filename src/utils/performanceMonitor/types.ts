// 性能监控器类型定义

export interface PerformanceMetrics {
  fcp?: number
  lcp?: number
  cls?: number
  fid?: number
  ttfb?: number
  customMetrics?: Record<string, number>
}

export interface PerformanceReport {
  timestamp: number
  metrics: PerformanceMetrics
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  navigationTiming?: {
    loadTime: number
    domInteractive: number
    domComplete: number
  }
}

export interface PerformanceThresholds {
  fcp: number
  lcp: number
  cls: number
  fid: number
  ttfb: number
}

export type MetricType = 'fcp' | 'lcp' | 'cls' | 'fid' | 'ttfb'

export interface MetricAlert {
  type: MetricType
  value: number
  threshold: number
  level: 'warning' | 'error'
  timestamp: number
}

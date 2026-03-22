/**
 * 性能监控和基准测试系统
 * 实时收集和分析应用性能指标
 */

interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay
  ttfb?: number // Time to First Byte
  customMetrics?: Record<string, number>
}

interface PerformanceReport {
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

class PerformanceMonitor {
  private reports: PerformanceReport[] = []
  private currentMetrics: PerformanceMetrics = {}
  private reportTimer: number | null = null
  private memoryTimer: number | null = null
  private observers: PerformanceObserver[] = []
  private started = false
  private thresholds = {
    fcp: 1000, // 1 秒
    lcp: 2500, // 2.5 秒
    cls: 0.1,
    fid: 100, // 毫秒
    ttfb: 600, // 毫秒
  }

  private onLoad = () => {
    const metrics = this.getLatestMetrics()
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined

    if (navEntry) {
      metrics.ttfb = navEntry.responseStart
      this.checkThreshold('ttfb', metrics.ttfb)
      return
    }

    if (performance.timing) {
      metrics.ttfb = performance.timing.responseStart - performance.timing.navigationStart
      this.checkThreshold('ttfb', metrics.ttfb)
    }
  }

  /**
   * 初始化性能监控
   */
  init() {
    if (this.started) return

    // 监听 Web Vitals
    this.observeWebVitals()

    // 监听内存使用（如可用）
    this.observeMemory()

    // 定期报告
    this.scheduleReports()

    window.addEventListener('load', this.onLoad)
    this.started = true

    console.log('✅ 性能监控系统已初始化')
  }

  /**
   * 观察 Web Vitals（核心性能指标）
   */
  private observeWebVitals() {
    if (!('PerformanceObserver' in window)) return

    const supported = PerformanceObserver.supportedEntryTypes || []

    if (supported.includes('paint')) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const metrics = this.getLatestMetrics()
            metrics.fcp = entry.startTime
            this.checkThreshold('fcp', metrics.fcp)
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'], buffered: true })
      this.observers.push(paintObserver)
    }

    if (supported.includes('largest-contentful-paint')) {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const metrics = this.getLatestMetrics()
          metrics.lcp = entry.startTime
          this.checkThreshold('lcp', metrics.lcp)
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: true })
      this.observers.push(lcpObserver)
    }

    if (supported.includes('layout-shift')) {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (entry.hadRecentInput) continue

          const metrics = this.getLatestMetrics()
          metrics.cls = (metrics.cls || 0) + (entry.value || 0)
          this.checkThreshold('cls', metrics.cls)
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true })
      this.observers.push(clsObserver)
    }

    if (supported.includes('first-input')) {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { processingStart?: number }>) {
          if (typeof entry.processingStart !== 'number') continue

          const metrics = this.getLatestMetrics()
          metrics.fid = entry.processingStart - entry.startTime
          this.checkThreshold('fid', metrics.fid)
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'], buffered: true })
      this.observers.push(fidObserver)
    }
  }

  /**
   * 观察内存使用情况
   */
  private observeMemory() {
    if ((performance as any).memory) {
      this.memoryTimer = window.setInterval(() => {
        const metrics = this.getLatestMetrics()
        metrics.customMetrics = metrics.customMetrics || {}
        metrics.customMetrics['heapSize'] = (performance as any).memory.usedJSHeapSize

        // 检测内存泄漏（持续增长）
        if (this.detectMemoryLeak()) {
          console.warn('⚠️ 检测到潜在的内存泄漏')
          this.sendAlarm('memory-leak')
        }
      }, 5000)
    }
  }

  /**
   * 定期生成性能报告
   */
  private scheduleReports() {
    this.reportTimer = window.setInterval(() => {
      const report = this.generateReport()
      this.reports.push(report)

      // 日志输出
      console.log('📊 性能报告:', {
        fcp: report.metrics.fcp?.toFixed(2),
        lcp: report.metrics.lcp?.toFixed(2),
        cls: report.metrics.cls?.toFixed(3),
        fid: report.metrics.fid?.toFixed(2),
        ttfb: report.metrics.ttfb?.toFixed(2),
        timestamp: new Date(report.timestamp).toLocaleTimeString(),
      })

      // 发送到分析服务（可选）
      this.sendToAnalytics(report)
    }, 30000) // 30 秒
  }

  /**
   * 检查指标是否超过阈值
   */
  private checkThreshold(metric: keyof typeof this.thresholds, value: number) {
    const threshold = this.thresholds[metric]
    if (value > threshold) {
      const unit = metric === 'cls' ? '' : 'ms'
      console.warn(`⚠️ ${metric.toUpperCase()} 超过阈值: ${value.toFixed(2)}${unit} > ${threshold}${unit}`)
      this.sendAlarm(metric)
    }
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeak(): boolean {
    if (this.reports.length < 3) return false
    
    const latest = this.reports.slice(-3)
    const memSizes = latest.map(r => r.memoryUsage?.usedJSHeapSize || 0)
    
    // 如果连续增长超过 10%，可能存在泄漏
    return memSizes[1] > memSizes[0] * 1.1 && memSizes[2] > memSizes[1] * 1.1
  }

  /**
   * 生成性能报告
   */
  private generateReport(): PerformanceReport {
    const metrics = this.getLatestMetrics()

    return {
      timestamp: Date.now(),
      metrics: {
        ...metrics,
        customMetrics: metrics.customMetrics ? { ...metrics.customMetrics } : undefined,
      },
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : undefined,
      navigationTiming: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
        domComplete: performance.timing.domComplete - performance.timing.navigationStart,
      } : undefined,
    }
  }

  /**
   * 获取最新指标
   */
  private getLatestMetrics(): PerformanceMetrics {
    return this.currentMetrics
  }

  /**
   * 发送告警
   */
  private sendAlarm(type: string) {
    // 实现告警逻辑（日志、通知、数据上报等）
    console.error(`🚨 性能告警: ${type}`)
  }

  /**
   * 发送分析数据
   */
  private sendToAnalytics(report: PerformanceReport) {
    void report
    // TODO: 集成与分析服务（如 Google Analytics, Sentry 等）
    if (import.meta.env.PROD) {
      // 可选：上报到分析平台
      // fetch('/api/analytics/performance', { method: 'POST', body: JSON.stringify(report) })
    }
  }

  /**
   * 获取报告
   */
  getReports() {
    return this.reports
  }

  /**
   * 获取汇总统计
   */
  getSummary() {
    if (this.reports.length === 0) return null

    const fcpValues = this.reports.map(r => r.metrics.fcp).filter(Boolean) as number[]
    const lcpValues = this.reports.map(r => r.metrics.lcp).filter(Boolean) as number[]

    const getSafeMin = (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : 0)
    const getSafeMax = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0)

    return {
      totalReports: this.reports.length,
      fcp: {
        avg: fcpValues.length > 0 ? fcpValues.reduce((a, b) => a + b) / fcpValues.length : 0,
        min: getSafeMin(fcpValues),
        max: getSafeMax(fcpValues),
      },
      lcp: {
        avg: lcpValues.length > 0 ? lcpValues.reduce((a, b) => a + b) / lcpValues.length : 0,
        min: getSafeMin(lcpValues),
        max: getSafeMax(lcpValues),
      },
    }
  }

  /**
   * 重置监控
   */
  reset() {
    this.reports = []
    this.currentMetrics = {}
  }

  /**
   * 释放监控资源
   */
  destroy() {
    if (this.reportTimer !== null) {
      clearInterval(this.reportTimer)
      this.reportTimer = null
    }
    if (this.memoryTimer !== null) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }
    for (const observer of this.observers) {
      observer.disconnect()
    }
    this.observers = []

    window.removeEventListener('load', this.onLoad)
    this.started = false
  }
}

// 全局导出
declare global {
  interface Window {
    __PERF_MONITOR__?: PerformanceMonitor
  }
}

// 在 App 启动时初始化
if (typeof window !== 'undefined') {
  window.__PERF_MONITOR__ = new PerformanceMonitor()
  window.__PERF_MONITOR__.init()
}

export { PerformanceMonitor }
export type { PerformanceMetrics, PerformanceReport }

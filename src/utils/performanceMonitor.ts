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
  private thresholds = {
    fcp: 1000, // 1 秒  
    lcp: 2500, // 2.5 秒
    cls: 0.1,
    fid: 100, // 毫秒
    ttfb: 600 // 毫秒
  }

  /**
   * 初始化性能监控
   */
  init() {
    // 监听 Web Vitals
    this.observeWebVitals()
    
    // 监听内存使用（如可用）
    this.observeMemory()
    
    // 定期报告
    this.scheduleReports()
    
    console.log('✅ 性能监控系统已初始化')
  }

  /**
   * 观察 Web Vitals（核心性能指标）
   */
  private observeWebVitals() {
    // First Contentful Paint & Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            const metrics = this.getLatestMetrics()
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.startTime
              this.checkThreshold('fcp', metrics.fcp)
            }
          }
          if (entry.entryType === 'largest-contentful-paint') {
            const metrics = this.getLatestMetrics()
            metrics.lcp = entry.startTime
            this.checkThreshold('lcp', metrics.lcp)
          }
          if (entry.entryType === 'layout-shift') {
            const metrics = this.getLatestMetrics()
            metrics.cls = (metrics.cls || 0) + entry.value
            this.checkThreshold('cls', metrics.cls)
          }
        }
      })

      perfObserver.observe({
        entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input']
      })
    }

    // 来自 Navigation Timing API
    window.addEventListener('load', () => {
      if (performance.timing) {
        const metrics = this.getLatestMetrics()
        metrics.ttfb = performance.timing.responseStart - performance.timing.navigationStart
        this.checkThreshold('ttfb', metrics.ttfb)
      }
    })
  }

  /**
   * 观察内存使用情况
   */
  private observeMemory() {
    if ((performance as any).memory) {
      setInterval(() => {
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
    setInterval(() => {
      const report = this.generateReport()
      this.reports.push(report)
      
      // 日志输出
      console.log('📊 性能报告:', {
        fcp: report.metrics.fcp?.toFixed(2),
        lcp: report.metrics.lcp?.toFixed(2),
        cls: report.metrics.cls?.toFixed(3),
        timestamp: new Date(report.timestamp).toLocaleTimeString()
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
      console.warn(`⚠️ ${metric.toUpperCase()} 超过阈值: ${value.toFixed(2)}ms > ${threshold}ms`)
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
      metrics,
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : undefined,
      navigationTiming: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
        domComplete: performance.timing.domComplete - performance.timing.navigationStart
      } : undefined
    }
  }

  /**
   * 获取最新指标
   */
  private getLatestMetrics(): PerformanceMetrics {
    return this.reports[this.reports.length - 1]?.metrics || {}
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
    // TODO: 集成与分析服务（如 Google Analytics, Sentry 等）
    if (process.env.NODE_ENV === 'production') {
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

    return {
      totalReports: this.reports.length,
      fcp: {
        avg: fcpValues.length > 0 ? fcpValues.reduce((a, b) => a + b) / fcpValues.length : 0,
        min: Math.min(...fcpValues),
        max: Math.max(...fcpValues)
      },
      lcp: {
        avg: lcpValues.length > 0 ? lcpValues.reduce((a, b) => a + b) / lcpValues.length : 0,
        min: Math.min(...lcpValues),
        max: Math.max(...lcpValues)
      }
    }
  }

  /**
   * 重置监控
   */
  reset() {
    this.reports = []
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

export { PerformanceMonitor, PerformanceMetrics, PerformanceReport }

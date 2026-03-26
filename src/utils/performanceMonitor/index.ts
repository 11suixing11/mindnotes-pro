/**
 * 性能监控器
 */

import { MetricCollector } from './MetricCollector'
import { ReportGenerator } from './ReportGenerator'
import type { PerformanceMetrics, MetricType } from './types'

export class PerformanceMonitor {
  private metricCollector: MetricCollector
  private reportGenerator: ReportGenerator
  private observers: PerformanceObserver[] = []
  private reportTimer: number | null = null
  private memoryTimer: number | null = null
  private started = false

  constructor() {
    this.metricCollector = new MetricCollector()
    this.reportGenerator = new ReportGenerator()
  }

  init(): void {
    if (this.started) return

    this.observeWebVitals()
    this.observeMemory()
    this.scheduleReports()
    window.addEventListener('load', this.handleLoad)
    this.started = true

    console.log('✅ 性能监控系统已初始化')
  }

  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return

    const supported = PerformanceObserver.supportedEntryTypes || []

    if (supported.includes('paint')) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metricCollector.setMetric('fcp', entry.startTime)
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'], buffered: true })
      this.observers.push(paintObserver)
    }

    if (supported.includes('largest-contentful-paint')) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metricCollector.setMetric('lcp', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: true })
      this.observers.push(lcpObserver)
    }

    if (supported.includes('layout-shift')) {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value || 0
          }
        }
        this.metricCollector.setMetric('cls', clsValue)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true })
      this.observers.push(clsObserver)
    }
  }

  private observeMemory(): void {
    this.memoryTimer = window.setInterval(() => {
      const mem = (performance as any).memory
      if (mem) {
        const usage = mem.usedJSHeapSize / mem.jsHeapSizeLimit
        if (usage > 0.8) {
          console.warn('⚠️ 内存使用率过高:', (usage * 100).toFixed(1) + '%')
        }
      }
    }, 5000)
  }

  private scheduleReports(): void {
    this.reportTimer = window.setInterval(() => {
      const metrics = this.metricCollector.getAllMetrics()
      this.reportGenerator.generate(metrics)
    }, 30000)
  }

  private handleLoad = (): void => {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navEntry) {
      this.metricCollector.setMetric('ttfb', navEntry.responseStart)
    }
  }

  getMetrics(): PerformanceMetrics {
    return this.metricCollector.getAllMetrics()
  }

  getReportStats() {
    return this.reportGenerator.getStats()
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []

    if (this.reportTimer !== null) {
      clearInterval(this.reportTimer)
      this.reportTimer = null
    }

    if (this.memoryTimer !== null) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }

    window.removeEventListener('load', this.handleLoad)
    this.started = false
  }
}

export const performanceMonitor = new PerformanceMonitor()
export default performanceMonitor

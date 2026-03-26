import type { PerformanceMetrics, PerformanceAlert } from './types'

/**
 * 性能监控器
 * 收集和分析性能指标
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    longTasks: 0,
    failedRequests: 0,
  }
  private observer: PerformanceObserver | null = null
  private checkInterval: number | null = null

  /**
   * 初始化性能监控
   */
  init(onAlert?: (alert: PerformanceAlert) => void): void {
    this.setupLongTaskObserver(onAlert)
    this.setupPeriodicChecks(onAlert)
  }

  /**
   * 设置长任务观察器
   */
  private setupLongTaskObserver(onAlert?: (alert: PerformanceAlert) => void): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            this.metrics.longTasks++
            
            if (entry.duration > 300 && onAlert) {
              onAlert({
                type: 'warning',
                title: '检测到长任务',
                description: `任务耗时：${entry.duration.toFixed(0)}ms`,
                suggestion: '考虑使用 Web Worker 或代码分割优化',
                timestamp: Date.now(),
              })
            }
          }
        })
      })

      this.observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('长任务观察器初始化失败:', error)
    }
  }

  /**
   * 设置定期检查
   */
  private setupPeriodicChecks(onAlert?: (alert: PerformanceAlert) => void): void {
    this.checkInterval = window.setInterval(() => {
      this.checkMemory(onAlert)
      this.checkPaintMetrics(onAlert)
    }, 5000)
  }

  /**
   * 检查内存使用
   */
  private checkMemory(onAlert?: (alert: PerformanceAlert) => void): void {
    const mem = (performance as any).memory
    if (!mem) return

    const usage = mem.usedJSHeapSize / mem.jsHeapSizeLimit
    this.metrics.memoryUsage = {
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
      limit: mem.jsHeapSizeLimit,
      percentage: usage * 100,
    }

    if (usage > 0.8 && onAlert) {
      onAlert({
        type: 'error',
        title: '内存使用过高',
        description: `Heap 使用率：${(usage * 100).toFixed(1)}%`,
        suggestion: '检查是否有未释放的闭包或事件监听器',
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 检查绘制指标
   */
  private checkPaintMetrics(onAlert?: (alert: PerformanceAlert) => void): void {
    if (!('getEntriesByType' in performance)) return

    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint' && entry.startTime > 1000) {
        this.metrics.fcp = entry.startTime
        
        if (onAlert) {
          onAlert({
            type: 'warning',
            title: 'FCP 超过阈值',
            description: `First Contentful Paint: ${entry.startTime.toFixed(0)}ms`,
            suggestion: '考虑将 React 库迁移到 CDN，减少首屏 JavaScript 大小',
            timestamp: Date.now(),
          })
        }
      }
    })
  }

  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

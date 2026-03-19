import { useEffect, useState } from 'react'

interface PerformanceMonitor {
  fcp: number | null
  lcp: number | null
  fid: number | null
  cls: number | null
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMonitor>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
  })

  useEffect(() => {
    // First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
    if (fcpEntry) {
      setMetrics(prev => ({ ...prev, fcp: fcpEntry.startTime }))
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'first-input') {
          setMetrics(prev => ({ ...prev, fid: entry.startTime }))
        }
      })
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      let clsValue = 0
      entries.forEach(entry => {
        const layoutShift = entry as any
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value || 0
        }
      })
      setMetrics(prev => ({ ...prev, cls: clsValue }))
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return metrics
}

export function reportWebVitals() {
  const fcp = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry | undefined
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const resources = performance.getEntriesByType('resource')

  // 发送到分析服务
  console.log('Web Vitals:', {
    fcp: fcp?.startTime,
    loadTime: navigation?.loadEventEnd,
    domContentLoaded: navigation?.domContentLoadedEventEnd,
    resourceCount: resources.length,
  })

  // 可以发送到监控服务
  // sendToAnalytics(metrics)
}

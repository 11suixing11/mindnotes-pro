/**
 * Real-time Performance Debug View
 * 实时性能调试视图，集成 Web Vitals 和渲染分析
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface PerformanceMetric {
  name: string
  value: number
  target: number
  status: 'good' | 'warning' | 'poor'
  unit: string
}

export function PerformanceDebugView() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const cpuUsage = 0
  const [isLive, setIsLive] = useState(false)
  const isLiveRef = useRef(false)
  const metricsCacheRef = useRef<Map<string, PerformanceMetric>>(new Map())
  const clsValueRef = useRef(0)
  const lastFlushAtRef = useRef(0)
  const flushTimerRef = useRef<number | null>(null)

  const upsertMetric = useCallback((metric: PerformanceMetric) => {
    metricsCacheRef.current.set(metric.name, metric)
  }, [])

  const flushMetrics = useCallback((force = false) => {
    if (!force && !isLiveRef.current) {
      return
    }

    const now = Date.now()
    const elapsed = now - lastFlushAtRef.current

    if (force || elapsed >= 1000) {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }

      setMetrics(Array.from(metricsCacheRef.current.values()))
      lastFlushAtRef.current = now
      return
    }

    if (flushTimerRef.current === null) {
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null
        if (!isLiveRef.current) {
          return
        }
        setMetrics(Array.from(metricsCacheRef.current.values()))
        lastFlushAtRef.current = Date.now()
      }, 1000 - elapsed)
    }
  }, [])

  const collectStaticMetrics = useCallback(() => {
    // FCP (First Contentful Paint)
    const fcpEntries = performance.getEntriesByName('first-contentful-paint')
    if (fcpEntries.length > 0) {
      const fcp = fcpEntries[0].startTime
      upsertMetric({
        name: 'FCP',
        value: fcp,
        target: 700,
        status: fcp < 700 ? 'good' : fcp < 1000 ? 'warning' : 'poor',
        unit: 'ms'
      })
    }

    // 内存使用
    if ((performance as any).memory) {
      const mem = (performance as any).memory
      const usedMB = mem.usedJSHeapSize / 1024 / 1024
      upsertMetric({
        name: 'Heap',
        value: usedMB,
        target: 50,
        status: usedMB < 50 ? 'good' : usedMB < 100 ? 'warning' : 'poor',
        unit: 'MB'
      })
    }
  }, [upsertMetric])

  useEffect(() => {
    isLiveRef.current = isLive
  }, [isLive])

  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      return
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        if (entry.entryType === 'largest-contentful-paint') {
          const lcpEntry = entry as any
          const lcp = lcpEntry.renderTime || lcpEntry.loadTime || entry.startTime
          upsertMetric({
            name: 'LCP',
            value: lcp,
            target: 1000,
            status: lcp < 1000 ? 'good' : lcp < 2500 ? 'warning' : 'poor',
            unit: 'ms'
          })
        }

        if (entry.entryType === 'layout-shift') {
          const layoutShiftEntry = entry as any
          if (!layoutShiftEntry.hadRecentInput) {
            clsValueRef.current += layoutShiftEntry.value
            const cls = parseFloat(clsValueRef.current.toFixed(3))
            upsertMetric({
              name: 'CLS',
              value: cls,
              target: 0.05,
              status: cls < 0.05 ? 'good' : cls < 0.1 ? 'warning' : 'poor',
              unit: ''
            })
          }
        }
      }

      flushMetrics()
    })

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (e) {
      // LCP 不被支持
    }

    try {
      observer.observe({ type: 'layout-shift', buffered: true })
    } catch (e) {
      // CLS 不被支持
    }

    return () => {
      observer.disconnect()
    }
  }, [flushMetrics, upsertMetric])

  useEffect(() => {
    if (!isLive) {
      return
    }

    collectStaticMetrics()
    flushMetrics(true)

    const interval = window.setInterval(() => {
      collectStaticMetrics()
      flushMetrics()
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [collectStaticMetrics, flushMetrics, isLive])

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed top-4 left-4 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 font-mono text-xs z-50">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm">📊 性能调试</h3>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1 rounded text-white text-xs font-bold ${
            isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isLive ? '停止' : '开始'} 监控
        </button>
      </div>

      {/* 指标卡片 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {metrics.length === 0 ? (
          <div className="text-gray-500 text-center py-4">点击 "开始监控" 以查看实时指标</div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.name} className="bg-gray-50 dark:bg-gray-800 p-2 rounded border-l-3" style={{
              borderColor: metric.status === 'good' ? '#10b981' : metric.status === 'warning' ? '#f59e0b' : '#ef4444'
            }}>
              <div className="flex justify-between items-center">
                <span className="font-bold">{metric.name}</span>
                <div>
                  <span className="font-bold text-blue-600">{metric.value.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1">{metric.unit}</span>
                </div>
              </div>
              <div className="w-full h-1 bg-gray-300 rounded mt-1 overflow-hidden">
                <div
                  className={`h-full ${
                    metric.status === 'good'
                      ? 'bg-green-500'
                      : metric.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (metric.value / metric.target) * 100)}%`
                  }}
                />
              </div>
              <div className="text-gray-500 text-xs mt-1">
                目标: {metric.target}{metric.unit}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CPU 使用率 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          CPU 使用率: <span className="font-bold text-red-500">{cpuUsage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export default PerformanceDebugView

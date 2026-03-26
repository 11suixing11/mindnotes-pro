import React from 'react'
import type { PerformanceMetrics } from './types'

interface MetricsDisplayProps {
  metrics: PerformanceMetrics
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics }) => {
  return (
    <div className="metrics-display">
      <h4 className="metrics-title">实时指标</h4>
      
      <div className="metrics-grid">
        {/* FCP */}
        <div className="metric-card">
          <div className="metric-label">FCP</div>
          <div className={`metric-value ${metrics.fcp && metrics.fcp > 1000 ? 'warning' : 'good'}`}>
            {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : '-'}
          </div>
          <div className="metric-target">目标：&lt;1000ms</div>
        </div>

        {/* 长任务 */}
        <div className="metric-card">
          <div className="metric-label">长任务</div>
          <div className={`metric-value ${metrics.longTasks > 5 ? 'warning' : 'good'}`}>
            {metrics.longTasks}
          </div>
          <div className="metric-target">越少越好</div>
        </div>

        {/* 内存使用 */}
        {metrics.memoryUsage && (
          <div className="metric-card">
            <div className="metric-label">内存使用</div>
            <div className={`metric-value ${metrics.memoryUsage.percentage > 80 ? 'error' : metrics.memoryUsage.percentage > 60 ? 'warning' : 'good'}`}>
              {metrics.memoryUsage.percentage.toFixed(1)}%
            </div>
            <div className="metric-target">
              {(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB / {(metrics.memoryUsage.limit / 1024 / 1024).toFixed(0)}MB
            </div>
          </div>
        )}

        {/* 失败请求 */}
        <div className="metric-card">
          <div className="metric-label">失败请求</div>
          <div className={`metric-value ${metrics.failedRequests > 0 ? 'warning' : 'good'}`}>
            {metrics.failedRequests}
          </div>
          <div className="metric-target">目标：0</div>
        </div>
      </div>
    </div>
  )
}

export default MetricsDisplay

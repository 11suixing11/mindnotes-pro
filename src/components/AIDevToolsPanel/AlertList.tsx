import React from 'react'
import type { PerformanceAlert } from './types'

interface AlertListProps {
  alerts: PerformanceAlert[]
  onDismiss: (index: number) => void
}

export const AlertList: React.FC<AlertListProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无警告</p>
        <p className="hint">系统运行正常</p>
      </div>
    )
  }

  return (
    <div className="alert-list">
      {alerts.map((alert, index) => (
        <div
          key={`${alert.timestamp}-${index}`}
          className={`alert alert-${alert.type}`}
        >
          <div className="alert-header">
            <span className="alert-icon">
              {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="alert-title">{alert.title}</span>
            <button
              onClick={() => onDismiss(index)}
              className="alert-dismiss"
              aria-label="关闭警告"
            >
              ×
            </button>
          </div>
          <div className="alert-content">
            <p className="alert-description">{alert.description}</p>
            <p className="alert-suggestion">💡 {alert.suggestion}</p>
          </div>
          <div className="alert-timestamp">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AlertList

import type { ReleaseMonitoring, ReleaseChannelName } from './types'

/**
 * 发布监控服务
 */
export class MonitoringService {
  private monitoring: Map<ReleaseChannelName, ReleaseMonitoring> = new Map()

  register(channel: ReleaseChannelName, metrics: ReleaseMonitoring): void {
    this.monitoring.set(channel, metrics)
  }

  update(channel: ReleaseChannelName, metrics: Partial<ReleaseMonitoring>): void {
    const current = this.monitoring.get(channel)
    if (!current) return

    Object.assign(current, metrics)
  }

  getMetrics(channel: ReleaseChannelName): ReleaseMonitoring | undefined {
    return this.monitoring.get(channel)
  }

  shouldRollback(channel: ReleaseChannelName): { should: boolean; reason?: string } {
    const metrics = this.monitoring.get(channel)
    if (!metrics) return { should: false }

    const { crashRate, errorRate, performanceRegression, rollbackThreshold } = metrics

    if (crashRate >= rollbackThreshold.crashRate) {
      return { should: true, reason: `崩溃率过高：${crashRate}% (阈值：${rollbackThreshold.crashRate}%)` }
    }

    if (errorRate >= rollbackThreshold.errorRate) {
      return { should: true, reason: `错误率过高：${errorRate}% (阈值：${rollbackThreshold.errorRate}%)` }
    }

    if (performanceRegression >= rollbackThreshold.performanceRegression) {
      return { should: true, reason: `性能下降：${performanceRegression}% (阈值：${rollbackThreshold.performanceRegression}%)` }
    }

    return { should: false }
  }

  getAllMetrics(): Map<ReleaseChannelName, ReleaseMonitoring> {
    return new Map(this.monitoring)
  }
}

export default MonitoringService

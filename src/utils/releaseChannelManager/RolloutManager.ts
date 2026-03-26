import type { ReleaseChannelName, RolloutStatus } from './types'

/**
 * 渐进发布管理器
 */
export class RolloutManager {
  private rollouts: Map<string, RolloutStatus> = new Map()

  start(channel: ReleaseChannelName, initialPercentage: number = 1): RolloutStatus {
    const key = channel
    const status: RolloutStatus = {
      channel,
      percentage: initialPercentage,
      status: 'in-progress',
      startedAt: new Date(),
    }

    this.rollouts.set(key, status)
    return status
  }

  updateProgress(channel: ReleaseChannelName, percentage: number): void {
    const status = this.rollouts.get(channel)
    if (!status) return

    status.percentage = percentage
    if (percentage >= 100) {
      status.status = 'completed'
      status.completedAt = new Date()
    }
  }

  pause(channel: ReleaseChannelName): void {
    const status = this.rollouts.get(channel)
    if (status) {
      status.status = 'paused'
    }
  }

  resume(channel: ReleaseChannelName): void {
    const status = this.rollouts.get(channel)
    if (status && status.status === 'paused') {
      status.status = 'in-progress'
    }
  }

  rollback(channel: ReleaseChannelName): void {
    const status = this.rollouts.get(channel)
    if (status) {
      status.status = 'rolled-back'
      status.percentage = 0
    }
  }

  getStatus(channel: ReleaseChannelName): RolloutStatus | undefined {
    return this.rollouts.get(channel)
  }

  getAllStatuses(): RolloutStatus[] {
    return Array.from(this.rollouts.values())
  }

  isRolloutComplete(channel: ReleaseChannelName): boolean {
    const status = this.rollouts.get(channel)
    return status?.status === 'completed' || false
  }
}

export default RolloutManager

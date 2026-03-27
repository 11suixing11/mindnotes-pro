/**
 * 发布渠道管理器
 */

import { VersionTracker } from './VersionTracker'
import { RolloutManager } from './RolloutManager'
import { MonitoringService } from './MonitoringService'
import type { VersionMetadata, ReleaseMonitoring, ReleaseChannelName } from './types'

export class ReleaseChannelManager {
  private versionTracker: VersionTracker
  private rolloutManager: RolloutManager
  private monitoringService: MonitoringService
  private currentVersions: Record<ReleaseChannelName, string>

  constructor() {
    this.versionTracker = new VersionTracker()
    this.rolloutManager = new RolloutManager()
    this.monitoringService = new MonitoringService()
    this.currentVersions = {
      stable: 'v1.4.0',
      beta: 'v1.4.1-beta.1',
      canary: 'v1.4.1-canary.15',
    }
  }

  getCurrentVersion(channel: ReleaseChannelName): string {
    return this.currentVersions[channel]
  }

  updateVersion(channel: ReleaseChannelName, version: string): void {
    this.currentVersions[channel] = version
  }

  registerVersion(metadata: VersionMetadata): void {
    this.versionTracker.register(metadata)
  }

  getVersion(channel: ReleaseChannelName, version: string): VersionMetadata | undefined {
    return this.versionTracker.getVersion(channel, version)
  }

  getLatestVersion(channel: ReleaseChannelName): VersionMetadata | undefined {
    return this.versionTracker.getLatestVersion(channel)
  }

  startRollout(channel: ReleaseChannelName, initialPercentage: number = 1) {
    return this.rolloutManager.start(channel, initialPercentage)
  }

  updateRolloutProgress(channel: ReleaseChannelName, percentage: number) {
    this.rolloutManager.updateProgress(channel, percentage)
  }

  pauseRollout(channel: ReleaseChannelName) {
    this.rolloutManager.pause(channel)
  }

  resumeRollout(channel: ReleaseChannelName) {
    this.rolloutManager.resume(channel)
  }

  rollbackRollout(channel: ReleaseChannelName) {
    this.rolloutManager.rollback(channel)
  }

  getRolloutStatus(channel: ReleaseChannelName) {
    return this.rolloutManager.getStatus(channel)
  }

  registerMonitoring(channel: ReleaseChannelName, metrics: ReleaseMonitoring) {
    this.monitoringService.register(channel, metrics)
  }

  updateMonitoring(channel: ReleaseChannelName, metrics: Partial<ReleaseMonitoring>) {
    this.monitoringService.update(channel, metrics)
  }

  checkRollback(channel: ReleaseChannelName): { should: boolean; reason?: string } {
    return this.monitoringService.shouldRollback(channel)
  }

  getChannelStats() {
    return {
      versions: {
        stable: this.currentVersions.stable,
        beta: this.currentVersions.beta,
        canary: this.currentVersions.canary,
      },
      versionCount: this.versionTracker.getCount(),
      rollouts: this.rolloutManager.getAllStatuses(),
    }
  }
}

export default ReleaseChannelManager

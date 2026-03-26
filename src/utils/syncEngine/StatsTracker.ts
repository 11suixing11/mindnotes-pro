import type { SyncStats } from './types'

/**
 * 同步统计追踪器
 */
export class StatsTracker {
  private stats: SyncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    lastSyncTime: null,
    averageSyncDuration: 0,
  }

  private durations: number[] = []

  recordSync(success: boolean, duration: number): void {
    this.stats.totalSyncs++
    this.stats.lastSyncTime = Date.now()

    if (success) {
      this.stats.successfulSyncs++
    } else {
      this.stats.failedSyncs++
    }

    this.durations.push(duration)
    if (this.durations.length > 100) {
      this.durations.shift()
    }

    this.stats.averageSyncDuration =
      this.durations.reduce((a, b) => a + b, 0) / this.durations.length
  }

  recordConflictResolved(): void {
    this.stats.conflictsResolved++
  }

  getStats(): SyncStats {
    return { ...this.stats }
  }

  reset(): void {
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      lastSyncTime: null,
      averageSyncDuration: 0,
    }
    this.durations = []
  }
}

export default StatsTracker

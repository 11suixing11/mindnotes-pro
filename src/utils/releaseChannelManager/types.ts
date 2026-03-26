// 发布渠道管理器类型定义

export type ReleaseChannelName = 'stable' | 'beta' | 'canary'

export interface ReleaseChannel {
  name: ReleaseChannelName
  version: string
  releaseDate: Date
  userPercentage: number
  features: string[]
  bugFixes: string[]
  knownIssues: string[]
  performanceMetrics: {
    fcp: number
    lcp: number
    cls: number
    bundleSize: number
    lighthouse: number
  }
  rolloutStrategy: 'immediate' | 'gradual' | 'beta-to-stable'
  minDaysBetweenReleases: number
}

export interface ReleaseSchedule {
  stable: {
    cycle: 'bi-weekly'
    dayOfWeek: 'Thursday'
    time: '10:00 UTC'
    rolloutGradual: boolean
    gradualRolloutPercentages: [1, 5, 10, 25, 50, 100]
    rolloutWindowDays: number
  }
  beta: {
    cycle: 'weekly'
    dayOfWeek: 'Wednesday'
    time: '14:00 UTC'
    rolloutGradual: boolean
    userPercentage: number
  }
  canary: {
    cycle: 'daily'
    time: '09:00 UTC'
    rolloutGradual: boolean
    userPercentage: number
  }
}

export interface ReleaseMonitoring {
  crashRate: number
  errorRate: number
  performanceRegression: number
  userSatisfaction: number
  rollbackThreshold: {
    crashRate: number
    errorRate: number
    performanceRegression: number
  }
}

export interface VersionMetadata {
  channel: ReleaseChannelName
  version: string
  buildNumber: number
  commitHash: string
  buildDate: Date
  contributors: string[]
  migrationGuide?: string
}

export interface RolloutStatus {
  channel: ReleaseChannelName
  percentage: number
  status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'rolled-back'
  startedAt?: Date
  completedAt?: Date
}

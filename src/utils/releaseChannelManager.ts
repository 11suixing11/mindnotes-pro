/**
 * 多版本发布策略（Stable, Beta, Canary）
 * Multi-Version Release Strategy for MindNotes Pro v1.4.0+
 * 
 * 版本管理:
 * - Stable (v1.4.0): 2 周发布周期，99.9% 稳定性
 * - Beta (v1.4.0-beta.X): 每周发布，新功能测试
 * - Canary (v1.4.0-canary.X): 每日发布，1% 用户
 */

export interface ReleaseChannel {
  name: 'stable' | 'beta' | 'canary'
  version: string
  releaseDate: Date
  userPercentage: number // 该版本的用户比例
  features: string[]
  bugFixes: string[]
  knownIssues: string[]
  performanceMetrics: {
    fcp: number // First Contentful Paint
    lcp: number // Largest Contentful Paint
    cls: number // Cumulative Layout Shift
    bundleSize: number // KB
    lighthouse: number // 0-100
  }
  rolloutStrategy: 'immediate' | 'gradual' | 'beta-to-stable'
  minDaysBetweenReleases: number
}

export interface ReleaseSchedule {
  stable: {
    cycle: 'bi-weekly' // 2 周一次
    dayOfWeek: 'Thursday' // 周四发布
    time: '10:00 UTC'
    rolloutGradual: true
    gradualRolloutPercentages: [1, 5, 10, 25, 50, 100]
    rolloutWindowDays: 14
  }
  beta: {
    cycle: 'weekly'
    dayOfWeek: 'Wednesday'
    time: '14:00 UTC'
    rolloutGradual: false
    userPercentage: number // 从 Canary 晋升的 10-20% 的积极用户
  }
  canary: {
    cycle: 'daily'
    time: '09:00 UTC'
    rolloutGradual: false
    userPercentage: 1 // 所有用户的 1%
  }
}

export interface ReleaseMonitoring {
  crashRate: number // %
  errorRate: number // %
  performanceRegression: number // %
  userSatisfaction: number // 0-100
  rollbackThreshold: {
    crashRate: 5 // 崩溃率达到 5% 时回滚
    errorRate: 10
    performanceRegression: 20 // 性能下降 20% 以上时回滚
  }
}

export interface VersionMetadata {
  channel: ReleaseChannel['name']
  version: string
  buildNumber: number
  commitHash: string
  buildDate: Date
  contributors: string[]
  migrationGuide?: string
}

export class ReleaseChannelManager {
  private currentVersions = {
    stable: 'v1.4.0',
    beta: 'v1.4.1-beta.1',
    canary: 'v1.4.1-canary.15'
  }

  private releaseSchedule: ReleaseSchedule = {
    stable: {
      cycle: 'bi-weekly',
      dayOfWeek: 'Thursday',
      time: '10:00 UTC',
      rolloutGradual: true,
      gradualRolloutPercentages: [1, 5, 10, 25, 50, 100],
      rolloutWindowDays: 14
    },
    beta: {
      cycle: 'weekly',
      dayOfWeek: 'Wednesday',
      time: '14:00 UTC',
      rolloutGradual: false,
      userPercentage: 15
    },
    canary: {
      cycle: 'daily',
      time: '09:00 UTC',
      rolloutGradual: false,
      userPercentage: 1
    }
  }

  private releaseChannels: Map<string, ReleaseChannel> = new Map([
    ['v1.4.0', {
      name: 'stable',
      version: 'v1.4.0',
      releaseDate: new Date('2024-03-14'),
      userPercentage: 85,
      features: [
        'React Compiler 集成',
        '智能代码分割',
        '增强型 Service Worker',
        'AI 开发者工具'
      ],
      bugFixes: [
        '修复内存泄漏问题',
        '优化组件渲染性能',
        '修复离线模式 bug'
      ],
      knownIssues: [],
      performanceMetrics: {
        fcp: 650,
        lcp: 950,
        cls: 0.04,
        bundleSize: 18.5,
        lighthouse: 95
      },
      rolloutStrategy: 'gradual',
      minDaysBetweenReleases: 14
    }]
  ])

  /**
   * 获取用户版本
   */
  getUserVersion(userId: string): ReleaseChannel['name'] {
    const hash = this.hashUserId(userId)
    const rand = hash % 100

    if (rand < this.releaseSchedule.canary.userPercentage) {
      return 'canary'
    } else if (rand < this.releaseSchedule.canary.userPercentage + this.releaseSchedule.beta.userPercentage) {
      return 'beta'
    }
    return 'stable'
  }

  /**
   * 检查是否应该更新
   */
  shouldUpdate(currentVersion: string, targetChannel: ReleaseChannel['name']): boolean {
    const currentChannelVersion = this.currentVersions[targetChannel]
    
    // 版本号比较（简化版）
    const currentParts = currentVersion.split('.').map(Number)
    const targetParts = currentChannelVersion.split('.').map(Number)

    for (let i = 0; i < Math.min(currentParts.length, targetParts.length); i++) {
      if (targetParts[i] > currentParts[i]) return true
      if (targetParts[i] < currentParts[i]) return false
    }

    return false
  }

  /**
   * 监控版本健康状态
   */
  async monitorVersionHealth(channel: ReleaseChannel['name']): Promise<ReleaseMonitoring> {
    // 模拟从分析后端收集指标
    const monitoring: ReleaseMonitoring = {
      crashRate: Math.random() * 2,
      errorRate: Math.random() * 5,
      performanceRegression: Math.random() * 10,
      userSatisfaction: 80 + Math.random() * 15,
      rollbackThreshold: {
        crashRate: 5,
        errorRate: 10,
        performanceRegression: 20
      }
    }

    // 检查是否需要回滚
    if (
      monitoring.crashRate > monitoring.rollbackThreshold.crashRate ||
      monitoring.errorRate > monitoring.rollbackThreshold.errorRate ||
      monitoring.performanceRegression > monitoring.rollbackThreshold.performanceRegression
    ) {
      console.error(`⚠️ ${channel} 版本健康状态不良，建议回滚`)
      this.triggerRollback(channel)
    }

    return monitoring
  }

  /**
   * 触发版本回滚
   */
  async triggerRollback(channel: ReleaseChannel['name']): Promise<void> {
    console.log(`🔄 回滚 ${channel} 版本...`)
    
    // 向用户推送回滚更新
    const event = new CustomEvent('version-rollback', {
      detail: { channel, reason: 'Health monitoring detected issues' }
    })
    window.dispatchEvent(event)
  }

  /**
   * 金丝雀渐进式发布
   */
  async progressCanaryToRegular(version: string): Promise<void> {
    console.log(`🐦 将 Canary 版本 ${version} 晋升为 Beta...`)
    
    // 更新版本跟踪
    const canaryInfo = this.releaseChannels.get(version)
    if (canaryInfo) {
      canaryInfo.name = 'beta'
      canaryInfo.userPercentage = this.releaseSchedule.beta.userPercentage
    }
  }

  /**
   * Beta 晋升为 Stable
   */
  async promoteBetaToStable(version: string): Promise<void> {
    console.log(`✅ 将 Beta 版本 ${version} 晋升为 Stable...`)
    
    const betaInfo = this.releaseChannels.get(version)
    if (betaInfo) {
      betaInfo.name = 'stable'
      betaInfo.userPercentage = 100
      betaInfo.rolloutStrategy = 'gradual'
      
      // 执行渐进式发布
      await this.executeGradualRollout(version, betaInfo)
    }
  }

  /**
   * 执行渐进式发布
   */
  private async executeGradualRollout(version: string, channel: ReleaseChannel): Promise<void> {
    const percentages = this.releaseSchedule.stable.gradualRolloutPercentages
    
    for (let i = 0; i < percentages.length; i++) {
      const percentage = percentages[i]
      console.log(`📊 Stable ${version}: ${percentage}% 用户现已升级`)
      
      // 等待一天后继续下一个百分比
      await this.delay(24 * 60 * 60 * 1000)
      
      // 收集性能指标
      const health = await this.monitorVersionHealth('stable')
      console.log(`健康检查: 崩溃率 ${health.crashRate.toFixed(2)}%, 错误率 ${health.errorRate.toFixed(2)}%`)
      
      if (health.crashRate > health.rollbackThreshold.crashRate) {
        console.error('⚠️ 崩溃率过高，停止渐进式发布')
        await this.triggerRollback('stable')
        break
      }
    }
    
    console.log(`✅ Stable ${version} 已推送给所有用户`)
  }

  /**
   * 获取发布日程
   */
  getNextReleaseDate(channel: ReleaseChannel['name']): Date {
    const now = new Date()
    const schedule = this.releaseSchedule[channel]
    
    let nextDate = new Date(now)
    
    if (channel === 'stable') {
      // 每 2 周周四 10:00 UTC
      nextDate.setUTCDate(nextDate.getUTCDate() + ((4 - nextDate.getUTCDay() + 7) % 7))
      nextDate.setUTCHours(10, 0, 0, 0)
      
      // 如果时间已过或是同一天但时间更早，则跳到下个周期
      if (nextDate <= now) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 14)
      }
    } else if (channel === 'beta') {
      // 每周三 14:00 UTC
      nextDate.setUTCDate(nextDate.getUTCDate() + ((3 - nextDate.getUTCDay() + 7) % 7))
      nextDate.setUTCHours(14, 0, 0, 0)
      
      if (nextDate <= now) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 7)
      }
    } else {
      // Canary 每天 09:00 UTC
      nextDate.setUTCHours(9, 0, 0, 0)
      if (nextDate <= now) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      }
    }
    
    return nextDate
  }

  /**
   * 生成发布说明
   */
  generateReleaseNotes(version: string): string {
    const channel = this.releaseChannels.get(version)
    if (!channel) return ''

    return `
# MindNotes Pro ${version}

## 🎯 版本类型
${channel.name === 'stable' ? '**稳定版** - 推荐所有用户使用' : channel.name === 'beta' ? '**测试版** - 体验新功能但可能有 bug' : '**金丝雀版** - 最新开发版本，仅 1% 用户被选中'}

## ✨ 新功能
${channel.features.map(f => `- ${f}`).join('\n')}

## 🐛 Bug 修复
${channel.bugFixes.map(b => `- ${b}`).join('\n')}

## ⚠️ 已知问题
${channel.knownIssues.length > 0 ? channel.knownIssues.map(i => `- ${i}`).join('\n') : '- 无'}

## 📊 性能指标
- **FCP**: ${channel.performanceMetrics.fcp}ms (目标: <700ms)
- **LCP**: ${channel.performanceMetrics.lcp}ms (目标: <1000ms)
- **CLS**: ${channel.performanceMetrics.cls} (目标: <0.05)
- **包大小**: ${channel.performanceMetrics.bundleSize}KB
- **Lighthouse**: ${channel.performanceMetrics.lighthouse}/100

## 📅 发布日期
${channel.releaseDate.toLocaleDateString()}

---
**用户群**: ${channel.userPercentage}% 的用户 | **类型**: ${channel.name.toUpperCase()}
    `.trim()
  }

  /**
   * 辅助方法
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 比较版本号
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0)
    const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }
    return 0
  }
}

export const releaseChannelManager = new ReleaseChannelManager()
